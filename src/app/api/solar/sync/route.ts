import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/*
 * iSolarCloud sync for the Solar (Scope 2) parameter.
 *
 * Logs into the iSolarCloud portal with server-side credentials,
 * pulls the monthly yield (kWh) for the KIP and Tago plants,
 * and upserts it into activity_data.
 */

const APPKEY = '5FD913AA74124F88B98E3705E9D29AEF';
const GATEWAY = 'https://gateway.isolarcloud.com.hk';
const MONTH_REPORT_ID = '29000009'; // 电站报表, time dimension = year (12 monthly rows)
const YEARS = [2022, 2023, 2024, 2025, 2026];

const PLANTS = [
  { key: 'KIP', psId: '1162759', name: 'Percetakan Tenaga Sdn Bhd (Lot 1238)' },
  { key: 'Tago', psId: '1160479', name: 'Percetakan Tenaga Sdn Bhd (Jln Tago)' },
];

const FACTOR = 0;
const FACTOR_UNIT = 'kgCO2e/kWh';
const FACTOR_SOURCE = 'iSolarCloud — renewable generation';

async function call(path: string, data: Record<string, unknown>) {
  const res = await fetch(GATEWAY + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'User-Agent': 'Mozilla/5.0',
      sys_code: '200',
      _pl: 'js',
      _did: 'web' + Math.random().toString(36).slice(2, 12),
    },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(40000),
  });

  return res.json() as Promise<{
    result_code?: string;
    result_msg?: string;
    result_data?: any;
  }>;
}

type SyncRecord = {
  location: string;
  year: number;
  month: number;
  quantity_kwh: number;
};

export async function POST(request: NextRequest) {
  const account = process.env.ISOLARCLOUD_ACCOUNT;
  const password = process.env.ISOLARCLOUD_PASSWORD;

  if (!account || !password) {
    return NextResponse.json(
      {
        error:
          'iSolarCloud credentials not configured (ISOLARCLOUD_ACCOUNT / ISOLARCLOUD_PASSWORD)',
      },
      { status: 500 }
    );
  }

  try {
    /*
     * 1. Login
     */
    const login = await call('/v1/userService/login', {
      user_account: account,
      user_password: password,
      user_type: 1,
      sys_code: '200',
      appkey: APPKEY,
    });

    if (login.result_code !== '1' || !login.result_data?.token) {
      return NextResponse.json(
        { error: `iSolarCloud login failed: ${login.result_msg ?? 'unknown error'}` },
        { status: 502 }
      );
    }

    const token = login.result_data.token as string;

    /*
     * 2. Fetch monthly yield per plant / year
     */
    const records: SyncRecord[] = [];
    const errors: { location: string; year: number; message: string }[] = [];

    for (const plant of PLANTS) {
      for (const year of YEARS) {
        try {
          const report = await call('/v1/reportService/v2/getPowerStationReport', {
            period: '2',
            start_time: `${year}01`,
            end_time: `${year}12`,
            ps_id_list: plant.psId,
            report_id: MONTH_REPORT_ID,
            filter_flag: 1,
            column: '0,1,2,3,4',
            cur_page: 1,
            page_size: 60,
            sys_code: '200',
            appkey: APPKEY,
            token,
            lang: '',
          });

          if (report.result_code !== '1') {
            errors.push({ location: plant.key, year, message: report.result_msg ?? 'report failed' });
            continue;
          }

          const rows: any[] = report.result_data?.data ?? [];

          for (const row of rows) {
            const ts = String(row.time_stamp ?? '');
            const yearMatch = ts.match(/^(\d{4})/);
            const monthMatch = ts.match(/(\d{2})$/);

            if (!yearMatch || !monthMatch) continue;

            const raw = row.p83022; // 月发电量 (monthly yield), point_ratio 1000 -> kWh
            const value =
              typeof raw === 'string' || typeof raw === 'number'
                ? Number(raw) / 1000
                : null;

            if (value === null || !Number.isFinite(value) || value <= 0) continue;

            records.push({
              location: plant.key,
              year: Number(yearMatch[1]),
              month: Number(monthMatch[1]),
              quantity_kwh: value,
            });
          }
        } catch (error) {
          errors.push({
            location: plant.key,
            year,
            message: error instanceof Error ? error.message : 'fetch failed',
          });
        }
      }
    }

    /*
     * 3. Upsert into Neon
     */
    let parameterId: string | null = null;
    let upserted = 0;

    await db.query('BEGIN');

    try {
      const param = await db.query('SELECT id FROM parameters WHERE slug = $1', ['solar']);

      if (param.rowCount === 0) {
        const ins = await db.query(
          `INSERT INTO parameters (scope, slug, name, input_unit, active)
           VALUES ('Scope 2', 'solar', 'Solar', 'kWh', true)
           RETURNING id`
        );
        parameterId = ins.rows[0].id;
      } else {
        parameterId = param.rows[0].id;
      }

      for (const year of YEARS) {
        await db.query(
          `INSERT INTO emission_factors (parameter_id, year, factor, factor_unit, source)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (parameter_id, year)
           DO UPDATE SET factor = EXCLUDED.factor, factor_unit = EXCLUDED.factor_unit, source = EXCLUDED.source`,
          [parameterId, year, FACTOR, FACTOR_UNIT, FACTOR_SOURCE]
        );
      }

      const locations = await db.query('SELECT id, name FROM locations');
      const locationIds = new Map<string, string>();
      for (const row of locations.rows) locationIds.set(row.name, row.id as string);

      for (const record of records) {
        const locationId = locationIds.get(record.location);
        if (!locationId) continue;

        const result = await db.query(
          `INSERT INTO activity_data (parameter_id, location_id, year, month, quantity, notes)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (parameter_id, location_id, year, month)
           DO UPDATE SET quantity = EXCLUDED.quantity, notes = EXCLUDED.notes, updated_at = NOW()`,
          [
            parameterId,
            locationId,
            record.year,
            record.month,
            record.quantity_kwh,
            'Solar yield (iSolarCloud)',
          ]
        );

        upserted += result.rowCount ?? 0;
      }

      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

    /*
     * 4. Summary
     */
    const summary = await db.query(
      `SELECT l.name AS location, a.year, ROUND(SUM(a.quantity)::numeric, 1) AS total_kwh
       FROM activity_data a
       JOIN parameters p ON p.id = a.parameter_id
       JOIN locations l ON l.id = a.location_id
       WHERE p.slug = 'solar'
       GROUP BY l.name, a.year
       ORDER BY l.name, a.year`
    );

    return NextResponse.json({
      success: true,
      synced_at: new Date().toISOString(),
      records_fetched: records.length,
      records_upserted: upserted,
      errors,
      plants: PLANTS.map((p) => ({ key: p.key, name: p.name, ps_id: p.psId })),
      summary: summary.rows,
    });
  } catch (error) {
    console.error('Solar sync failed:', error);
    return NextResponse.json(
      { error: 'Solar sync failed: ' + (error instanceof Error ? error.message : 'unknown error') },
      { status: 500 }
    );
  }
}
