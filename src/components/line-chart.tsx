'use client';

import { useMemo, useState } from 'react';
import { niceCeil, seriesColor, formatCompact } from '@/lib/chart';

type Series = {
  label: string;
  values: (number | null)[];
};

type LineChartProps = {
  series?: Series[];
  values?: (number | null)[];
  label?: string;
  labels?: string[];
  height?: number;
  /** Label under the x-axis, e.g. "Month". */
  xLabel?: string;
  /** Label along the y-axis, e.g. "tCO₂e". */
  yLabel?: string;
};

const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

type Point = { x: number; y: number };

/** Catmull-Rom → cubic Bezier, so lines curve smoothly through points. */
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

export function LineChart({
  series,
  values,
  label,
  labels,
  height = 300,
  xLabel,
  yLabel,
}: LineChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  const chartSeries = useMemo<Series[]>(
    () =>
      series ??
      (values ? [{ label: label ?? '', values }] : []),
    [series, values, label]
  );

  const axisLabels = labels ?? months;
  const pointCount = axisLabels.length;

  const allValues = useMemo(
    () =>
      chartSeries.flatMap((item) =>
        item.values.filter(
          (value): value is number => value !== null
        )
      ),
    [chartSeries]
  );

  const rawMax = Math.max(...allValues, 0);
  const max = niceCeil(rawMax);
  const min = 0;

  const width = 1000;
  const left = 78;
  const right = 18;
  const top = 26;
  const bottom = 6;

  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;

  const x = (index: number) =>
    left + (index * chartWidth) / Math.max(pointCount - 1, 1);

  const y = (value: number) =>
    top + chartHeight - ((value - min) / (max - min || 1)) * chartHeight;

  function createSegments(seriesValues: (number | null)[]) {
    const segments: number[][] = [];
    let current: number[] = [];

    seriesValues.forEach((value, index) => {
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

  const isEmpty = allValues.length === 0;

  const hoverValues =
    hover !== null
      ? chartSeries.map((item) => item.values[hover] ?? null)
      : [];

  const topmostHoverY =
    hover !== null && hoverValues.some((v) => v !== null)
      ? Math.min(
          ...hoverValues
            .filter((v): v is number => v !== null)
            .map((v) => y(v))
        )
      : null;

  const hasHoverValue = hoverValues.some((v) => v !== null);

  const tooltipTop =
    topmostHoverY !== null ? Math.max(8, topmostHoverY - 64) : 8;

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
            {chartSeries.map((item, seriesIndex) => {
              const color = seriesColor(item.label, seriesIndex);
              const id = `grad-${seriesIndex}-${item.label.replace(
                /[^a-zA-Z0-9]/g,
                '-'
              )}`;

              return (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.16" />
                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
              );
            })}
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
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

          {/* Y-axis line */}
          <line
            x1={left}
            x2={left}
            y1={top}
            y2={top + chartHeight}
            stroke="#c9d2ce"
            strokeWidth="1"
          />

          {/* Series */}
          {chartSeries.map((item, seriesIndex) => {
            const color = seriesColor(item.label, seriesIndex);
            const gradientId = `grad-${seriesIndex}-${item.label.replace(
              /[^a-zA-Z0-9]/g,
              '-'
            )}`;
            const segments = createSegments(item.values);

            return (
              <g key={item.label}>
                {/* Area fill */}
                {segments.map((indexes, segmentIndex) => {
                  if (indexes.length === 0) return null;

                  const linePath = smoothPath(
                    indexes.map((i) => ({
                      x: x(i),
                      y: y(item.values[i]!),
                    }))
                  );

                  const areaPath = `${linePath} L ${x(
                    indexes[indexes.length - 1]
                  )} ${top + chartHeight} L ${x(indexes[0])} ${
                    top + chartHeight
                  } Z`;

                  return (
                    <path
                      key={`area-${segmentIndex}`}
                      d={areaPath}
                      fill={`url(#${gradientId})`}
                    />
                  );
                })}

                {/* Line */}
                {segments.map((indexes, segmentIndex) => (
                  <path
                    key={`line-${segmentIndex}`}
                    d={smoothPath(
                      indexes.map((i) => ({
                        x: x(i),
                        y: y(item.values[i]!),
                      }))
                    )}
                    fill="none"
                    stroke={color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}

                {/* Data points */}
                {item.values.map((value, index) => {
                  if (value === null) return null;

                  const active = hover === index;

                  return (
                    <circle
                      key={`dot-${index}`}
                      cx={x(index)}
                      cy={y(value)}
                      r={active ? 5.5 : 3}
                      fill={active ? color : '#ffffff'}
                      stroke={color}
                      strokeWidth={active ? 2.5 : 1.8}
                    />
                  );
                })}
              </g>
            );
          })}

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
              const index = Math.round(ratio * (pointCount - 1));
              setHover(Math.min(Math.max(index, 0), pointCount - 1));
            }}
            onMouseLeave={() => setHover(null)}
          />
        </svg>

        {/* Y-axis labels (HTML, crisp) */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const labelY = top + chartHeight * (1 - ratio);

          return (
            <div
              key={`y-${ratio}`}
              style={{
                position: 'absolute',
                left: 18,
                right: `calc(${((width - left) / width) * 100}% + 8px)`,
                top: labelY - 7,
                textAlign: 'right',
                fontSize: 10.5,
                color: '#667085',
                fontWeight: 500,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {formatCompact(max * ratio)}
            </div>
          );
        })}

        {/* X-axis labels (HTML, crisp) */}
        <div
          style={{
            position: 'absolute',
            left: `${(left / width) * 100}%`,
            right: `${(right / width) * 100}%`,
            top: height,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10.5,
            color: '#667085',
            fontWeight: 500,
            paddingTop: 8,
          }}
        >
          {axisLabels.map((axisLabel, index) => (
            <span key={`${axisLabel}-${index}`}>{axisLabel}</span>
          ))}
        </div>

        {/* Y-axis label */}
        {yLabel && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 24,
              width: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                transform: 'rotate(-90deg)',
                whiteSpace: 'nowrap',
                fontSize: 10,
                fontWeight: 600,
                color: '#667085',
                letterSpacing: '0.4px',
              }}
            >
              {yLabel}
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
              fontSize: 10,
              fontWeight: 600,
              color: '#667085',
              letterSpacing: '0.5px',
            }}
          >
            {xLabel}
          </div>
        )}

        {/* Tooltip */}
        {hover !== null && hasHoverValue && (
          <div
            className="chart-tooltip"
            style={{
              left: `clamp(84px, ${(x(hover) / width) * 100}%, calc(100% - 84px))`,
              top: tooltipTop,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="tt-title">{axisLabels[hover]}</div>

            {chartSeries.map((item, seriesIndex) => {
              const value = item.values[hover];

              if (value === null) return null;

              return (
                <div className="tt-row" key={item.label}>
                  <span
                    className="tt-dot"
                    style={{
                      background: seriesColor(item.label, seriesIndex),
                    }}
                  />
                  <span className="tt-name">{item.label}</span>
                  <span className="tt-val">
                    {value.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      {chartSeries.length > 0 && (
        <div className="chart-legend">
          {chartSeries.map((item, index) => (
            <span key={item.label} className="legend-item">
              <i
                className="legend-color"
                style={{ background: seriesColor(item.label, index) }}
              />
              {item.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
