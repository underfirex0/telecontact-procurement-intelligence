/** Consistent formatting for currency (MAD), dates, percentages and counts. */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function mad(v: number | null | undefined, opts: { compact?: boolean; unit?: boolean } = {}): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const { compact = true, unit = true } = opts;
  let s: string;
  if (compact && Math.abs(v) >= 1_000_000_000) s = (v / 1_000_000_000).toFixed(2) + "B";
  else if (compact && Math.abs(v) >= 1_000_000) s = (v / 1_000_000).toFixed(v >= 10_000_000 ? 1 : 2) + "M";
  else if (compact && Math.abs(v) >= 10_000) s = Math.round(v / 1000) + "k";
  else s = Math.round(v).toLocaleString("en-US");
  return unit ? `${s} MAD` : s;
}
export function madFull(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `${Math.round(v).toLocaleString("en-US").replace(/,/g, " ")} MAD`;
}
export function date(d: string | null | undefined): string {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${Number(day)} ${MONTHS[Number(m) - 1]} ${y}`;
}
export function shortDate(d: string | null | undefined): string {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day} ${MONTHS[Number(m) - 1]} ${y.slice(2)}`;
}
export function monthLabel(k: string): string {
  const [y, m] = k.split("-");
  return `${MONTHS[Number(m) - 1]} ${y.slice(2)}`;
}
export function pct(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return `${(v * 100).toFixed(digits)}%`;
}
export function signedPct(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `${v > 0 ? "+" : ""}${Math.round(v * 100)}%`;
}
export function num(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return v.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}
export function plural(n: number, word: string, pluralWord = word + "s"): string {
  return `${n.toLocaleString("en-US")} ${n === 1 ? word : pluralWord}`;
}
export function period(from: string, to: string): string {
  return `${shortDate(from)} – ${shortDate(to)}`;
}
