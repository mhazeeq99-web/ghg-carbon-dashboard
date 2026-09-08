'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Pencil,
} from 'lucide-react';

type Factor = {
  id: string;
  slug: string;
  name: string;
  scope: string;
  year: number;
  factor: string;
  factor_unit: string;
  source: string;
  created_at: string;
};

type Revision = {
  id: string;
  old_factor: string;
  new_factor: string;
  old_factor_unit: string;
  new_factor_unit: string;
  old_source: string | null;
  new_source: string | null;
  reason: string;
  changed_by: string | null;
  changed_at: string;
};

type Notice = {
  text: string;
  kind: 'ok' | 'error';
};

export default function EmissionFactorsPage() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [scope, setScope] = useState('All');
  const [year, setYear] = useState('All');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Factor | null>(null);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);

  async function loadFactors() {
    try {
      const res = await fetch('/api/emission-factor');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load factors');
      }

      setFactors(data.data || []);
    } catch (error) {
      setNotice({
        text:
          error instanceof Error
            ? error.message
            : 'Failed to load emission factors',
        kind: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadRevisions(factorId: string) {
    try {
      const res = await fetch(
        `/api/emission-factor/revisions?id=${factorId}`
      );

      if (!res.ok) {
        setRevisions([]);
        return;
      }

      const data = await res.json();
      setRevisions(data.data || []);
    } catch {
      setRevisions([]);
    }
  }

  useEffect(() => {
    // Fetch-on-mount: loadFactors only calls setState after awaited fetches.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFactors();
  }, []);

  function startEdit(factor: Factor) {
    setEditing(factor);
    setNotice(null);
    loadRevisions(factor.id);
  }

  function closeEdit() {
    setEditing(null);
    setRevisions([]);
  }

  const filtered = factors.filter((factor) => {
    const scopeMatch =
      scope === 'All' || factor.scope === scope;

    const yearMatch =
      year === 'All' || factor.year === Number(year);

    return scopeMatch && yearMatch;
  });

  const years = [...new Set(factors.map((f) => f.year))].sort(
    (a, b) => b - a
  );

  const scopeBadge = (scopeName: string) => (
    <span
      className={`badge ${
        scopeName === 'Scope 1' ? 'badge-orange' : 'badge-blue'
      }`}
    >
      {scopeName}
    </span>
  );

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">GHG MANAGEMENT</div>
          <h1 className="title">Emission Factors</h1>
          <div className="muted">
            Year-specific emission factors and revision history
          </div>
        </div>
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

      <section className="card">
        <div className="toolbar">
          <div className="segmented">
            {['All', 'Scope 1', 'Scope 2'].map((option) => (
              <button
                key={option}
                className={scope === option ? 'active' : ''}
                onClick={() => setScope(option)}
              >
                {option}
              </button>
            ))}
          </div>

          <select
            className="select"
            style={{ width: 140 }}
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            <option>All</option>
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="section card">
        <div className="section-head">
          <div>
            <div className="section-title">
              <span className="dot dot-green" />
              Emission factor register
            </div>
            <div className="muted">
              {filtered.length} factor records
            </div>
          </div>
        </div>

        {loading ? (
          <div className="muted">Loading...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Scope</th>
                  <th>Parameter</th>
                  <th>Year</th>
                  <th>Factor</th>
                  <th>Unit</th>
                  <th>Source</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((factor) => (
                  <tr key={factor.id}>
                    <td>{scopeBadge(factor.scope)}</td>
                    <td>
                      <strong>{factor.name}</strong>
                    </td>
                    <td>{factor.year}</td>
                    <td className="num">
                      {Number(factor.factor).toLocaleString(undefined, {
                        maximumFractionDigits: 6,
                      })}
                    </td>
                    <td>{factor.factor_unit}</td>
                    <td>{factor.source}</td>
                    <td>
                      <button
                        className="btn secondary"
                        onClick={() => startEdit(factor)}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          <Pencil size={12} />
                          Edit
                        </span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && (
        <section className="section card accent-top">
          <div className="section-head">
            <div>
              <div className="section-title">Edit emission factor</div>
              <div className="muted">
                {editing.name} · {editing.year}
              </div>
            </div>

            <button
              className="btn secondary"
              onClick={closeEdit}
            >
              Close
            </button>
          </div>

          <FactorEditor
            factor={editing}
            onSaved={async () => {
              await loadFactors();
              setNotice({
                text: 'Emission factor updated successfully.',
                kind: 'ok',
              });
            }}
          />

          <div className="section">
            <div className="section-title">
              <span className="dot dot-neutral" />
              Revision history
            </div>

            <div className="muted" style={{ marginTop: 5 }}>
              Previous changes to this factor
            </div>

            <div style={{ marginTop: 12 }}>
              {revisions.length === 0 ? (
                <div className="muted">
                  No revisions recorded.
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Change</th>
                      <th>Reason</th>
                      <th>Changed by</th>
                    </tr>
                  </thead>

                  <tbody>
                    {revisions.map((revision) => (
                      <tr key={revision.id}>
                        <td>
                          {new Date(
                            revision.changed_at
                          ).toLocaleString()}
                        </td>

                        <td>
                          <span className="muted">
                            {revision.old_factor}{' '}
                            {revision.old_factor_unit}
                          </span>
                          <ArrowRight
                            size={12}
                            style={{
                              display: 'inline-block',
                              margin: '0 6px',
                              verticalAlign: -2,
                              color: 'var(--muted)',
                            }}
                          />
                          <strong>
                            {revision.new_factor}{' '}
                            {revision.new_factor_unit}
                          </strong>
                        </td>

                        <td>{revision.reason}</td>

                        <td>{revision.changed_by || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function FactorEditor({
  factor,
  onSaved,
}: {
  factor: Factor;
  onSaved: () => Promise<void>;
}) {
  const [value, setValue] = useState(factor.factor);
  const [unit, setUnit] = useState(factor.factor_unit);
  const [source, setSource] = useState(factor.source);
  const [reason, setReason] = useState('');
  const [changedBy, setChangedBy] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!reason.trim()) {
      setError('Reason for change is required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/emission-factor', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug: factor.slug,
          year: factor.year,
          factor: Number(value),
          factor_unit: unit,
          source,
          reason,
          changed_by: changedBy || 'system',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update factor');
      }

      setReason('');
      await onSaved();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to update factor'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {error && (
        <div className="alert alert-error">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      <div className="form-grid">
        <div className="field">
          <label>Factor</label>
          <input
            className="input"
            type="number"
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Factor unit</label>
          <input
            className="input"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Source</label>
          <input
            className="input"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Changed by</label>
          <input
            className="input"
            value={changedBy}
            onChange={(e) => setChangedBy(e.target.value)}
            placeholder="Name"
          />
        </div>
      </div>

      <div className="field" style={{ marginTop: 10 }}>
        <label>Reason for change *</label>
        <input
          className="input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is this emission factor being changed?"
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <button
          className="btn"
          onClick={save}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save factor'}
        </button>
      </div>
    </>
  );
}
