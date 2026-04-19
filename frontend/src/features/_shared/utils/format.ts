/**
 * Numeric formatting helpers shared across analysis / comparison / sources /
 * topics features. Keep this stateless and dependency-free.
 */

export function fmtCompact(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

export function fmtPercent(n: number | null | undefined, fractionDigits = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "0%";
  return `${n.toFixed(fractionDigits)}%`;
}

export function fmtSignedPercent(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export function safeArray<T>(x: T[] | undefined | null): T[] {
  return Array.isArray(x) ? x : [];
}

/**
 * Coerce any value to a finite number. Critical for ECharts `series[].data`
 * arrays — the animation interpolator (`zrender/Animator.interpolate1DArray`)
 * crashes with "Cannot read properties of undefined (reading 'length')"
 * when it encounters `undefined` / `NaN` between two valid frames.
 *
 * Use anywhere a chart data point is read from a partial / loosely-typed
 * API response.
 */
export function num(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Coerce any value to a non-null string (default ""). */
export function str(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  return String(value);
}
