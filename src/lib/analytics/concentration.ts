/**
 * Award concentration.
 *  - Top-1 / top-5 awardee share (by award value; count as fallback)
 *  - Herfindahl-Hirschman Index (0–10,000) on award value and on award count
 *  - Buyer dependence: share of a buyer's awards captured by its leading supplier
 * Bands follow common competition-analysis thresholds: <1,500 unconcentrated,
 * 1,500–2,500 moderate, >2,500 high. Samples under 8 awards are flagged.
 */
import { type Ctx, type MarketFilter, companyName, filterAwards, filterOpps, sectorName } from "./context";
import { groupBy, hhi, hhiBand, sum, topNShare } from "./stats";
import type { Award } from "../types";

export const SMALL_SAMPLE = 8;

export interface ConcentrationRow {
  key: string;
  label: string;
  awards: number;
  awardees: number;
  value: number;
  top1: { id: string; name: string; share: number } | null;
  top5Share: number | null;
  hhiValue: number | null;
  hhiCount: number | null;
  band: ReturnType<typeof hhiBand>;
  smallSample: boolean;
  awardIds: string[];
}

function concentrationOf(c: Ctx, key: string, label: string, awards: Award[]): ConcentrationRow {
  const byCo = groupBy(awards, (a) => a.companyId);
  const valueBy = [...byCo.entries()].map(([id, list]) => ({ id, value: sum(list.map((a) => a.amount ?? 0)), count: list.length }));
  const total = sum(valueBy.map((v) => v.value));
  valueBy.sort((a, b) => b.value - a.value || b.count - a.count);
  const hv = hhi(valueBy.map((v) => v.value));
  return {
    key, label,
    awards: awards.length,
    awardees: byCo.size,
    value: total,
    top1: valueBy[0] ? { id: valueBy[0].id, name: companyName(c, valueBy[0].id), share: total ? valueBy[0].value / total : valueBy[0].count / awards.length } : null,
    top5Share: topNShare(valueBy.map((v) => v.value), 5),
    hhiValue: hv,
    hhiCount: hhi(valueBy.map((v) => v.count)),
    band: hhiBand(hv),
    smallSample: awards.length < SMALL_SAMPLE,
    awardIds: awards.map((a) => a.id),
  };
}

export function overallConcentration(c: Ctx, f: MarketFilter = {}): ConcentrationRow {
  return concentrationOf(c, "all", "All sectors", filterAwards(c, f));
}

export function concentrationBySector(c: Ctx, f: MarketFilter = {}): ConcentrationRow[] {
  const awards = filterAwards(c, f);
  const groups = groupBy(awards, (a) => c.opp.get(a.opportunityId)?.sectorId ?? "unclassified");
  return [...groups.entries()].map(([k, list]) => concentrationOf(c, k, sectorName(c, k === "unclassified" ? null : k), list)).sort((a, b) => b.awards - a.awards);
}

export interface BuyerDependence {
  buyerId: string;
  buyerName: string;
  awards: number;
  awardees: number;
  topSupplierId: string;
  topSupplierName: string;
  topSupplierAwards: number;
  share: number;
  dependent: boolean; // ≥50% of ≥3 awards to one supplier
}

export function buyerDependence(c: Ctx, f: MarketFilter = {}): BuyerDependence[] {
  const awards = filterAwards(c, f);
  const byBuyer = groupBy(awards, (a) => c.opp.get(a.opportunityId)?.buyerId ?? null);
  const out: BuyerDependence[] = [];
  for (const [bid, list] of byBuyer) {
    const byCo = [...groupBy(list, (a) => a.companyId).entries()].map(([id, l]) => ({ id, n: l.length })).sort((a, b) => b.n - a.n);
    const top = byCo[0];
    out.push({
      buyerId: bid, buyerName: c.buyer.get(bid)?.name ?? bid, awards: list.length, awardees: byCo.length,
      topSupplierId: top.id, topSupplierName: companyName(c, top.id), topSupplierAwards: top.n, share: top.n / list.length,
      dependent: list.length >= 3 && top.n / list.length >= 0.5,
    });
  }
  return out.sort((a, b) => b.share - a.share || b.awards - a.awards);
}

/** Competition intensity from disclosed bidder lists: bidders per tender. */
export function competitionIntensity(c: Ctx, f: MarketFilter = {}) {
  const ok = new Set(filterOpps(c, f).map((o) => o.id));
  const tenders = [...c.partsByOpp.entries()].filter(([oid]) => ok.has(oid));
  const counts = tenders.map(([, ps]) => ps.length);
  const bySector = groupBy(tenders, ([oid]) => c.opp.get(oid)?.sectorId ?? "unclassified");
  return {
    tenders: tenders.length,
    meanBidders: counts.length ? sum(counts) / counts.length : null,
    bySector: [...bySector.entries()].map(([k, list]) => ({ key: k, label: sectorName(c, k === "unclassified" ? null : k), tenders: list.length, meanBidders: sum(list.map(([, ps]) => ps.length)) / list.length })).sort((a, b) => b.tenders - a.tenders),
  };
}
