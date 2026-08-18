'use client';

import { useEffect, useMemo, useState } from 'react';
import { months, years, parameters } from '@/lib/ghg';
import { LineChart } from './line-chart';

type ActivityRow = {
  id: string;
  slug: string;
  name: string;
  scope: string;
  input_unit: string;
  location: string;
  year: number;
  month: number;
  quantity: string | number;
  notes: string | null;
};

type FactorData = {
  factor: string | number;
  factor_unit: string;
  source: string | null;
  year: number;
};

export function DataPage({ slug }: { slug: string }) {
  const parameter = parameters.find((p) => p.slug === slug);

  const [year, setYear] = useState(2026);
  const [location, setLocation] = useState('');
  const [month, setMonth] = useState(1);
  const [value, setValue] = useState('');
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [factorData, setFactorData] = useState<FactorData | null>(null);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!parameter) return;

    async function loadData() {
      setLoading(true);
      setMessage('');

      try {
        const [activityResponse, factorResponse] = await Promise.all([
          fetch(
            `/api/activity?slug=${encodeURIComponent(slug)}&year=${year}`,
            { cache: 'no-store' }
          ),
          fetch(
            `/api/emission-factor?slug=${encodeURIComponent(slug)}&year=${year}`,
            { cache: 'no-store' }
          ),
        ]);

        const activityResult = await activityResponse.json();

        if (!activityResponse.ok) {
          throw new Error(
            activityResult.error || 'Failed to load activity data'
          );
        }

        const activityRows: ActivityRow[] = activityResult.data ?? [];

        setRows(activityRows);

        const uniqueLocations = Array.from(
          new Set(activityRows.map((row) => row.location))
        );

        setLocations(uniqueLocations);

        if (
          uniqueLocations.length > 0 &&
          !uniqueLocations.includes(location)
        ) {
          setLocation(uniqueLocations[0]);
        }

        if (factorResponse.ok) {
          const factorResult = await factorResponse.json();
          setFactorData(factorResult);
        } else {
          setFactorData(null);
        }
      } catch (error) {
        console.error(error);
        setMessage(
          error instanceof Error
            ? error.message
            : 'Failed to load data'
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [slug, year]);

  const getRow = (monthNumber: number, selectedLocation?: string) => {
    return rows.find(
      (row) =>
        row.month === monthNumber &&
        (!selectedLocation || row.location === selectedLocation)
    );
  };

  const selectedLocation = location || locations[0] || '';

  const monthlyRows = useMemo(() => {
    return months.map((name, index) => {
      const monthNumber = index + 1;

      const row = getRow(
        monthNumber,
        selectedLocation
      );

      const quantity =
        row === undefined
          ? null
          : Number(row.quantity);

      const factor = factorData
        ? Number(factorData.factor)
        : null;

      const emission =
        quantity !== null && factor !== null
          ? (quantity * factor) / 1000
          : null;

      return {
        month: name,
        quantity,
        emission,
      };
    });
  }, [rows, selectedLocation, factorData]);

  const total = monthlyRows.reduce(
    (sum, row) =>
      sum + (row.quantity ?? 0),
    0
  );

  const emission = monthlyRows.reduce(
    (sum, row) =>
      sum + (row.emission ?? 0),
    0
  );

  const chartValues = monthlyRows.map(
    (row) => row.quantity ?? 0
  );

  async function save() {
    if (!selectedLocation) {
      setMessage('Please select a location.');
      return;
    }

    if (value === '') {
      setMessage('Please enter a quantity.');
      return;
    }

    const quantity = Number(value);

    if (!Number.isFinite(quantity)) {
      setMessage('Quantity must be a valid number.');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug,
          location: selectedLocation,
          year,
          month,
          quantity,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || 'Failed to save data'
        );
      }

      setValue('');
      setMessage('Data saved successfully.');

      const refresh = await fetch(
        `/api/activity?slug=${encodeURIComponent(slug)}&year=${year}`,
        { cache: 'no-store' }
      );

      const refreshResult = await refresh.json();

      if (refresh.ok) {
        setRows(refreshResult.data ?? []);
      }
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : 'Failed to save data'
      );
    } finally {
      setSaving(false);
    }
  }

  if (!parameter) {
    return (
      <div className="card">
        Parameter not found.
      </div>
    );
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">
            {parameter.scope}
          </div>

          <h1 className="title">
            {parameter.name}
          </h1>

          <div className="muted">
            Database-backed data entry — Neon PostgreSQL
          </div>
        </div>

        <div className="muted">
          {loading ? 'Loading…' : 'Connected'}
        </div>
      </div>


      <div className="grid grid4">

        <div className="card">
          <div className="kpi-label">
            Annual consumption
          </div>

          <div className="kpi-value">
            {loading
              ? '—'
              : total.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
          </div>

          <div className="kpi-sub">
            {parameter.unit}
          </div>
        </div>


        <div className="card">
          <div className="kpi-label">
            GHG emission
          </div>

          <div className="kpi-value">
            {loading
              ? '—'
              : emission.toFixed(2)}
          </div>

          <div className="kpi-sub">
            tCO₂e
          </div>
        </div>


        <div className="card">
          <div className="kpi-label">
            Emission factor
          </div>

          <div className="kpi-value">
            {factorData
              ? Number(factorData.factor).toString()
              : '—'}
          </div>

          <div className="kpi-sub">
            {factorData?.factor_unit ?? 'No factor found'}
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
              Add monthly data
            </div>

            <div className="muted">
              Enter source activity data.
              Emissions are calculated automatically.
            </div>
          </div>

        </div>


        <div className="form-grid">

          <div className="field">
            <label>Year</label>

            <select
              className="select"
              value={year}
              onChange={(e) =>
                setYear(Number(e.target.value))
              }
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>


          <div className="field">
            <label>Location</label>

            <select
              className="select"
              value={selectedLocation}
              onChange={(e) =>
                setLocation(e.target.value)
              }
            >
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>


          <div className="field">
            <label>Month</label>

            <select
              className="select"
              value={month}
              onChange={(e) =>
                setMonth(Number(e.target.value))
              }
            >
              {months.map((name, index) => (
                <option
                  key={name}
                  value={index + 1}
                >
                  {name}
                </option>
              ))}
            </select>
          </div>


          <div className="field">
            <label>
              Quantity ({parameter.unit})
            </label>

            <input
              className="input"
              type="number"
              step="any"
              value={value}
              onChange={(e) =>
                setValue(e.target.value)
              }
              placeholder="0.00"
            />
          </div>


          <div
            className="field"
            style={{
              display: 'flex',
              alignItems: 'end',
            }}
          >
            <button
              className="btn"
              style={{ width: '100%' }}
              onClick={save}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save data'}
            </button>
          </div>

        </div>


        {message && (
          <div
            className="muted"
            style={{ marginTop: 12 }}
          >
            {message}
          </div>
        )}

      </section>


      <section className="section card">

        <div className="section-head">

          <div>
            <div className="section-title">
              Monthly trend
            </div>

            <div className="muted">
              {year} · {selectedLocation} ·{' '}
              {parameter.unit}
            </div>
          </div>

        </div>

        <LineChart
          values={chartValues}
          label={`${parameter.name} (${parameter.unit})`}
        />

      </section>


      <section className="section card">

        <div className="section-head">

          <div>
            <div className="section-title">
              Monthly records
            </div>
          </div>

        </div>


        <table className="table">

          <thead>
            <tr>
              <th>Month</th>
              <th>Location</th>
              <th>Activity</th>
              <th>Unit</th>
              <th>Emission</th>
            </tr>
          </thead>


          <tbody>

            {monthlyRows.map((row) => (
              <tr key={row.month}>

                <td>{row.month}</td>

                <td>
                  {row.quantity === null
                    ? '—'
                    : selectedLocation}
                </td>

                <td className="num">
                  {row.quantity === null
                    ? '—'
                    : row.quantity.toLocaleString(
                        undefined,
                        {
                          maximumFractionDigits: 3,
                        }
                      )}
                </td>

                <td>
                  {parameter.unit}
                </td>

                <td className="num">
                  {row.emission === null
                    ? '—'
                    : `${row.emission.toFixed(
                        3
                      )} tCO₂e`}
                </td>

              </tr>
            ))}

          </tbody>

        </table>

      </section>
    </>
  );
}
