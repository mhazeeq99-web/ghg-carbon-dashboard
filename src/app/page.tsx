'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LineChart } from '@/components/line-chart';
import { months, parameters } from '@/lib/ghg';

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
  monthly: {
    month: number;
    scope1: number;
    scope2: number;
    total: number;
  }[];
};

export default function Dashboard() {
  const [year, setYear] = useState(2026);
  const [data, setData] = useState<DashboardData | null>(null);
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
          throw new Error(result.error || 'Failed to load dashboard');
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

  const monthlyValues =
    data?.monthly.map((item) => item.total) ??
    months.map(() => 0);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">
            GHG MANAGEMENT
          </div>

          <h1 className="title">
            Carbon Footprint Dashboard
          </h1>

          <div className="muted">
            Scope 1 & Scope 2 · {year}
          </div>
        </div>

        <select
          className="select"
          style={{ width: 130 }}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {[2022, 2023, 2024, 2025, 2026].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid4">

        <div className="card">
          <div className="kpi-label">
            Total footprint
          </div>

          <div className="kpi-value">
            {loading || !data
              ? '—'
              : data.total.toFixed(2)}
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
              : data.scope1.total.toFixed(2)}
          </div>

          <div className="kpi-sub">
            Fuel combustion
          </div>
        </div>


        <div className="card">
          <div className="kpi-label">
            Scope 2
          </div>

          <div className="kpi-value">
            {loading || !data
              ? '—'
              : data.scope2.total.toFixed(2)}
          </div>

          <div className="kpi-sub">
            Purchased electricity
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
            {loading ? 'Loading' : 'Connected'}
          </div>

          <div className="kpi-sub">
            Neon PostgreSQL
          </div>
        </div>

      </div>


      <section className="section card">

        <div className="section-head">

          <div>
            <div className="section-title">
              Carbon footprint trend
            </div>

            <div className="muted">
              Monthly Scope 1 + Scope 2 emissions
            </div>
          </div>

        </div>

        <LineChart
          values={monthlyValues}
          label="Total tCO₂e"
        />

      </section>


      <div className="grid grid2 section">

        <div className="card">

          <div className="section-title">
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
              .filter((p) => p.scope === 'Scope 2')
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
