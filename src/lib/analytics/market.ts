/**
 * Market analysis: activity over time, sector / region / buyer / procedure
 * distributions, value distribution and growth signals.
 * All functions operate on de-duplicated opportunities and accept a MarketFilter.
 */
import { addDays, addMonths, monthKey, monthsBetween, quarterKey, quartersBetween } from "../dates";
import type { Opportunity } from "../types";
import { t, tv } from "../i18n";
import { type Ctx, type MarketFilter, filterOpps, regionName, sectorName } from "./context";
import { countBy, groupBy, hhi, median, pctChange, sum, topNShare } from "./stats";

export interface Breakdown {
  key: string;
  label: string;
  count: number;
  share: number;
  totalValue: number; // sum of known estimates
  valueN: number; // records with known estimate
  medianValue: number | null;
  ids: string[];
}

export function breakdown(rows: Opportunity[], key: (o: Opportunity) => string | null, label: (k: string) => string): Breakdown[] {
  const groups = groupBy(rows, (o) => key(o) ?? "__none");
  const out: Breakdown[] = [];
  for (const [k, list] of groups) {
    const vals = list.map((o) => o.estimatedValue).filter((v): v is number => v !== null);
    out.push({ key: k, label: k === "__none" ? t("Not specified") : label(k), count: list.length, share: list.length / rows.length, totalValue: sum(vals), valueN: vals.length, medianValue: median(vals), ids: list.map((o) => o.id) });
  }
  return out.sort((a, b) => b.count - a.count);
}

export function bySector(c: Ctx, f: MarketFilter = {}) {
  return breakdown(filterOpps(c, f), (o) => o.sectorId, (k) => sectorName(c, k));
}
export function byRegion(c: Ctx, f: MarketFilter = {}) {
  return breakdown(filterOpps(c, f), (o) => o.regionId, (k) => regionName(c, k));
}
export function byBuyer(c: Ctx, f: MarketFilter = {}) {
  return breakdown(filterOpps(c, f), (o) => o.buyerId, (k) => c.buyer.get(k)?.name ?? k);
}
export function byProcedure(c: Ctx, f: MarketFilter = {}) {
  return breakdown(filterOpps(c, f), (o) => o.procedure, (k) => k);
}
export function byBuyerType(c: Ctx, f: MarketFilter = {}) {
  return breakdown(filterOpps(c, f), (o) => (o.buyerId ? c.buyer.get(o.buyerId)?.type ?? null : null), (k) => tv(k));
}

export interface TimePoint {
  period: string;
  count: number;
  value: number;
  [series: string]: number | string;
}

/** Monthly (or quarterly) publication counts, optionally split by sector for stacking. */
export function timeSeries(c: Ctx, f: MarketFilter = {}, grain: "month" | "quarter" = "month", splitBySector = false): { points: TimePoint[]; n: number; excluded: number } {
  const rows = filterOpps(c, f);
  const dated = rows.filter((o) => o.publicationDate);
  const start = f.from ?? c.ds.meta.periodStart;
  const end = f.to ?? c.ds.meta.periodEnd;
  const keys = grain === "month" ? monthsBetween(start, end) : quartersBetween(start, end);
  const kf = (d: string) => (grain === "month" ? monthKey(d) : quarterKey(d));
  const points: TimePoint[] = keys.map((k) => ({ period: k, count: 0, value: 0 }));
  const idx = new Map(points.map((p, i) => [p.period, i]));
  for (const o of dated) {
    const i = idx.get(kf(o.publicationDate!));
    if (i === undefined) continue;
    const p = points[i];
    p.count++;
    p.value += o.estimatedValue ?? 0;
    if (splitBySector) {
      const s = o.sectorId ?? "unclassified";
      p[s] = ((p[s] as number) ?? 0) + 1;
    }
  }
  return { points, n: dated.length, excluded: rows.length - dated.length };
}

export interface GrowthSignal {
  key: string;
  label: string;
  current: number; // trailing 12 months
  previous: number; // prior 12 months
  change: number | null;
  valueCurrent: number;
  valuePrevious: number;
  trend: "Rising" | "Emerging" | "Stable" | "Declining" | "Insufficient data";
  window: { currentFrom: string; currentTo: string; previousFrom: string; previousTo: string };
  ids: string[];
}

/**
 * Trailing-12-month vs prior-12-month comparison per sector (or region).
 * Minimum 6 records across both windows; a prior window with <3 records is a
 * low base and is labelled "Emerging" instead of reporting a misleading % change.
 */
export function growthSignals(c: Ctx, dim: "sector" | "region" = "sector", f: MarketFilter = {}): GrowthSignal[] {
  const end = c.ds.meta.periodEnd;
  const currentFrom = addDays(addMonths(end, -12), 1);
  const previousFrom = addDays(addMonths(end, -24), 1);
  const previousTo = addDays(currentFrom, -1);
  const rows = filterOpps(c, { ...f, from: undefined, to: undefined }).filter((o) => o.publicationDate);
  const keyOf = (o: Opportunity) => (dim === "sector" ? o.sectorId : o.regionId);
  const groups = groupBy(rows, keyOf);
  const out: GrowthSignal[] = [];
  for (const [k, list] of groups) {
    const cur = list.filter((o) => o.publicationDate! >= currentFrom && o.publicationDate! <= end);
    const prev = list.filter((o) => o.publicationDate! >= previousFrom && o.publicationDate! <= previousTo);
    const change = pctChange(cur.length, prev.length);
    let trend: GrowthSignal["trend"] = "Stable";
    if (cur.length + prev.length < 6) trend = "Insufficient data";
    else if (prev.length < 3 && cur.length > prev.length) trend = "Emerging"; // low base: % change not meaningful
    else if (change === null || change >= 0.2) trend = "Rising";
    else if (change <= -0.2) trend = "Declining";
    out.push({
      key: k, label: dim === "sector" ? sectorName(c, k) : regionName(c, k),
      current: cur.length, previous: prev.length, change,
      valueCurrent: sum(cur.map((o) => o.estimatedValue ?? 0)), valuePrevious: sum(prev.map((o) => o.estimatedValue ?? 0)),
      trend, window: { currentFrom, currentTo: end, previousFrom, previousTo },
      ids: [...cur, ...prev].map((o) => o.id),
    });
  }
  return out.sort((a, b) => (b.change ?? 9) - (a.change ?? 9));
}

export const VALUE_BANDS: { label: string; min: number; max: number }[] = [
  { label: "< 250k", min: 0, max: 250_000 },
  { label: "250k – 1M", min: 250_000, max: 1_000_000 },
  { label: "1M – 5M", min: 1_000_000, max: 5_000_000 },
  { label: "5M – 20M", min: 5_000_000, max: 20_000_000 },
  { label: "≥ 20M", min: 20_000_000, max: Infinity },
];

export function valueDistribution(c: Ctx, f: MarketFilter = {}) {
  const rows = filterOpps(c, f);
  const known = rows.filter((o) => o.estimatedValue !== null);
  const bands = VALUE_BANDS.map((b) => {
    const inBand = known.filter((o) => o.estimatedValue! >= b.min && o.estimatedValue! < b.max);
    return { ...b, count: inBand.length, value: sum(inBand.map((o) => o.estimatedValue!)), ids: inBand.map((o) => o.id) };
  });
  const vals = known.map((o) => o.estimatedValue!);
  return {
    bands,
    n: known.length,
    missing: rows.length - known.length,
    mean: vals.length ? sum(vals) / vals.length : null,
    median: median(vals),
    total: sum(vals),
    p90: vals.length ? [...vals].sort((a, b) => a - b)[Math.floor(vals.length * 0.9)] : null,
  };
}

/** Buyer × sector matrix (counts), top buyers by activity. */
export function buyerSectorMatrix(c: Ctx, f: MarketFilter = {}, topBuyers = 14) {
  const rows = filterOpps(c, f).filter((o) => o.buyerId && o.sectorId);
  const buyers = Object.entries(countBy(rows, (o) => o.buyerId)).sort((a, b) => b[1] - a[1]).slice(0, topBuyers).map(([id]) => id);
  const sectors = Object.entries(countBy(rows, (o) => o.sectorId)).sort((a, b) => b[1] - a[1]).map(([id]) => id);
  const cells: Record<string, Record<string, number>> = {};
  for (const b of buyers) cells[b] = {};
  for (const o of rows) if (cells[o.buyerId!]) cells[o.buyerId!][o.sectorId!] = (cells[o.buyerId!][o.sectorId!] ?? 0) + 1;
  const max = Math.max(1, ...buyers.flatMap((b) => Object.values(cells[b])));
  return { buyers, sectors, cells, max, n: rows.length };
}

/** Seasonality: share of publications by calendar month vs the uniform expectation. */
export function seasonality(c: Ctx, f: MarketFilter = {}) {
  const rows = filterOpps(c, f).filter((o) => o.publicationDate);
  const counts = Array.from({ length: 12 }, () => 0);
  for (const o of rows) counts[Number(o.publicationDate!.slice(5, 7)) - 1]++;
  const avg = rows.length / 12;
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m) => t(m));
  return { months: counts.map((n, i) => ({ month: names[i], count: n, index: avg ? n / avg : 0 })), n: rows.length };
}

/** Sector concentration of demand (how spread procurement is across sectors / buyers). */
export function demandConcentration(c: Ctx, f: MarketFilter = {}) {
  const rows = filterOpps(c, f);
  const bySec = Object.values(countBy(rows, (o) => o.sectorId));
  const byBuy = Object.values(countBy(rows, (o) => o.buyerId));
  return { sectorHHI: hhi(bySec), buyerHHI: hhi(byBuy), top5BuyerShare: topNShare(byBuy, 5), n: rows.length };
}

/** Headline overview figures, all derived from the records. */
export function overviewKpis(c: Ctx, f: MarketFilter = {}) {
  const rows = filterOpps(c, f);
  const ref = c.ref;
  const last30 = addDays(ref, -30);
  const active = rows.filter((o) => o.status === "Open" || o.status === "Closing soon");
  const upcoming = active.filter((o) => o.deadline && o.deadline >= ref && o.deadline <= addDays(ref, 14));
  const newOnes = rows.filter((o) => o.publicationDate && o.publicationDate > last30 && o.publicationDate <= ref);
  const ids = new Set(rows.map((o) => o.id));
  const awards = c.ds.awards.filter((a) => ids.has(a.opportunityId));
  const activeValue = sum(active.map((o) => o.estimatedValue ?? 0));
  return {
    total: rows.length,
    newLast30: newOnes.length,
    newIds: newOnes.map((o) => o.id),
    active: active.length,
    activeIds: active.map((o) => o.id),
    activeValue,
    activeValueKnown: active.filter((o) => o.estimatedValue !== null).length,
    upcoming14: upcoming.length,
    upcomingIds: upcoming.map((o) => o.id),
    buyers: new Set(rows.map((o) => o.buyerId).filter(Boolean)).size,
    awardees: new Set(awards.map((a) => a.companyId)).size,
    awards: awards.length,
    awardValue: sum(awards.map((a) => a.amount ?? 0)),
    companies: c.ds.companies.length,
    suppliers: c.ds.suppliers.length,
    activePartners: c.ds.suppliers.filter((s) => s.status === "Active partner").length,
  };
}
