'use client';

import { useMemo, useState } from 'react';
import { plotMaxFor, formatCompact } from '@/lib/chart';

type Series = { label: string; values: (number | null)[] };

type ComboChartProps = {
  /** Group labels along the x-axis, e.g. months. */
  labels: string[];
  /** Rendered as clustered columns (left axis), e.g. one per year of Electricity. */
  barSeries: Series[];
  /** Rendered as lines (right axis), e.g. one per year of Solar. */
  lineSeries: Series[];
  /** Rotated title on the left axis (bar family), e.g. "Electricity". */
  barAxisLabel?: string;
  /** Rotated title on the right axis (line family), e.g. "Solar". */
  lineAxisLabel?: string;
  height?: number;
  xLabel?: string;
};

const BAR_COLORS = ['#059669', '#2563eb', '#10b981', '#1e40af'];
const LINE_COLORS = ['#f97316', '#7c3aed', '#dc2626', '#db2777'];

/** Rounded-top bar path. */
function barPath(x: number, yTop: number, w: number, h: number, r: number) {
  if (h <= 0) return '';
  const rr = Math.min(r, w / 2, h);
  return [
    `M ${x} ${yTop + h}`,
    `L ${x} ${yTop + rr}`,
    `Q ${x} ${yTop} ${x + rr} ${yTop}`,
    `L ${x + w - rr} ${yTop}`,
    `Q ${x + w} ${yTop} ${x + w} ${yTop + rr}`,
    `L ${x + w} ${yTop + h}`,
    'Z',
  ].join(' ');
}

type Point = { x: number; y: number };

function smoothPath(points: Point[]) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }

  return d;
}

function createSegments(values: (number | null)[]) {
  const segments: number[][] = [];
  let current: number[] = [];

  values.forEach((value, index) => {
    if (value === null) {
      if (current.length > 0) {
        segments.push(current);
        current = [];
      }
    } else {
      current.push(index);
    }
  });

  if (current.length > 0) segments.push(current);

  return segments;
}

export function ComboChart({
  labels,
  barSeries,
  lineSeries,
  barAxisLabel,
  lineAxisLabel,
  height = 300,
  xLabel,
}: ComboChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  const anyValue = useMemo(
    () =>
      [...barSeries, ...lineSeries].some((s) =>
        s.values.some((v): v is number => v !== null)
      ),
    [barSeries, lineSeries]
  );

  const finiteMax = (series: Series[]) =>
    Math.max(
      0,
      ...series.flatMap((s) =>
        s.values.filter((v): v is number => v !== null)
      )
    );

  const barMax = plotMaxFor(finiteMax(barSeries));
  const lineMax = plotMaxFor(finiteMax(lineSeries));

  const width = 1000;
  const left = 78;
  const right = 84;
  const top = 26;
  const bottom = 6;

  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const groupCount = labels.length;
  const groupWidth = groupCount > 0 ? chartWidth / groupCount : chartWidth;

  const x = (index: number) => left + (index + 0.5) * groupWidth;

  const yBar = (value: number) =>
    top + chartHeight - ((value - 0) / (barMax || 1)) * chartHeight;

  const yLine = (value: number) =>
    top + chartHeight - ((value - 0) / (lineMax || 1)) * chartHeight;

  const rightAxisPct = ((width - right) / width) * 100;

  const isEmpty = !anyValue;

  if (isEmpty) {
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

  const ratios = [0, 0.25, 0.5, 0.75, 1];

  const barColors = barSeries.map((_, i) => BAR_COLORS[i % BAR_COLORS.length]);
  const lineColors = lineSeries.map((_, i) => LINE_COLORS[i % LINE_COLORS.length]);
  const barAxisColor = '#667085';
  const lineAxisColor = '#667085';
  const barShort = barAxisLabel
    ? barAxisLabel.replace(/\s*\([^)]*\)\s*$/, '')
    : 'Bar';
  const lineShort = lineAxisLabel
    ? lineAxisLabel.replace(/\s*\([^)]*\)\s*$/, '')
    : 'Line';

  return (
    <div className="chart-container">
      <div
        style={{
          position: 'relative',
          height: height + 40,
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
          <defs>
            {lineSeries.map((_, i) => (
              <linearGradient
                key={`combo-line-grad-${i}`}
                id={`combo-line-grad-${i}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={lineColors[i]}
                  stopOpacity="0.16"
                />
                <stop offset="100%" stopColor={lineColors[i]} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {/* Grid lines (left / bar scale) */}
          {ratios.map((ratio) => {
            const gridY = top + chartHeight * (1 - ratio);

            return (
              <line
                key={ratio}
                x1={left}
                x2={width - right}
                y1={gridY}
                y2={gridY}
                stroke={ratio === 1 ? '#c9d2ce' : '#e5e8ec'}
                strokeWidth="1"
                strokeDasharray={ratio === 1 ? '0' : '3,4'}
              />
            );
          })}

          {/* Baseline */}
          <line
            x1={left}
            x2={width - right}
            y1={top + chartHeight}
            y2={top + chartHeight}
            stroke="#c9d2ce"
            strokeWidth="1"
          />

          {/* Left Y-axis line */}
          <line
            x1={left}
            x2={left}
            y1={top}
            y2={top + chartHeight}
            stroke="#c9d2ce"
            strokeWidth="1"
          />

          {/* Right Y-axis line */}
          <line
            x1={width - right}
            x2={width - right}
            y1={top}
            y2={top + chartHeight}
            stroke="#c9d2ce"
            strokeWidth="1"
          />

          {/* Columns (electricity, left axis) */}
          {labels.map((label, index) => {
            const active = hover === index;
            const hasAny = barSeries.some(
              (s) => s.values[index] !== null
            );

            if (!hasAny) return null;

            // Reserve a fixed slot per series so a bar keeps its size and
            // position even when the comparison year has no data for this month.
            const nSlots = Math.max(barSeries.length, 1);
            const setWidth = Math.min(groupWidth * 0.62, 46);
            const w = setWidth / nSlots;

            return (
              <g key={`grp-${label}`}>
                {barSeries.map((s, si) => {
                  const value = s.values[index];
                  if (value === null) return null;

                  const barY = yBar(value);
                  const barH = top + chartHeight - barY;
                  const bx = x(index) - setWidth / 2 + si * w;

                  return (
                    <path
                      key={`bar-${label}-${si}`}
                      d={barPath(bx, barY, w - 1, barH, 3)}
                      fill={barColors[si]}
                      opacity={active ? 1 : 0.85}
                      style={{ transition: 'opacity 0.12s ease' }}
                    />
                  );
                })}
              </g>
            );
          })}

          {/* Lines (solar, right axis) */}
          {lineSeries.map((s, si) => (
            <g key={`series-${si}`}>
              {createSegments(s.values).map((indexes, segmentIndex) => {
                const pts = indexes.map((i) => ({
                  x: x(i),
                  y: yLine(s.values[i]!),
                }));
                const d = smoothPath(pts);

                return (
                  <g key={`seg-${segmentIndex}`}>
                    <path
                      d={`${d} L ${pts[pts.length - 1].x} ${
                        top + chartHeight
                      } L ${pts[0].x} ${top + chartHeight} Z`}
                      fill={`url(#combo-line-grad-${si})`}
                    />
                    <path
                      d={d}
                      fill="none"
                      stroke={lineColors[si]}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                );
              })}
            </g>
          ))}

          {/* Dots */}
          {lineSeries.map((s, si) =>
            s.values.map((value, index) => {
              if (value === null) return null;
              const active = hover === index;
              return (
                <circle
                  key={`dot-${si}-${index}`}
                  cx={x(index)}
                  cy={yLine(value)}
                  r={active ? 5.5 : 3}
                  fill={active ? lineColors[si] : '#ffffff'}
                  stroke={lineColors[si]}
                  strokeWidth={active ? 2.5 : 1.8}
                />
              );
            })
          )}

          {/* Crosshair */}
          {hover !== null && (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={top}
              y2={top + chartHeight}
              stroke="#98a2b3"
              strokeWidth="1"
              strokeDasharray="3,3"
              opacity="0.8"
            />
          )}

          {/* Hit area */}
          <rect
            x={left}
            y={top}
            width={chartWidth}
            height={chartHeight}
            fill="transparent"
            style={{ pointerEvents: 'all', cursor: 'crosshair' }}
            onMouseMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const ratio = (event.clientX - rect.left) / rect.width;
              const index = Math.round(ratio * (groupCount - 1));
              setHover(Math.min(Math.max(index, 0), groupCount - 1));
            }}
            onMouseLeave={() => setHover(null)}
          />
        </svg>

        {/* Left Y-axis tick labels (bar scale) */}
        {ratios.map((ratio) => {
          const labelY = top + chartHeight * (1 - ratio);

          return (
            <div
              key={`l-${ratio}`}
              style={{
                position: 'absolute',
                left: 22,
                right: `calc(${((width - left) / width) * 100}% + 8px)`,
                top: labelY - 7,
                textAlign: 'right',
                fontSize: 12.5,
                color: '#667085',
                fontWeight: 500,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {formatCompact(barMax * ratio)}
            </div>
          );
        })}

        {/* Right Y-axis tick labels (line scale) */}
        {ratios.map((ratio) => {
          const labelY = top + chartHeight * (1 - ratio);

          return (
            <div
              key={`r-${ratio}`}
              style={{
                position: 'absolute',
                left: `calc(${rightAxisPct}% + 8px)`,
                right: 24,
                top: labelY - 7,
                textAlign: 'left',
                fontSize: 12.5,
                color: '#667085',
                fontWeight: 500,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {formatCompact(lineMax * ratio)}
            </div>
          );
        })}

        {/* X-axis labels */}
        {labels.map((label, index) => {
          const cx = x(index);

          return (
            <div
              key={`${label}-${index}`}
              style={{
                position: 'absolute',
                left: `${(cx / width) * 100}%`,
                top: height,
                transform: 'translateX(-50%)',
                paddingTop: 8,
                fontSize: 12.5,
                color: '#667085',
                fontWeight: 500,
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </div>
          );
        })}

        {/* Left axis title (bar family) */}
        {barAxisLabel && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 24,
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
                fontWeight: 700,
                color: barAxisColor,
                letterSpacing: '0.3px',
              }}
            >
              {barAxisLabel}
            </span>
          </div>
        )}

        {/* Right axis title (line family) */}
        {lineAxisLabel && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 24,
              width: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                transform: 'rotate(90deg)',
                whiteSpace: 'nowrap',
                fontSize: 12,
                fontWeight: 700,
                color: lineAxisColor,
                letterSpacing: '0.3px',
              }}
            >
              {lineAxisLabel}
            </span>
          </div>
        )}

        {/* X-axis label */}
        {xLabel && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: height + 26,
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
              left: `clamp(84px, ${(x(hover) / width) * 100}%, calc(100% - 84px))`,
              top: 8,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="tt-title">{labels[hover]}</div>

            {barSeries.map((s, si) => {
              const value = s.values[hover];
              if (value === null) return null;
              return (
                <div className="tt-row" key={`b-${si}`}>
                  <span
                    className="tt-dot"
                    style={{ background: barColors[si] }}
                  />
                  <span className="tt-name">
                    {barShort} · {s.label}
                  </span>
                  <span className="tt-val">
                    {value.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
              );
            })}

            {lineSeries.map((s, si) => {
              const value = s.values[hover];
              if (value === null) return null;
              return (
                <div className="tt-row" key={`l-${si}`}>
                  <span
                    className="tt-dot"
                    style={{ background: lineColors[si] }}
                  />
                  <span className="tt-name">
                    {lineShort} · {s.label}
                  </span>
                  <span className="tt-val">
                    {value.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="chart-legend">
        {barSeries.map((s, i) => (
          <span key={`lg-b-${i}`} className="legend-item">
            <i
              className="legend-color"
              style={{ background: barColors[i] }}
            />
            {barShort} · {s.label}
          </span>
        ))}
        {lineSeries.map((s, i) => (
          <span key={`lg-l-${i}`} className="legend-item">
            <i
              className="legend-color"
              style={{ background: lineColors[i] }}
            />
            {lineShort} · {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
