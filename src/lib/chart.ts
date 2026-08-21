/* Shared helpers for the dashboard chart components. */

export const chartPalette = [
  '#059669',
  '#2563eb',
  '#ea580c',
  '#9333ea',
  '#0891b2',
  '#dc2626',
];

/** Semantic colors for the well-known series, else palette by index. */
export function seriesColor(label: string, index: number) {
  if (label === 'Scope 1') return '#ea580c';
  if (label === 'Scope 2') return '#2563eb';
  if (label === 'Total') return '#059669';
  return chartPalette[index % chartPalette.length];
}

/** Round a positive number up to a "nice" chart maximum (1/2/2.5/5 × 10^n). */
export function niceCeil(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const base = Math.pow(10, exp);
  const frac = value / base;
  const nice =
    frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10;
  return nice * base;
}

/**
 * Y-axis domain top so the highest value sits ~8% below the top of the
 * plotting area (within the 5-10% target), rounded to 2 significant
 * figures so the ticks stay readable. Adapts to every chart's data.
 */
export function plotMaxFor(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const target = value / 0.92;
  const exp = Math.pow(10, Math.floor(Math.log10(target)) - 1);
  return Math.round(target / exp) * exp;
}

/** Compact axis labels: 1.2M / 340K / 86 / 3.5 */
export function formatCompact(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  if (value >= 100) return value.toFixed(0);
  return value.toFixed(1);
}
