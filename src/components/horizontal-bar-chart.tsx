'use client';

import { useMemo, useState } from 'react';
import { plotMaxFor, seriesColor, formatCompact } from '@/lib/chart';

type Series = { label: string; values: (number | null)[] };

type HorizontalBarChartProps = {
  /** Category labels (top to bottom), e.g. years descending. */
  labels: string[];
  /** Stacked series, drawn left to right in order. */
  series: Series[];
  height?: number;
  /** Caption for the value (horizontal) axis. */
  xLabel?: string;
  /** Caption for the category (vertical) axis. */
  yLabel?: string;
};

/** Horizontal bar segment with rounded right end. */
function hSegmentPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (w <= 0) return '';
  const rr = Math.min(r, h / 2, w);
  return [
    `M ${x} ${y}`,
    `L ${x + w - rr} ${y}`,
    `Q ${x + w} ${y} ${x + w} ${y + rr}`,
    `L ${x + w} ${y + h - rr}`,
    `Q ${x + w} ${y + h} ${x + w - rr} ${y + h}`,
    `L ${x} ${y + h}`,
    'Z',
  ].join(' ');
}

export function HorizontalBarChart({
  labels,
  series,
  height = 320,
  xLabel,
  yLabel,
}: HorizontalBarChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  const totals = useMemo(
    () =>
      labels.map((_, i) =>
        series.reduce((sum, s) => {
          const v = s.values[i];
          return sum + (typeof v === 'number' ? v : 0);
        }, 0)
      ),
    [labels, series]
  );

  const anyValue = totals.some((t) => t > 0);
  const max = plotMaxFor(Math.max(...totals, 0));

  const width = 1000;
  const left = 74;
  const right = 20;
  const top = 12;
  const bottom = 42;

  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const rowCount = labels.length;
  const rowHeight = rowCount > 0 ? chartHeight / rowCount : chartHeight;
  const barHeight = Math.min(rowHeight * 0.62, 42);

  const valueX = (value: number) =>
    left + (value / (max || 1)) * chartWidth;

  const ratios = [0, 0.25, 0.5, 0.75, 1];

  if (!anyValue) {
    return (
      <div className="chart-empty" style={{ height }}>
        <svg
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 3v18h18" />
          <path d="M7 14l3-4 3 3 4-6" />
        </svg>
        No data available for this period
      </div>
    );
  }

  return (
    <div className="chart-container">
      <div
        style={{
          position: 'relative',
          height: height + 8,
        }}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height,
            overflow: 'visible',
          }}
        >
          {/* Vertical grid lines (value axis) */}
          {ratios.map((ratio) => {
            const gx = left + ratio * chartWidth;

            return (
              <line
                key={ratio}
                x1={gx}
                x2={gx}
                y1={top}
                y2={top + chartHeight}
                stroke={ratio === 0 ? '#c9d2ce' : '#e5e8ec'}
                strokeWidth="1"
                strokeDasharray={ratio === 0 ? '0' : '3,4'}
              />
            );
          })}

          {/* Category axis line (left) */}
          <line
            x1={left}
            x2={left}
            y1={top}
            y2={top + chartHeight}
            stroke="#c9d2ce"
            strokeWidth="1"
          />

          {/* Stacked horizontal bars */}
          {labels.map((label, rowIndex) => {
            const rowTop = top + rowIndex * rowHeight;
            const barY = rowTop + (rowHeight - barHeight) / 2;
            const active = hover === rowIndex;

            let cursor = 0;

            return (
              <g key={label}>
                {series.map((s, si) => {
                  const value = s.values[rowIndex];
                  if (value === null || value === undefined) return null;

                  const segW =
                    ((value - 0) / (max || 1)) * chartWidth;
                  if (segW <= 0) return null;

                  const x = left + cursor;
                  const gap = cursor > 0 ? 1.5 : 0;
                  const isLast =
                    si ===
                    series
                      .map((ss, idx) => ({ ss, idx }))
                      .filter(
                        ({ ss }) =>
                          ss.values[rowIndex] !== null &&
                          ss.values[rowIndex] !== undefined
                      )
                      .slice(-1)[0]?.idx;

                  cursor += segW;

                  const d = hSegmentPath(
                    x + gap,
                    barY,
                    segW - gap,
                    barHeight,
                    isLast ? 4 : 0
                  );

                  return (
                    <path
                      key={`${label}-${si}`}
                      d={d}
                      fill={seriesColor(s.label, si)}
                      opacity={active ? 1 : 0.88}
                      style={{ transition: 'opacity 0.12s ease' }}
                    />
                  );
                })}

                {/* Row hit area */}
                <rect
                  x={left}
                  y={rowTop}
                  width={chartWidth}
                  height={rowHeight}
                  fill="transparent"
                  style={{ pointerEvents: 'all', cursor: 'crosshair' }}
                  onMouseEnter={() => setHover(rowIndex)}
                  onMouseLeave={() => setHover(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Category (year) labels — vertically centred per bar */}
        {labels.map((label, rowIndex) => {
          const rowTop = top + rowIndex * rowHeight;

          return (
            <div
              key={`cat-${label}`}
              style={{
                position: 'absolute',
                left: 22,
                right: `calc(${((width - left) / width) * 100}% + 8px)`,
                top: rowTop + rowHeight / 2 - 8,
                textAlign: 'right',
                fontSize: 12.5,
                color: '#667085',
                fontWeight: 600,
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </div>
          );
        })}

        {/* Value axis tick labels (bottom) */}
        {ratios.map((ratio) => {
          const gx = left + ratio * chartWidth;

          return (
            <div
              key={`x-${ratio}`}
              style={{
                position: 'absolute',
                left: `${(gx / width) * 100}%`,
                top: top + chartHeight,
                transform: 'translateX(-50%)',
                paddingTop: 8,
                fontSize: 12.5,
                color: '#667085',
                fontWeight: 500,
                fontVariantNumeric: 'tabular-nums',
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              {formatCompact(max * ratio)}
            </div>
          );
        })}

        {/* Category axis caption (left, rotated) */}
        {yLabel && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 30,
              width: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                transform: 'rotate(-90deg)',
                whiteSpace: 'nowrap',
                fontSize: 12,
                fontWeight: 600,
                color: '#667085',
                letterSpacing: '0.4px',
              }}
            >
              {yLabel}
            </span>
          </div>
        )}

        {/* Value axis caption (bottom, centred) */}
        {xLabel && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: top + chartHeight + 26,
              textAlign: 'center',
              fontSize: 12,
              fontWeight: 600,
              color: '#667085',
              letterSpacing: '0.5px',
            }}
          >
            {xLabel}
          </div>
        )}

        {/* Tooltip */}
        {hover !== null && (
          <div
            className="chart-tooltip"
            style={{
              left: `clamp(84px, ${(valueX(totals[hover]) / width) * 100}%, calc(100% - 84px))`,
              top: Math.max(
                4,
                top + hover * rowHeight + rowHeight / 2 - 30
              ),
              transform: 'translateX(-50%)',
            }}
          >
            <div className="tt-title">{labels[hover]}</div>

            {series.map((s, si) => {
              const value = s.values[hover];
              if (value === null || value === undefined) return null;

              return (
                <div className="tt-row" key={`tt-${si}`}>
                  <span
                    className="tt-dot"
                    style={{ background: seriesColor(s.label, si) }}
                  />
                  <span className="tt-name">{s.label}</span>
                  <span className="tt-val">
                    {value.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              );
            })}

            <div
              className="tt-row"
              style={{
                borderTop: '1px solid rgba(255, 255, 255, 0.18)',
                marginTop: 5,
                paddingTop: 5,
              }}
            >
              <span className="tt-dot" style={{ background: '#cbd5e1' }} />
              <span className="tt-name">Total</span>
              <span className="tt-val">
                {totals[hover].toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="chart-legend">
        {series.map((s, i) => (
          <span key={`lg-${i}`} className="legend-item">
            <i
              className="legend-color"
              style={{ background: seriesColor(s.label, i) }}
            />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
