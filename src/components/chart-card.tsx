'use client';

import { Eye, EyeOff } from 'lucide-react';

type ChartCardProps = {
  /** Chart title, e.g. "Scope 1" or "Electricity Tago". */
  title: React.ReactNode;
  /** Years shown as toggle chips, e.g. 2022–2026. */
  years: number[];
  hiddenYears: Set<number>;
  onToggleYear: (year: number) => void;
  onResetYears: () => void;
  /** The chart itself (or a loading placeholder). */
  children: React.ReactNode;
};

/**
 * Shared chart card layout used by every chart in the app:
 *
 *   SHOW: [2022] [2023] [2024] [2025] [2026]
 *
 *   Chart Title
 *
 *   [CHART]
 */
export function ChartCard({
  title,
  years,
  hiddenYears,
  onToggleYear,
  onResetYears,
  children,
}: ChartCardProps) {
  return (
    <section className="section card">
      <div className="year-filter chart-filter">
        <span className="year-filter-label">Show:</span>

        {years.map((y) => {
          const hidden = hiddenYears.has(y);

          return (
            <button
              key={y}
              className={`year-chip ${hidden ? 'off' : 'on'}`}
              onClick={() => onToggleYear(y)}
              title={hidden ? `Show ${y}` : `Hide ${y}`}
            >
              {hidden ? <EyeOff size={12} /> : <Eye size={12} />}
              {y}
            </button>
          );
        })}

        {hiddenYears.size > 0 && (
          <button
            className="year-chip reset"
            onClick={onResetYears}
          >
            Reset
          </button>
        )}
      </div>

      <div className="chart-head">
        <div className="section-title">{title}</div>
      </div>

      {children}
    </section>
  );
}
