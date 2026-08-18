import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const year = Number(searchParams.get('year') || 2026);

    const result = await db.query(
      `
      SELECT
        p.slug,
        p.name,
        p.scope,
        p.input_unit,
        ef.factor,
        ef.factor_unit,
        a.month,
        l.name AS location,
        a.quantity
      FROM activity_data a
      JOIN parameters p
        ON p.id = a.parameter_id
      JOIN locations l
        ON l.id = a.location_id
      LEFT JOIN emission_factors ef
        ON ef.parameter_id = p.id
       AND ef.year = a.year
      WHERE a.year = $1
      ORDER BY p.scope, p.slug, l.name, a.month
      `,
      [year]
    );

    const parameters = new Map<string, any>();

    for (const row of result.rows) {
      const key = `${row.slug}:${row.location}`;

      if (!parameters.has(key)) {
        parameters.set(key, {
          slug: row.slug,
          name: row.name,
          scope: row.scope,
          input_unit: row.input_unit,
          factor: row.factor ? Number(row.factor) : null,
          factor_unit: row.factor_unit,
          location: row.location,
          monthly: Array(12).fill(null),
        });
      }

      parameters.get(key).monthly[row.month - 1] =
        Number(row.quantity);
    }

    const items = Array.from(parameters.values());

    const monthly = Array.from({ length: 12 }, (_, index) => {
      let scope1 = 0;
      let scope2 = 0;

      for (const item of items) {
        const quantity = item.monthly[index];

        if (quantity === null || item.factor === null) {
          continue;
        }

        const emission = (quantity * item.factor) / 1000;

        if (item.scope === 'Scope 1') {
          scope1 += emission;
        } else if (item.scope === 'Scope 2') {
          scope2 += emission;
        }
      }

      return {
        month: index + 1,
        scope1,
        scope2,
        total: scope1 + scope2,
      };
    });

    const scope1 = items.filter(
      (item) => item.scope === 'Scope 1'
    );

    const scope2 = items.filter(
      (item) => item.scope === 'Scope 2'
    );

    const sumEmission = (items: any[]) =>
      items.reduce((total, item) => {
        return (
          total +
          item.monthly.reduce((sum: number, quantity: number | null) => {
            if (quantity === null || item.factor === null) {
              return sum;
            }

            return sum + (quantity * item.factor) / 1000;
          }, 0)
        );
      }, 0);

    return NextResponse.json({
      success: true,
      year,
      scope1: {
        total: sumEmission(scope1),
        parameters: scope1,
      },
      scope2: {
        total: sumEmission(scope2),
        parameters: scope2,
      },
      total: sumEmission(items),
      monthly,
    });
  } catch (error) {
    console.error('Dashboard API failed:', error);

    return NextResponse.json(
      { error: 'Failed to load dashboard data' },
      { status: 500 }
    );
  }
}
