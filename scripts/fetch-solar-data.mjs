// Fetch monthly solar yield (kWh) for both plants from iSolarCloud, 2022-2026.
// KIP = Percetakan Tenaga Sdn Bhd (Lot 1238)  ps_id 1162759
// Tago = Percetakan Tenaga Sdn Bhd (Jln Tago) ps_id 1160479
//
// Credentials come from ISOLARCLOUD_ACCOUNT / ISOLARCLOUD_PASSWORD
// (loaded from .env.local if present).
import fs from 'node:fs';

// load .env.local so the script works standalone
for (const line of fs.existsSync('.env.local')
  ? fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
  : []) {
  const mm = line.match(/^([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*)"?$/);
  if (mm && !process.env[mm[1]]) process.env[mm[1]] = mm[2];
}

const ACCOUNT = process.env.ISOLARCLOUD_ACCOUNT;
const PASSWORD = process.env.ISOLARCLOUD_PASSWORD;
if (!ACCOUNT || !PASSWORD) {
  console.error('Set ISOLARCLOUD_ACCOUNT and ISOLARCLOUD_PASSWORD (e.g. in .env.local)');
  process.exit(1);
}

const APPKEY = '5FD913AA74124F88B98E3705E9D29AEF';
const GATEWAY = 'https://gateway.isolarcloud.com.hk';
const PLANTS = [
  { key: 'KIP', psId: '1162759', name: 'Percetakan Tenaga Sdn Bhd (Lot 1238)' },
  { key: 'Tago', psId: '1160479', name: 'Percetakan Tenaga Sdn Bhd (Jln Tago)' },
];
const YEARS = [2022, 2023, 2024, 2025, 2026];
const MONTH_REPORT_ID = '29000009'; // 电站报表, time dimension = year (12 monthly rows)

const headers = {
  'Content-Type': 'application/json;charset=UTF-8',
  'User-Agent': 'Mozilla/5.0',
  sys_code: '200', _pl: 'js',
  _did: 'web' + Math.random().toString(36).slice(2, 12),
};

async function call(path, data) {
  const res = await fetch(GATEWAY + path, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(40000),
  });
  return res.json();
}

(async () => {
  const login = await call('/v1/userService/login', {
    user_account: ACCOUNT,
    user_password: PASSWORD,
    user_type: 1,
    sys_code: '200',
    appkey: APPKEY,
  });
  if (login.result_code !== '1') {
    console.error('login failed:', JSON.stringify(login));
    process.exit(1);
  }
  const token = login.result_data.token;
  console.log('login ok, user', login.result_data.user_id);

  const records = [];
  const plantMeta = {};

  for (const plant of PLANTS) {
    plantMeta[plant.key] = { name: plant.name, ps_id: plant.psId };

    for (const year of YEARS) {
      const body = {
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
      };

      let rows = [];
      try {
        const r = await call('/v1/reportService/v2/getPowerStationReport', body);
        if (r.result_code !== '1') {
          console.log(`${plant.key} ${year}: report error ${r.result_msg}`);
          continue;
        }
        rows = r.result_data?.data ?? [];
      } catch (e) {
        console.log(`${plant.key} ${year}: ERR ${e.cause ? e.cause.code : e.message}`);
        continue;
      }

      for (const row of rows) {
        const ts = String(row.time_stamp ?? '');
        const yearMatch = ts.match(/^(\d{4})/);
        const monthMatch = ts.match(/(\d{2})$/);
        if (!yearMatch || !monthMatch) continue;

        const rowYear = Number(yearMatch[1]);
        const rowMonth = Number(monthMatch[1]);

        // 月发电量 (monthly yield) — point 83022, point_ratio 1000 -> kWh
        const raw = row.p83022;
        const value =
          typeof raw === 'string' || typeof raw === 'number'
            ? Number(raw) / 1000
            : null;

        if (value === null || !Number.isFinite(value) || value <= 0) continue;

        records.push({
          location: plant.key,
          year: rowYear,
          month: rowMonth,
          quantity_kwh: value,
        });
      }

      console.log(
        `${plant.key} ${year}: ${rows.length} rows -> ${records.filter((r) => r.location === plant.key && r.year === year).length} usable`
      );
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  const out = { fetched_at: new Date().toISOString(), plants: plantMeta, records };
  fs.writeFileSync('scripts/solar-data.json', JSON.stringify(out, null, 2));
  console.log(`\nsaved ${records.length} records -> scripts/solar-data.json`);
})();
