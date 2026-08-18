'use client';

type Series = {
  label: string;
  values: (number | null)[];
};

type LineChartProps = {
  series?: Series[];
  values?: number[];
  label?: string;
  labels?: string[];
  height?: number;
};

const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function LineChart({
  series,
  values,
  label,
  labels,
  height = 300,
}: LineChartProps) {
  const chartSeries: Series[] =
    series ??
    (values
      ? [
          {
            label: label ?? '',
            values,
          },
        ]
      : []);

  const axisLabels = labels ?? months;
  const pointCount = axisLabels.length;

  const allValues = chartSeries.flatMap((item) =>
    item.values.filter((value): value is number => value !== null)
  );

  const max = Math.max(...allValues, 1);
  const min = 0;

  const width = 1000;
  const left = 70;
  const right = 30;
  const top = 30;
  const bottom = 50;

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

    if (current.length > 0) {
      segments.push(current);
    }

    return segments;
  }

  function createPath(seriesValues: (number | null)[], indexes: number[]) {
    return indexes
      .map((index, pointIndex) => {
        const value = seriesValues[index]!;
        return `${pointIndex === 0 ? 'M' : 'L'} ${x(index)} ${y(value)}`;
      })
      .join(' ');
  }

  function createAreaPath(seriesValues: (number | null)[], indexes: number[]) {
    if (indexes.length === 0) return '';
    
    const path = createPath(seriesValues, indexes);
    const firstIndex = indexes[0];
    const lastIndex = indexes[indexes.length - 1];
    
    return `${path} L ${x(lastIndex)} ${top + chartHeight} L ${x(firstIndex)} ${top + chartHeight} Z`;
  }

  const colors = [
    '#0b6b4f',
    '#2563eb',
    '#9333ea',
    '#ea580c',
    '#dc2626',
    '#0891b2',
  ];

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toFixed(0);
  };

  return (
    <div className="chart-container">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{
          width: '100%',
          height: `${height}px`,
          overflow: 'visible',
        }}
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const gridY = top + chartHeight * (1 - ratio);
          const gridValue = max * ratio;

          return (
            <g key={ratio}>
              <line
                x1={left}
                x2={width - right}
                y1={gridY}
                y2={gridY}
                stroke="#e5e7eb"
                strokeWidth="1"
                strokeDasharray={ratio === 1 ? '0' : '4,4'}
              />
              <text
                x={left - 12}
                y={gridY + 4}
                fontSize="11"
                fill="#6b7280"
                textAnchor="end"
                fontWeight="500"
              >
                {formatValue(gridValue)}
              </text>
            </g>
          );
        })}

        {/* Series */}
        {chartSeries.map((item, seriesIndex) => {
          const color = colors[seriesIndex % colors.length];
          const segments = createSegments(item.values);

          return (
            <g key={item.label}>
              {/* Area fill */}
              {segments.map((indexes, segmentIndex) => (
                <path
                  key={`area-${segmentIndex}`}
                  d={createAreaPath(item.values, indexes)}
                  fill={color}
                  opacity="0.05"
                />
              ))}

              {/* Line */}
              {segments.map((indexes, segmentIndex) => (
                <path
                  key={`line-${segmentIndex}`}
                  d={createPath(item.values, indexes)}
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

                return (
                  <circle
                    key={`dot-${index}`}
                    cx={x(index)}
                    cy={y(value)}
                    r="4"
                    fill="white"
                    stroke={color}
                    strokeWidth="2"
                  />
                );
              })}
            </g>
          );
        })}

        {/* X-axis labels */}
        {axisLabels.map((axisLabel, index) => (
          <text
            key={`${axisLabel}-${index}`}
            x={x(index)}
            y={height - 15}
            fontSize="11"
            fill="#6b7280"
            textAnchor="middle"
            fontWeight="500"
          >
            {axisLabel}
          </text>
        ))}
      </svg>

      {/* Legend */}
      {chartSeries.length > 0 && (
        <div
          className="chart-legend"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            marginTop: '12px',
            justifyContent: 'center',
          }}
        >
          {chartSeries.map((item, index) => (
            <span key={item.label} className="legend-item">
              <i
                className="legend-color"
                style={{
                  background: colors[index % colors.length],
                }}
              />
              {item.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}