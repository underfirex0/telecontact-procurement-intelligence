import type { ISODate } from "./types";

const DAY = 86_400_000;

export function toDate(d: ISODate): Date {
  return new Date(d + "T00:00:00Z");
}
export function toISO(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}
export function addDays(d: ISODate, n: number): ISODate {
  return toISO(new Date(toDate(d).getTime() + n * DAY));
}
export function addMonths(d: ISODate, n: number): ISODate {
  const dt = toDate(d);
  const day = dt.getUTCDate();
  dt.setUTCDate(1);
  dt.setUTCMonth(dt.getUTCMonth() + n);
  const last = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
  dt.setUTCDate(Math.min(day, last));
  return toISO(dt);
}
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toDate(a).getTime() - toDate(b).getTime()) / DAY);
}
export function monthKey(d: ISODate): string {
  return d.slice(0, 7);
}
export function quarterKey(d: ISODate): string {
  const m = Number(d.slice(5, 7));
  return `${d.slice(0, 4)}-Q${Math.ceil(m / 3)}`;
}
export function yearOf(d: ISODate): number {
  return Number(d.slice(0, 4));
}
export function monthsBetween(start: ISODate, end: ISODate): string[] {
  const out: string[] = [];
  let y = Number(start.slice(0, 4));
  let m = Number(start.slice(5, 7));
  const ey = Number(end.slice(0, 4));
  const em = Number(end.slice(5, 7));
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}
export function quartersBetween(start: ISODate, end: ISODate): string[] {
  const set: string[] = [];
  for (const m of monthsBetween(start, end)) {
    const q = quarterKey(m + "-01");
    if (!set.includes(q)) set.push(q);
  }
  return set;
}
export function dateFromFraction(start: ISODate, end: ISODate, f: number): ISODate {
  const s = toDate(start).getTime();
  const e = toDate(end).getTime();
  return toISO(new Date(s + Math.floor((e - s) * f / DAY) * DAY));
}
