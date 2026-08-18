'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LineChart } from '@/components/line-chart';
import { months, parameters } from '@/lib/ghg';

type GraphSeries = {
  year: number;
  values: (number | null)[];
};

type TrendRow = {
  year: number;
  scope1: number;
  scope2: number;
  total: number;
};

type PerformanceRow = {
  slug: string;
  name: string;
  scope: string;
  input_unit: string;
  factor: number;
  factor_unit: string;
  quantity: number;
  emissions: number;
};

type DashboardData = {
  success: boolean;
  year: number;
  scope1: {
    total: number;
    parameters: any[];
  };
  scope2: {
    total: number;
    parameters: any[];
  };
  total: number;

  graphs: {
    scope1: GraphSeries[];
    scope2: GraphSeries[];
    trends: TrendRow[];
  };

  performance: PerformanceRow[];
};

export default function Dashboard() {
  const [year, setYear] = useState(2026);
  const [data, setData] =
    useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);

      try {
        const response = await fetch(
          `/api/dashboard?year=${year}`,
          { cache: 'no-store' }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              'Failed to load dashboard'
          );
        }

        setData(result);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [year]);

  /*
   * ------------------------------------------------------------
   * Graph series
   * ------------------------------------------------------------
   */

  const scope1Series =
    data?.graphs.scope1.map((item) => ({
      label: String(item.year),
      values: item.values,
    })) ?? [];

  const scope2Series =
    data?.graphs.scope2.map((item) => ({
      label: String(item.year),
      values: item.values,
    })) ?? [];

  /*
   * ------------------------------------------------------------
   * Performance data
   * ------------------------------------------------------------
   */

  const scope1Performance =
    data?.performance.filter(
      (item) => item.scope === 'Scope 1'
    ) ?? [];

  const scope2Performance =
    data?.performance.filter(
      (item) => item.scope === 'Scope 2'
    ) ?? [];

  /*
   * ------------------------------------------------------------
   * Format helpers
   * ------------------------------------------------------------
   */

  const formatNumber = (value: number) =>
    value.toLocaleString('en-MY', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <>
      {/* ======================================================
          HEADER
          ====================================================== */}

      <div className="topbar">
        <div>
          <div className="eyebrow">
            GHG MANAGEMENT
          </div>

          <h1 className="title">
            GHG Summary
          </h1>

          <div className="muted">
            Scope 1 & Scope 2 · {year}
          </div>
        </div>

        <select
          className="select"
          style={{ width: 130 }}
          value={year}
          onChange={(e) =>
            setYear(Number(e.target.value))
          }
        >
          {[2022, 2023, 2024, 2025, 2026].map(
            (y) => (
              <option key={y} value={y}>
                {y}
              </option>
            )
          )}
        </select>
      </div>

      {/* ======================================================
          KPI
          ====================================================== */}

      <div className="grid grid4">

        <div className="card">
          <div className="kpi-label">
            Total footprint
          </div>

          <div className="kpi-value">
            {loading || !data
              ? '—'
              : formatNumber(data.total)}
          </div>

          <div className="kpi-sub">
            tCO₂e
          </div>
        </div>

        <div className="card">
          <div className="kpi-label">
            Scope 1
          </div>

          <div className="kpi-value">
            {loading || !data
              ? '—'
              : formatNumber(data.scope1.total)}
          </div>

          <div className="kpi-sub">
            tCO₂e
          </div>
        </div>

        <div className="card">
          <div className="kpi-label">
            Scope 2
          </div>

          <div className="kpi-value">
            {loading || !data
              ? '—'
              : formatNumber(data.scope2.total)}
          </div>

          <div className="kpi-sub">
            tCO₂e
          </div>
        </div>

        <div className="card">
          <div className="kpi-label">
            Data status
          </div>

          <div
            className="kpi-value"
            style={{ fontSize: 20 }}
          >
            {loading
              ? 'Loading'
              : 'Connected'}
          </div>

          <div className="kpi-sub">
            Neon PostgreSQL
          </div>
        </div>

      </div>

      {/* ======================================================
          SCOPE 1 GRAPH
          ====================================================== */}

      <section className="section card">

        <div className="section-head">
          <div>
            <div className="section-title">
              Scope 1
            </div>

            <div className="muted">
              Monthly GHG emissions · 2022–2026
            </div>
          </div>
        </div>

        {loading ? (
          <div className="muted">
            Loading graph...
          </div>
        ) : (
          <LineChart
            series={scope1Series}
            height={320}
          />
        )}

      </section>

      {/* ======================================================
          SCOPE 2 GRAPH
          ====================================================== */}

      <section className="section card">

        <div className="section-head">
          <div>
            <div className="section-title">
              Scope 2
            </div>

            <div className="muted">
              Monthly GHG emissions · 2022–2026
            </div>
          </div>
        </div>

        {loading ? (
          <div className="muted">
            Loading graph...
          </div>
        ) : (
          <LineChart
            series={scope2Series}
            height={320}
          />
        )}

      </section>

      {/* ======================================================
          PERFORMANCE DATA
          ====================================================== */}

      <section className="section card">

        <div className="section-head">
          <div>
            <div className="section-title">
              Performance Data
            </div>

            <div className="muted">
              {year} · Activity and GHG emissions
            </div>
          </div>
        </div>

        <div
          style={{
            overflowX: 'auto',
          }}
        >
          <table className="table">

            <thead>
              <tr>
                <th>Source</th>
                <th>Scope</th>
                <th>Activity</th>
                <th>Unit</th>
                <th>Emission Factor</th>
                <th>tCO₂e</th>
              </tr>
            </thead>

            <tbody>

              {data?.performance.map(
                (item) => (
                  <tr key={item.slug}>

                    <td>
                      <strong>
                        {item.name}
                      </strong>
                    </td>

                    <td>
                      {item.scope}
                    </td>

                    <td className="num">
                      {formatNumber(
                        item.quantity
                      )}
                    </td>

                    <td>
                      {item.input_unit}
                    </td>

                    <td className="num">
                      {item.factor}{' '}
                      {item.factor_unit}
                    </td>

                    <td className="num">
                      {formatNumber(
                        item.emissions
                      )}
                    </td>

                  </tr>
                )
              )}

              <tr>
                <td>
                  <strong>
                    Total Scope 1
                  </strong>
                </td>

                <td>
                  Scope 1
                </td>

                <td />
                <td />
                <td />

                <td className="num">
                  <strong>
                    {data
                      ? formatNumber(
                          data.scope1.total
                        )
                      : '—'}
                  </strong>
                </td>
              </tr>

              <tr>
                <td>
                  <strong>
                    Total Scope 2
                  </strong>
                </td>

                <td>
                  Scope 2
                </td>

                <td />
                <td />
                <td />

                <td className="num">
                  <strong>
                    {data
                      ? formatNumber(
                          data.scope2.total
                        )
                      : '—'}
                  </strong>
                </td>
              </tr>

              <tr>
                <td>
                  <strong>
                    Total GHG
                  </strong>
                </td>

                <td>
                  Scope 1 + Scope 2
                </td>

                <td />
                <td />
                <td />

                <td className="num">
                  <strong>
                    {data
                      ? formatNumber(data.total)
                      : '—'}
                  </strong>
                </td>
              </tr>

            </tbody>

          </table>
        </div>

      </section>

      {/* ======================================================
          TRENDS
          ====================================================== */}

      <section className="section card">

        <div className="section-head">
          <div>
            <div className="section-title">
              Trends
            </div>

            <div className="muted">
              Annual GHG emissions · 2022–2026
            </div>
          </div>
        </div>

        {data && (
          <>
            <div
              style={{
                height: 320,
              }}
            >
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'stretch',
                  gap: 20,
                }}
              >

                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <LineChart
                    labels={data.graphs.trends.map(
                      (item) => String(item.year)
                    )}
                    series={[
                      {
                        label: 'Scope 1',
                        values:
                          data.graphs.trends.map(
                            (item) =>
                              item.scope1
                          ),
                      },
                      {
                        label: 'Scope 2',
                        values:
                          data.graphs.trends.map(
                            (item) =>
                              item.scope2
                          ),
                      },
                      {
                        label: 'Total',
                        values:
                          data.graphs.trends.map(
                            (item) =>
                              item.total
                          ),
                      },
                    ]}
                    height={320}
                  />
                </div>

              </div>
            </div>

            <div
              style={{
                overflowX: 'auto',
                marginTop: 18,
              }}
            >
              <table className="table">

                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Scope 1</th>
                    <th>Scope 2</th>
                    <th>Total</th>
                  </tr>
                </thead>

                <tbody>

                  {data.graphs.trends.map(
                    (item) => (
                      <tr key={item.year}>

                        <td>
                          {item.year}
                        </td>

                        <td className="num">
                          {formatNumber(
                            item.scope1
                          )}
                        </td>

                        <td className="num">
                          {formatNumber(
                            item.scope2
                          )}
                        </td>

                        <td className="num">
                          <strong>
                            {formatNumber(
                              item.total
                            )}
                          </strong>
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>
            </div>
          </>
        )}

      </section>

      {/* ======================================================
          DATA ENTRY LINKS
          ====================================================== */}

      <div className="grid grid2 section">

        <div className="card">

          <div className="section-title">
            Scope 1 parameters
          </div>

          <div
            className="page-links"
            style={{
              gridTemplateColumns:
                '1fr 1fr',
              marginTop: 12,
            }}
          >

            {parameters
              .filter(
                (p) =>
                  p.scope === 'Scope 1'
              )
              .map((p) => (
                <Link
                  className="param-card"
                  key={p.slug}
                  href={`/data/scope-1/${p.slug}`}
                >
                  <strong>
                    {p.name}
                  </strong>

                  <span>
                    {p.unit} · Data page →
                  </span>
                </Link>
              ))}

          </div>

        </div>

        <div className="card">

          <div className="section-title">
            Scope 2 parameters
          </div>

          <div
            className="page-links"
            style={{
              gridTemplateColumns: '1fr',
              marginTop: 12,
            }}
          >

            {parameters
              .filter(
                (p) =>
                  p.scope === 'Scope 2'
              )
              .map((p) => (
                <Link
                  className="param-card"
                  key={p.slug}
                  href={`/data/scope-2/${p.slug}`}
                >
                  <strong>
                    {p.name}
                  </strong>

                  <span>
                    {p.unit} · Data page →
                  </span>
                </Link>
              ))}

          </div>

        </div>

      </div>
    </>
  );
}