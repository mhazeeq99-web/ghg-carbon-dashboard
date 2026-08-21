'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Leaf,
  Gauge,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { months, years, parameters } from '@/lib/ghg';
import { BarChart } from './bar-chart';

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

type Notice = {
  text: string;
  kind: 'ok' | 'error';
};

export function DataPage({ slug }: { slug: string }) {
  const parameter = parameters.find((p) => p.slug === slug);

  const [year, setYear] = useState(2026);
  const [location, setLocation] = useState('');
  const [month, setMonth] = useState(1);
  const [value, setValue] = useState('');
  const [allRows, setAllRows] = useState<ActivityRow[]>([]);
  const [factorData, setFactorData] = useState<FactorData | null>(null);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [hiddenYears, setHiddenYears] = useState<Set<number>>(new Set());

  const refreshData = useCallback(async () => {
    if (!parameter) return;

    setLoading(true);
    setNotice(null);

    try {
      const [activityResponse, factorResponse] = await Promise.all([
        fetch(
          `/api/activity?slug=${encodeURIComponent(slug)}`,
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

      setAllRows(activityRows);

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
      setNotice({
        text:
          error instanceof Error
            ? error.message
            : 'Failed to load data',
        kind: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [slug, year]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  async function syncSolar() {
    if (parameter?.slug !== 'solar') return;

    setSyncing(true);
    setNotice(null);

    try {
      const response = await fetch('/api/solar/sync', {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Sync failed');
      }

      setNotice({
        text: `Synced ${result.records_fetched} monthly records (${result.records_upserted} upserted).`,
        kind: 'ok',
      });

      await refreshData();
    } catch (error) {
      console.error(error);
      setNotice({
        text:
          error instanceof Error
            ? error.message
            : 'Sync failed',
        kind: 'error',
      });
    } finally {
      setSyncing(false);
    }
  }

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

  const selectedLocation = location || locations[0] || '';

  const yearRows = useMemo(
    () => allRows.filter((row) => row.year === year),
    [allRows, year]
  );

  const monthlyRows = useMemo(() => {
    return months.map((name, index) => {
      const monthNumber = index + 1;

      const row = yearRows.find(
        (r) =>
          r.month === monthNumber &&
          (!selectedLocation || r.location === selectedLocation)
      );

      const quantity =
        row === undefined ? null : Number(row.quantity);

      const factor = factorData ? Number(factorData.factor) : null;

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
  }, [yearRows, selectedLocation, factorData]);

  /*
   * One line per year for the monthly trend chart,
   * aligned to the selected location.
   */
  const chartSeries = useMemo(() => {
    return years.map((y) => ({
      label: String(y),
      values: months.map((_, index) => {
        const row = allRows.find(
          (r) =>
            r.year === y &&
            r.month === index + 1 &&
            r.location === selectedLocation
        );

        return row === undefined ? null : Number(row.quantity);
      }),
    }));
  }, [allRows, selectedLocation]);

  const visibleSeries = chartSeries.filter(
    (seriesItem) => !hiddenYears.has(Number(seriesItem.label))
  );

  const total = monthlyRows.reduce(
    (sum, row) => sum + (row.quantity ?? 0),
    0
  );

  const emission = monthlyRows.reduce(
    (sum, row) => sum + (row.emission ?? 0),
    0
  );

  async function save() {
    if (!selectedLocation) {
      setNotice({
        text: 'Please select a location.',
        kind: 'error',
      });
      return;
    }

    if (value === '') {
      setNotice({ text: 'Please enter a quantity.', kind: 'error' });
      return;
    }

    const quantity = Number(value);

    if (!Number.isFinite(quantity)) {
      setNotice({
        text: 'Quantity must be a valid number.',
        kind: 'error',
      });
      return;
    }

    setSaving(true);
    setNotice(null);

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
        throw new Error(result.error || 'Failed to save data');
      }

      setValue('');
      setNotice({
        text: 'Data saved successfully.',
        kind: 'ok',
      });

      await refreshData();
    } catch (error) {
      console.error(error);

      setNotice({
        text:
          error instanceof Error
            ? error.message
            : 'Failed to save data',
        kind: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  if (!parameter) {
    return <div className="card">Parameter not found.</div>;
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">{parameter.scope}</div>

          <h1 className="title">{parameter.name}</h1>

          <div className="muted">
            Database-backed data entry — Neon PostgreSQL
          </div>
        </div>

        <span className={`pill ${loading ? 'pill-busy' : 'pill-ok'}`}>
          <span className="pill-dot" />
          {loading ? 'Loading…' : 'Connected'}
        </span>
      </div>

      {notice && (
        <div
          className={`alert ${notice.kind === 'ok' ? 'alert-ok' : 'alert-error'}`}
        >
          {notice.kind === 'ok' ? (
            <CheckCircle2 size={15} />
          ) : (
            <AlertCircle size={15} />
          )}
          {notice.text}
        </div>
      )}

      <div className="grid grid3">
        <div className="card kpi">
          <div className="kpi-top">
            <div className="kpi-label">Annual consumption</div>
            <span className="kpi-icon">
              <BarChart3 size={16} />
            </span>
          </div>

          <div className="kpi-value">
            {loading
              ? '—'
              : total.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
          </div>

          <div className="kpi-bottom">
            <div className="kpi-sub">{parameter.unit}</div>
          </div>
        </div>

        <div className="card kpi">
          <div className="kpi-top">
            <div className="kpi-label">GHG emission</div>
            <span className="kpi-icon kpi-icon-orange">
              <Leaf size={16} />
            </span>
          </div>

          <div className="kpi-value">
            {loading ? '—' : emission.toFixed(2)}
          </div>

          <div className="kpi-bottom">
            <div className="kpi-sub">tCO₂e</div>
          </div>
        </div>

        <div className="card kpi">
          <div className="kpi-top">
            <div className="kpi-label">Emission factor</div>
            <span className="kpi-icon kpi-icon-blue">
              <Gauge size={16} />
            </span>
          </div>

          <div className="kpi-value">
            {factorData ? Number(factorData.factor).toString() : '—'}
          </div>

          <div className="kpi-bottom">
            <div className="kpi-sub">
              {factorData?.factor_unit ?? 'No factor found'}
            </div>
          </div>
        </div>
      </div>

      <section className="section card">
        <div className="section-head">
          <div>
            <div className="section-title">Add monthly data</div>

            <div className="muted">
              Enter source activity data. Emissions are calculated
              automatically.
            </div>
          </div>

          {parameter.slug === 'solar' && (
            <button
              className="btn secondary"
              onClick={syncSolar}
              disabled={syncing || loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <RefreshCw size={13} />
              {syncing ? 'Syncing…' : 'Sync from iSolarCloud'}
            </button>
          )}
        </div>

        <div className="form-grid">
          <div className="field">
            <label>Year</label>

            <select
              className="select"
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

          <div className="field">
            <label>Location</label>

            <select
              className="select"
              value={selectedLocation}
              onChange={(e) => setLocation(e.target.value)}
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
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {months.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Quantity ({parameter.unit})</label>

            <input
              className="input"
              type="number"
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div
            className="field"
            style={{ display: 'flex', alignItems: 'end' }}
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

        {!loading && yearRows.length === 0 && (
          <div className="alert alert-ok" style={{ marginTop: 14 }}>
            <CheckCircle2 size={15} />
            No records yet for {year} — fill in the form above to add
            the first entry.
          </div>
        )}
      </section>

      <section className="section card">
        <div className="section-head">
          <div>
            <div className="section-title">Monthly trend</div>

            <div className="muted">
              {selectedLocation || '—'} · {parameter.unit} ·
              compare across years
            </div>
          </div>
        </div>

        <div className="year-filter" style={{ marginBottom: 16 }}>
          <span className="year-filter-label">Show:</span>

          {years.map((y) => {
            const hidden = hiddenYears.has(y);

            return (
              <button
                key={y}
                className={`year-chip ${hidden ? 'off' : 'on'}`}
                onClick={() => toggleYear(y)}
                title={hidden ? `Show ${y}` : `Hide ${y}`}
              >
                {hidden ? (
                  <EyeOff size={12} />
                ) : (
                  <Eye size={12} />
                )}
                {y}
              </button>
            );
          })}

          {hiddenYears.size > 0 && (
            <button
              className="year-chip reset"
              onClick={() => setHiddenYears(new Set())}
            >
              Reset
            </button>
          )}
        </div>

        <BarChart labels={months} series={visibleSeries} height={320} xLabel="Month" yLabel={parameter.unit} />
      </section>

      <section className="section card">
        <div className="section-head">
          <div>
            <div className="section-title">Monthly records</div>
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
              <tr
                key={row.month}
                className={row.quantity === null ? 'row-muted' : ''}
              >
                <td>
                  <strong>{row.month}</strong>
                </td>

                <td>
                  {row.quantity === null ? '—' : selectedLocation}
                </td>

                <td className="num">
                  {row.quantity === null
                    ? '—'
                    : row.quantity.toLocaleString(undefined, {
                        maximumFractionDigits: 3,
                      })}
                </td>

                <td>{parameter.unit}</td>

                <td className="num">
                  {row.emission === null
                    ? '—'
                    : `${row.emission.toFixed(3)} tCO₂e`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
