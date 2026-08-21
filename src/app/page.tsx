'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Leaf,
  Flame,
  Zap,
  Fuel,
  PlugZap,
  ChevronRight,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { LineChart } from '@/components/line-chart';
import { ChartCard } from '@/components/chart-card';
import { BarChart } from '@/components/bar-chart';
import { parameters, years } from '@/lib/ghg';

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
    parameters: unknown[];
  };
  scope2: {
    total: number;
    parameters: unknown[];
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
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hiddenYears, setHiddenYears] = useState<Set<number>>(new Set());

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
            result.error || 'Failed to load dashboard'
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

  const toggleYear = (targetYear: number) =>
    setHiddenYears((prev) => {
      const next = new Set(prev);
      if (next.has(targetYear)) {
        next.delete(targetYear);
      } else {
        next.add(targetYear);
      }
      return next;
    });

  /*
   * ------------------------------------------------------------
   * Graph series (filtered by the visible-years toggle)
   * ------------------------------------------------------------
   */

  const scope1Series = (data?.graphs.scope1 ?? [])
    .filter((item) => !hiddenYears.has(item.year))
    .map((item) => ({
      label: String(item.year),
      values: item.values,
    }));

  const scope2Series = (data?.graphs.scope2 ?? [])
    .filter((item) => !hiddenYears.has(item.year))
    .map((item) => ({
      label: String(item.year),
      values: item.values,
    }));

  const visibleTrends = (data?.graphs.trends ?? []).filter(
    (item) => !hiddenYears.has(item.year)
  );

  /*
   * ------------------------------------------------------------
   * Year-over-year delta (from annual trends)
   * ------------------------------------------------------------
   */

  const currentTrend = data?.graphs.trends.find(
    (item) => item.year === year
  );

  const previousTrend = data?.graphs.trends.find(
    (item) => item.year === year - 1
  );

  const deltaPct =
    currentTrend &&
    previousTrend &&
    previousTrend.total !== 0
      ? ((currentTrend.total - previousTrend.total) /
          previousTrend.total) *
        100
      : null;

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
          <div className="eyebrow">GHG MANAGEMENT</div>

          <h1 className="title">GHG Summary</h1>

          <div className="muted">
            Scope 1 &amp; Scope 2 · {year}
          </div>
        </div>

        <select
          className="select"
          style={{ width: 130 }}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* ======================================================
          KPI
          ====================================================== */}

      <div className="grid grid3">
        <div className="card kpi">
          <div className="kpi-top">
            <div className="kpi-label">Total footprint</div>
            <span className="kpi-icon">
              <Leaf size={16} />
            </span>
          </div>

          <div className="kpi-value">
            {loading || !data ? (
              <div
                className="skeleton"
                style={{ width: 130, height: 28 }}
              />
            ) : (
              formatNumber(data.total)
            )}
          </div>

          <div className="kpi-bottom">
            <div className="kpi-sub">tCO₂e</div>
            {deltaPct !== null && !loading && data && (
  <span
    className={`delta ${
      deltaPct <= 0 ? 'delta-good' : 'delta-bad'
    }`}
  >
    {deltaPct <= 0 ? (
      <TrendingDown size={12} />
    ) : (
      <TrendingUp size={12} />
    )}
    {Math.abs(deltaPct).toFixed(1)}% vs {year - 1}
  </span>
)}
          </div>
        </div>

        <div className="card kpi">
          <div className="kpi-top">
            <div className="kpi-label">Scope 1</div>
            <span className="kpi-icon kpi-icon-orange">
              <Flame size={16} />
            </span>
          </div>

          <div className="kpi-value">
            {loading || !data ? (
              <div
                className="skeleton"
                style={{ width: 110, height: 28 }}
              />
            ) : (
              formatNumber(data.scope1.total)
            )}
          </div>

          <div className="kpi-bottom">
            <div className="kpi-sub">tCO₂e</div>
          </div>
        </div>

        <div className="card kpi">
          <div className="kpi-top">
            <div className="kpi-label">Scope 2</div>
            <span className="kpi-icon kpi-icon-blue">
              <Zap size={16} />
            </span>
          </div>

          <div className="kpi-value">
            {loading || !data ? (
              <div
                className="skeleton"
                style={{ width: 110, height: 28 }}
              />
            ) : (
              formatNumber(data.scope2.total)
            )}
          </div>

          <div className="kpi-bottom">
            <div className="kpi-sub">tCO₂e</div>
          </div>
        </div>
      </div>

      {/* ======================================================
          SCOPE 1 GRAPH
          ====================================================== */}

      <ChartCard
        title={<>Scope 1</>}
        years={years}
        hiddenYears={hiddenYears}
        onToggleYear={toggleYear}
        onResetYears={() => setHiddenYears(new Set())}
      >
        {loading ? (
          <div className="skeleton skeleton-chart" />
        ) : (
          <LineChart series={scope1Series} height={320} xLabel="Month" yLabel="tCO₂e" />
        )}
      </ChartCard>

      {/* ======================================================
          SCOPE 2 GRAPH
          ====================================================== */}

      <ChartCard
        title={<>Scope 2</>}
        years={years}
        hiddenYears={hiddenYears}
        onToggleYear={toggleYear}
        onResetYears={() => setHiddenYears(new Set())}
      >
        {loading ? (
          <div className="skeleton skeleton-chart" />
        ) : (
          <LineChart series={scope2Series} height={320} xLabel="Month" yLabel="tCO₂e" />
        )}
      </ChartCard>

      {/* ======================================================
          ANNUAL COMPARISON (STACKED BAR CHART)
          ====================================================== */}

      <ChartCard
        title={<>Annual comparison</>}
        years={years}
        hiddenYears={hiddenYears}
        onToggleYear={toggleYear}
        onResetYears={() => setHiddenYears(new Set())}
      >
        {loading ? (
          <div className="skeleton skeleton-chart" />
        ) : (
          data && (
            <BarChart
              labels={visibleTrends.map((item) =>
                String(item.year)
              )}
              series={[
                {
                  label: 'Scope 1',
                  values: visibleTrends.map((item) => item.scope1),
                },
                {
                  label: 'Scope 2',
                  values: visibleTrends.map((item) => item.scope2),
                },
              ]}
              height={320}
              stacked
              xLabel="Year"
              yLabel="tCO₂e"
            />
          )
        )}
      </ChartCard>

      {/* ======================================================
          PERFORMANCE DATA
          ====================================================== */}

      <section className="section card">
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="dot dot-neutral" />
              Performance Data
            </div>

            <div className="muted">
              {year} · Activity and GHG emissions
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
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
              {loading || !data ? (
                <tr>
                  <td colSpan={6} className="muted">
                    Loading…
                  </td>
                </tr>
              ) : (
                data.performance.map((item) => (
                  <tr key={item.slug}>
                    <td>
                      <strong>{item.name}</strong>
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          item.scope === 'Scope 1'
                            ? 'badge-orange'
                            : 'badge-blue'
                        }`}
                      >
                        {item.scope}
                      </span>
                    </td>

                    <td className="num">
                      {formatNumber(item.quantity)}
                    </td>

                    <td>{item.input_unit}</td>

                    <td className="num">
                      {item.factor} {item.factor_unit}
                    </td>

                    <td className="num">
                      {formatNumber(item.emissions)}
                    </td>
                  </tr>
                ))
              )}

              <tr className="row-total">
                <td>
                  <strong>Total Scope 1</strong>
                </td>
                <td>
                  <span className="badge badge-orange">
                    Scope 1
                  </span>
                </td>
                <td />
                <td />
                <td />
                <td className="num">
                  <strong>
                    {data ? formatNumber(data.scope1.total) : '—'}
                  </strong>
                </td>
              </tr>

              <tr className="row-total">
                <td>
                  <strong>Total Scope 2</strong>
                </td>
                <td>
                  <span className="badge badge-blue">
                    Scope 2
                  </span>
                </td>
                <td />
                <td />
                <td />
                <td className="num">
                  <strong>
                    {data ? formatNumber(data.scope2.total) : '—'}
                  </strong>
                </td>
              </tr>

              <tr className="row-total">
                <td>
                  <strong>Total GHG</strong>
                </td>
                <td>
                  <span className="badge badge-green">
                    Scope 1 + 2
                  </span>
                </td>
                <td />
                <td />
                <td />
                <td className="num">
                  <strong>
                    {data ? formatNumber(data.total) : '—'}
                  </strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ======================================================
          DATA ENTRY LINKS
          ====================================================== */}

      <div className="grid grid2 section">
        <div className="card">
          <div className="section-title">
            <span className="dot dot-orange" />
            Scope 1 parameters
          </div>

          <div
            className="page-links"
            style={{
              gridTemplateColumns: '1fr 1fr',
              marginTop: 12,
            }}
          >
            {parameters
              .filter((p) => p.scope === 'Scope 1')
              .map((p) => (
                <Link
                  className="param-card"
                  key={p.slug}
                  href={`/data/scope-1/${p.slug}`}
                >
                  <span className="param-icon orange">
                    <Fuel size={15} />
                  </span>

                  <strong>{p.name}</strong>

                  <span className="param-meta">
                    {p.unit} · Data page
                    <ChevronRight size={12} />
                  </span>
                </Link>
              ))}
          </div>
        </div>

        <div className="card">
          <div className="section-title">
            <span className="dot dot-blue" />
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
              .filter((p) => p.scope === 'Scope 2')
              .map((p) => (
                <Link
                  className="param-card"
                  key={p.slug}
                  href={`/data/scope-2/${p.slug}`}
                >
                  <span className="param-icon blue">
                    <PlugZap size={15} />
                  </span>

                  <strong>{p.name}</strong>

                  <span className="param-meta">
                    {p.unit} · Data page
                    <ChevronRight size={12} />
                  </span>
                </Link>
              ))}
          </div>
        </div>
      </div>
    </>
  );
}
