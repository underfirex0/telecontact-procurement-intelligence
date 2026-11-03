/** Consistent, locale-aware formatting for currency (MAD), dates, percentages and counts. */
import { getLang } from "./i18n";

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const fr = () => getLang() === "fr";
const months = () => (fr() ? MONTHS_FR : MONTHS_EN);
const loc = () => (fr() ? "fr-FR" : "en-US");
/** decimal separator for compact figures */
const dec = (s: string) => (fr() ? s.replace(".", ",") : s);

export function mad(v: number | null | undefined, opts: { compact?: boolean; unit?: boolean } = {}): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const { compact = true, unit = true } = opts;
  let s: string;
  if (compact && Math.abs(v) >= 1_000_000_000) s = dec((v / 1_000_000_000).toFixed(2)) + (fr() ? " Md" : "B");
  else if (compact && Math.abs(v) >= 1_000_000) s = dec((v / 1_000_000).toFixed(v >= 10_000_000 ? 1 : 2)) + (fr() ? " M" : "M");
  else if (compact && Math.abs(v) >= 10_000) s = Math.round(v / 1000) + (fr() ? " k" : "k");
  else s = Math.round(v).toLocaleString(loc());
  return unit ? `${s} MAD` : s;
}
export function madFull(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `${Math.round(v).toLocaleString("en-US").replace(/,/g, "\u202f")} MAD`;
}
/** Locale-aware integer / decimal formatting for counts in sentences. */
export function int(v: number): string {
  return v.toLocaleString(loc());
}
export function fixed(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined) return "—";
  return dec(v.toFixed(digits));
}
export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString(fr() ? "fr-FR" : "en-GB");
}
export function date(d: string | null | undefined): string {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${Number(day)} ${months()[Number(m) - 1]} ${y}`;
}
export function shortDate(d: string | null | undefined): string {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day} ${months()[Number(m) - 1]} ${y.slice(2)}`;
}
export function monthLabel(k: string): string {
  const [y, m] = k.split("-");
  return `${months()[Number(m) - 1]} ${y.slice(2)}`;
}
export function pct(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return fr() ? `${dec((v * 100).toFixed(digits))} %` : `${(v * 100).toFixed(digits)}%`;
}
export function signedPct(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `${v > 0 ? "+" : ""}${Math.round(v * 100)}${fr() ? " %" : "%"}`;
}
export function num(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return v.toLocaleString(loc(), { maximumFractionDigits: digits, minimumFractionDigits: digits });
}
export function plural(n: number, word: string, pluralWord = word + "s"): string {
  return `${n.toLocaleString(loc())} ${n === 1 ? word : pluralWord}`;
}
export function period(from: string, to: string): string {
  return `${shortDate(from)} – ${shortDate(to)}`;
}
/** Quarter key "2025-Q3" → "2025 Q3" (en) / "T3 2025" (fr). */
export function quarter(k: string): string {
  const [y, q] = k.split("-");
  return fr() ? `${q.replace("Q", "T")} ${y}` : `${y} ${q}`;
}
