/** Deterministic statistics primitives used by every analytical module. */

export function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}
export function mean(xs: number[]): number | null {
  return xs.length ? sum(xs) / xs.length : null;
}
export function median(xs: number[]): number | null {
  return quantile(xs, 0.5);
}
export function quantile(xs: number[], q: number): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}
export function stdev(xs: number[]): number | null {
  const m = mean(xs);
  if (m === null || xs.length < 2) return null;
  return Math.sqrt(sum(xs.map((x) => (x - m) ** 2)) / (xs.length - 1));
}
/** coefficient of variation */
export function cv(xs: number[]): number | null {
  const m = mean(xs);
  const s = stdev(xs);
  return m && s !== null ? s / m : null;
}
/** median absolute deviation */
export function mad(xs: number[]): number | null {
  const m = median(xs);
  if (m === null) return null;
  return median(xs.map((x) => Math.abs(x - m)));
}
/** percentile rank of x within xs, 0–100 */
export function percentileRank(xs: number[], x: number): number | null {
  if (!xs.length) return null;
  const below = xs.filter((v) => v < x).length;
  const equal = xs.filter((v) => v === x).length;
  return ((below + 0.5 * equal) / xs.length) * 100;
}

/**
 * Herfindahl-Hirschman Index on a 0–10,000 scale.
 * Input: absolute quantities per participant (counts or values).
 */
export function hhi(quantities: number[]): number | null {
  const total = sum(quantities);
  if (!total) return null;
  return sum(quantities.map((q) => ((q / total) * 100) ** 2));
}
export function hhiBand(h: number | null): "Unconcentrated" | "Moderately concentrated" | "Highly concentrated" | "n/a" {
  if (h === null) return "n/a";
  if (h < 1500) return "Unconcentrated";
  if (h <= 2500) return "Moderately concentrated";
  return "Highly concentrated";
}
/** share (0–1) of the total held by the top n quantities */
export function topNShare(quantities: number[], n: number): number | null {
  const total = sum(quantities);
  if (!total) return null;
  return sum([...quantities].sort((a, b) => b - a).slice(0, n)) / total;
}

export function groupBy<T, K extends string | number>(rows: T[], key: (r: T) => K | null | undefined): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const r of rows) {
    const k = key(r);
    if (k === null || k === undefined) continue;
    const arr = m.get(k);
    if (arr) arr.push(r);
    else m.set(k, [r]);
  }
  return m;
}
export function countBy<T>(rows: T[], key: (r: T) => string | null | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const k = key(r);
    if (k === null || k === undefined) continue;
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}
export function pctChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return (current - previous) / previous;
}
export function ratio(a: number, b: number): number | null {
  return b ? a / b : null;
}
export function clamp(x: number, lo = 0, hi = 1): number {
  return Math.max(lo, Math.min(hi, x));
}
