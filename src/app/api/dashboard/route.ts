import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const YEARS = [2022, 2023, 2024, 2025, 2026];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const selectedYear = Number(searchParams.get('year') || 2026);

    const result = await db.query(
      `
      SELECT
        a.year,
        a.month,
        p.slug,
        p.name,
        p.scope,
        p.input_unit,
        ef.factor,
        ef.factor_unit,
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
      WHERE a.year = ANY($1::integer[])
      ORDER BY a.year, p.scope, p.slug, l.name, a.month
      `,
      [YEARS]
    );

    /*
     * ------------------------------------------------------------
     * Group activity data
     * ------------------------------------------------------------
     *
     * Key:
     * year + parameter + location
     */
    const grouped = new Map<string, any>();

    for (const row of result.rows) {
      const key = `${row.year}:${row.slug}:${row.location}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          year: Number(row.year),
          slug: row.slug,
          name: row.name,
          scope: row.scope,
          input_unit: row.input_unit,
          factor: row.factor !== null ? Number(row.factor) : null,
          factor_unit: row.factor_unit,
          location: row.location,
          monthly: Array(12).fill(null),
        });
      }

      grouped.get(key).monthly[Number(row.month) - 1] =
        Number(row.quantity);
    }

    const items = Array.from(grouped.values());

    /*
     * ------------------------------------------------------------
     * Calculate emissions
     * ------------------------------------------------------------
     */
    const calculateEmission = (
      quantity: number | null,
      factor: number | null
    ) => {
      if (quantity === null || factor === null) {
        return null;
      }

      return (quantity * factor) / 1000;
    };

    /*
     * ------------------------------------------------------------
     * Build yearly data
     * ------------------------------------------------------------
     */
    const yearly = YEARS.map((year) => {
      const yearItems = items.filter(
        (item) => item.year === year
      );

      let scope1 = 0;
      let scope2 = 0;

      for (const item of yearItems) {
        for (const quantity of item.monthly) {
          const emission = calculateEmission(
            quantity,
            item.factor
          );

          if (emission === null) {
            continue;
          }

          if (item.scope === 'Scope 1') {
            scope1 += emission;
          } else if (item.scope === 'Scope 2') {
            scope2 += emission;
          }
        }
      }

      return {
        year,
        scope1,
        scope2,
        total: scope1 + scope2,
      };
    });

    /*
     * ------------------------------------------------------------
     * Monthly Scope 1 / Scope 2 graphs
     * ------------------------------------------------------------
     */
    const monthlyByYear = YEARS.map((year) => {
      const yearItems = items.filter(
        (item) => item.year === year
      );

      const monthly = Array.from(
        { length: 12 },
        (_, index) => {
          let scope1 = 0;
          let scope2 = 0;

          let hasScope1Data = false;
          let hasScope2Data = false;

          for (const item of yearItems) {
            const quantity = item.monthly[index];

            if (quantity === null || item.factor === null) {
              continue;
            }

            const emission = calculateEmission(
              quantity,
              item.factor
            );

            if (emission === null) {
              continue;
            }

            if (item.scope === 'Scope 1') {
              scope1 += emission;
              hasScope1Data = true;
            } else if (item.scope === 'Scope 2') {
              scope2 += emission;
              hasScope2Data = true;
            }
          }

          return {
            month: index + 1,
            scope1: hasScope1Data ? scope1 : null,
            scope2: hasScope2Data ? scope2 : null,
            total:
              hasScope1Data || hasScope2Data
                ? scope1 + scope2
                : null,
          };
        }
      );

      return {
        year,
        monthly,
      };
    });

    /*
     * ------------------------------------------------------------
     * Selected year details
     * ------------------------------------------------------------
     */
    const selectedItems = items.filter(
      (item) => item.year === selectedYear
    );

    const scope1Items = selectedItems.filter(
      (item) => item.scope === 'Scope 1'
    );

    const scope2Items = selectedItems.filter(
      (item) => item.scope === 'Scope 2'
    );

    const sumEmission = (sourceItems: any[]) =>
      sourceItems.reduce((total, item) => {
        return (
          total +
          item.monthly.reduce(
            (sum: number, quantity: number | null) => {
              const emission = calculateEmission(
                quantity,
                item.factor
              );

              return sum + (emission ?? 0);
            },
            0
          )
        );
      }, 0);

    const selectedMonthly =
      monthlyByYear.find(
        (item) => item.year === selectedYear
      )?.monthly ??
      Array.from({ length: 12 }, (_, index) => ({
        month: index + 1,
        scope1: 0,
        scope2: 0,
        total: 0,
      }));

    /*
     * ------------------------------------------------------------
     * Performance data
     * ------------------------------------------------------------
     *
     * Aggregated by parameter.
     */
    const performanceMap = new Map<string, any>();

    for (const item of selectedItems) {
      const key = item.slug;

      if (!performanceMap.has(key)) {
        performanceMap.set(key, {
          slug: item.slug,
          name: item.name,
          scope: item.scope,
          input_unit: item.input_unit,
          factor: item.factor,
          factor_unit: item.factor_unit,
          quantity: 0,
          emissions: 0,
        });
      }

      const performance = performanceMap.get(key);

      for (const quantity of item.monthly) {
        if (quantity !== null) {
          performance.quantity += quantity;
        }

        const emission = calculateEmission(
          quantity,
          item.factor
        );

        if (emission !== null) {
          performance.emissions += emission;
        }
      }
    }

    const performance = Array.from(
      performanceMap.values()
    );

    /*
     * ------------------------------------------------------------
     * Selected year totals
     * ------------------------------------------------------------
     */
    const selectedYearly = yearly.find(
      (item) => item.year === selectedYear
    )!;

    /*
     * ------------------------------------------------------------
     * Response
     * ------------------------------------------------------------
     */
    return NextResponse.json({
      success: true,

      year: selectedYear,

      years: YEARS,

      scope1: {
        total: sumEmission(scope1Items),
        parameters: scope1Items,
      },

      scope2: {
        total: sumEmission(scope2Items),
        parameters: scope2Items,
      },

      total: selectedYearly.total,

      monthly: selectedMonthly,

      /*
       * Excel-style graph data
       */
      graphs: {
        scope1: monthlyByYear.map((item) => ({
          year: item.year,
          values: item.monthly.map(
            (month) => month.scope1
          ),
        })),

        scope2: monthlyByYear.map((item) => ({
          year: item.year,
          values: item.monthly.map(
            (month) => month.scope2
          ),
        })),

        trends: yearly.map((item) => ({
          year: item.year,
          scope1: item.scope1,
          scope2: item.scope2,
          total: item.total,
        })),
      },

      /*
       * Performance Data
       */
      performance,

      /*
       * Full yearly totals
       */
      yearly,
    });
  } catch (error) {
    console.error('Dashboard API failed:', error);

    return NextResponse.json(
      {
        error: 'Failed to load dashboard data',
      },
      {
        status: 500,
      }
    );
  }
}