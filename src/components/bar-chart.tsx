'use client';

import { useMemo, useState } from 'react';
import { niceCeil, seriesColor, formatCompact } from '@/lib/chart';

type BarSeries = {
  label: string;
  values: (number | null)[];
};

type BarChartProps = {
  /** Group labels along the x-axis, e.g. years. */
  labels: string[];
  /** One series per bar within each group, e.g. Scope 1 / Scope 2. */
  series: BarSeries[];
  height?: number;
  /** Stack the series into one bar per group (default: side-by-side). */
  stacked?: boolean;
  /** Label under the x-axis, e.g. "Year". */
  xLabel?: string;
  /** Label along the y-axis, e.g. "tCO₂e". */
  yLabel?: string;
};

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

export function BarChart({
  labels,
  series,
  height = 300,
  stacked = false,
  xLabel,
  yLabel,
}: BarChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  const allValues = useMemo(
    () =>
      series.flatMap((item) =>
        item.values.filter((value): value is number => value !== null)
      ),
    [series]
  );

  const groupTotals = useMemo(
    () =>
      labels.map((_, groupIndex) =>
        series.reduce((sum, item) => {
          const value = item.values[groupIndex];
          return sum + (typeof value === 'number' ? value : 0);
        }, 0)
      ),
    [labels, series]
  );

  const maxSource = stacked
    ? Math.max(...groupTotals, 0)
    : Math.max(...allValues, 0);

  const max = niceCeil(maxSource);
  const min = 0;

  const width = 1000;
  const left = 58;
  const right = 18;
  const top = 32;
  const bottom = 6;

  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const groupCount = labels.length;

  const groupWidth = groupCount > 0 ? chartWidth / groupCount : chartWidth;
  const innerWidth = Math.min(groupWidth * 0.64, 90);
  const barWidth =
    series.length > 0 ? innerWidth / series.length : innerWidth;

  const y = (value: number) =>
    top + chartHeight - ((value - min) / (max - min || 1)) * chartHeight;

  const isEmpty = allValues.length === 0;

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

  const hoverValues =
    hover !== null ? series.map((item) => item.values[hover] ?? null) : [];

  const topmostY =
    hover !== null
      ? stacked
        ? y(groupTotals[hover] ?? 0)
        : Math.min(
            ...hoverValues
              .filter((v): v is number => v !== null)
              .map((v) => y(v))
          )
      : null;

  const tooltipTop = topmostY !== null ? Math.max(8, topmostY - 64) : 8;

  const groupCenterX =
    hover !== null ? left + (hover + 0.5) * groupWidth : left;

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
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const gridY = top + chartHeight * (1 - ratio);
            const gridValue = max * ratio;

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

          {/* Groups */}
          {labels.map((label, groupIndex) => {
            const groupX = left + groupIndex * groupWidth;
            const active = hover === groupIndex;

            if (stacked) {
              const stackWidth = Math.min(groupWidth * 0.5, 64);
              const stackX = groupX + (groupWidth - stackWidth) / 2;

              // Build segments bottom-up (series order).
              const segments: {
                value: number;
                segH: number;
                segY: number;
                color: string;
                inset: number;
                top: boolean;
              }[] = [];

              let offset = 0;

              series.forEach((item, seriesIndex) => {
                const value = item.values[groupIndex];

                if (value === null) return;

                const segH =
                  ((value - min) / (max - min || 1)) * chartHeight;

                segments.push({
                  value,
                  segH,
                  segY: top + chartHeight - offset - segH,
                  color: seriesColor(item.label, seriesIndex),
                  inset: offset > 0 ? 1.5 : 0,
                  top: false,
                });

                offset += segH;
              });

              if (segments.length > 0) {
                segments[segments.length - 1].top = true;
              }

              return (
                <g key={label}>
                  {segments.map((segment, segmentIndex) => {
                    const drawH = Math.max(segment.segH - segment.inset, 0);
                    const drawY = segment.segY + segment.inset;

                    return (
                      <path
                        key={segmentIndex}
                        d={barPath(
                          stackX,
                          drawY,
                          stackWidth,
                          drawH,
                          segment.top ? 4 : 0
                        )}
                        fill={segment.color}
                        opacity={active ? 1 : 0.85}
                        style={{ transition: 'opacity 0.12s ease' }}
                      />
                    );
                  })}

                  {/* Group hit area */}
                  <rect
                    x={groupX}
                    y={top}
                    width={groupWidth}
                    height={chartHeight}
                    fill="transparent"
                    style={{ pointerEvents: 'all', cursor: 'crosshair' }}
                    onMouseEnter={() => setHover(groupIndex)}
                    onMouseLeave={() => setHover(null)}
                  />
                </g>
              );
            }

            const setStart = groupX + (groupWidth - innerWidth) / 2;

            return (
              <g key={label}>
                {series.map((item, seriesIndex) => {
                  const value = item.values[groupIndex];

                  if (value === null) return null;

                  const barX = setStart + seriesIndex * barWidth;
                  const barH =
                    ((value - min) / (max - min || 1)) * chartHeight;
                  const barY = top + chartHeight - barH;
                  const color = seriesColor(item.label, seriesIndex);

                  return (
                    <g key={item.label}>
                      <path
                        d={barPath(barX, barY, barWidth, barH, 4)}
                        fill={color}
                        opacity={active ? 1 : 0.82}
                        style={{ transition: 'opacity 0.12s ease' }}
                      />
                    </g>
                  );
                })}

                {/* Group hit area */}
                <rect
                  x={groupX}
                  y={top}
                  width={groupWidth}
                  height={chartHeight}
                  fill="transparent"
                  style={{ pointerEvents: 'all', cursor: 'crosshair' }}
                  onMouseEnter={() => setHover(groupIndex)}
                  onMouseLeave={() => setHover(null)}
                />
              </g>
            );
          })}

          {/* Crosshair */}
          {hover !== null && (
            <line
              x1={groupCenterX}
              x2={groupCenterX}
              y1={top}
              y2={top + chartHeight}
              stroke="#98a2b3"
              strokeWidth="1"
              strokeDasharray="3,3"
              opacity="0.6"
            />
          )}
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
                top: labelY - 7,
                width: left - 14,
                textAlign: 'right',
                fontSize: 10.5,
                color: '#667085',
                fontWeight: 500,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
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
          {labels.map((label, index) => (
            <span key={`${label}-${index}`}>{label}</span>
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
        {hover !== null && (
          <div
            className="chart-tooltip"
            style={{
              left: `clamp(84px, ${(groupCenterX / width) * 100}%, calc(100% - 84px))`,
              top: tooltipTop,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="tt-title">{labels[hover]}</div>

            {series.map((item, seriesIndex) => {
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

            {stacked && groupTotals[hover] > 0 && (
              <div
                className="tt-row"
                style={{
                  borderTop: '1px solid rgba(255, 255, 255, 0.18)',
                  marginTop: 5,
                  paddingTop: 5,
                }}
              >
                <span
                  className="tt-dot"
                  style={{ background: '#cbd5e1' }}
                />
                <span className="tt-name">Total</span>
                <span className="tt-val">
                  {groupTotals[hover].toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      {series.length > 0 && (
        <div className="chart-legend">
          {series.map((item, index) => (
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
