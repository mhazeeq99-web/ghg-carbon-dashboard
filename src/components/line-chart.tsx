'use client';

type Series = {
  label: string;
  values: (number | null)[];
};

type LineChartProps = {
  // New multi-series API
  series?: Series[];

  // Existing single-series API
  values?: number[];
  label?: string;

  // Optional custom X-axis labels
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
  /*
   * Support both:
   *
   * <LineChart values={...} label="Diesel" />
   *
   * and
   *
   * <LineChart series={[...]} />
   */
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

  const axisLabels =
    labels ??
    months;

  const pointCount = axisLabels.length;

  const allValues = chartSeries.flatMap((item) =>
    item.values.filter(
      (value): value is number => value !== null
    )
  );

  const max = Math.max(...allValues, 1);
  const min = 0;

  const width = 1000;
  const left = 55;
  const right = 20;
  const top = 20;
  const bottom = 42;

  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;

  const x = (index: number) =>
    left +
    (index * chartWidth) /
      Math.max(pointCount - 1, 1);

  const y = (value: number) =>
    top +
    chartHeight -
    ((value - min) /
      (max - min || 1)) *
      chartHeight;

  function createSegments(
    seriesValues: (number | null)[]
  ) {
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

  function createPath(
    seriesValues: (number | null)[],
    indexes: number[]
  ) {
    return indexes
      .map((index, pointIndex) => {
        const value = seriesValues[index]!;

        return `${
          pointIndex === 0 ? 'M' : 'L'
        } ${x(index)} ${y(value)}`;
      })
      .join(' ');
  }

  /*
   * Keep colours deterministic between charts.
   */
  const colors = [
    '#0b6b4f',
    '#2563eb',
    '#9333ea',
    '#ea580c',
    '#dc2626',
    '#0891b2',
  ];

  return (
    <div className="chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{
          width: '100%',
          height: `${height}px`,
          overflow: 'visible',
        }}
      >
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(
          (ratio) => {
            const gridY =
              top +
              chartHeight * (1 - ratio);

            return (
              <g key={ratio}>
                <line
                  x1={left}
                  x2={width - right}
                  y1={gridY}
                  y2={gridY}
                  stroke="#eef1f2"
                />

                <text
                  x={left - 8}
                  y={gridY + 4}
                  fontSize="10"
                  fill="#69757d"
                  textAnchor="end"
                >
                  {(max * ratio).toFixed(0)}
                </text>
              </g>
            );
          }
        )}

        {/* Series */}
        {chartSeries.map(
          (item, seriesIndex) => {
            const color =
              colors[
                seriesIndex % colors.length
              ];

            const segments = createSegments(
              item.values
            );

            return (
              <g key={item.label}>
                {segments.map(
                  (indexes, segmentIndex) => (
                    <path
                      key={segmentIndex}
                      d={createPath(
                        item.values,
                        indexes
                      )}
                      fill="none"
                      stroke={color}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )
                )}

                {item.values.map(
                  (value, index) => {
                    if (value === null) {
                      return null;
                    }

                    return (
                      <circle
                        key={index}
                        cx={x(index)}
                        cy={y(value)}
                        r="3"
                        fill={color}
                      />
                    );
                  }
                )}
              </g>
            );
          }
        )}

        {/* X-axis labels */}
        {axisLabels.map(
          (axisLabel, index) => (
            <text
              key={`${axisLabel}-${index}`}
              x={x(index)}
              y={height - 12}
              fontSize="10"
              fill="#69757d"
              textAnchor="middle"
            >
              {axisLabel}
            </text>
          )
        )}
      </svg>

      {/* Legend */}
      {chartSeries.length > 0 && (
        <div
          className="legend"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '14px',
            marginTop: '6px',
          }}
        >
          {chartSeries.map(
            (item, index) => (
              <span key={item.label}>
                <i
                  className="dot"
                  style={{
                    background:
                      colors[
                        index %
                          colors.length
                      ],
                  }}
                />
                {item.label}
              </span>
            )
          )}
        </div>
      )}
    </div>
  );
}
