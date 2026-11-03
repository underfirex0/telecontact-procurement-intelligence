/**
 * Buyer (contracting authority) analysis.
 */
import { diffDays, yearOf } from "../dates";
import type { Opportunity } from "../types";
import { type Ctx, companyName, regionName, sectorName } from "./context";
import { countBy, groupBy, median, sum } from "./stats";
import { recurringSeries, type RecurringSeries } from "./recurrence";

export interface BuyerSummary {
  id: string;
  name: string;
  acronym: string;
  type: string;
  region: string;
  city: string;
  opportunities: number;
  active: number;
  last24m: number;
  totalValue: number;
  medianValue: number | null;
  awards: number;
  awardees: number;
  topSector: string;
  sectors: number;
  lastPublication: string | null;
  recurringLines: number;
}

export function buyerSummaries(c: Ctx): BuyerSummary[] {
  const series = recurringSeries(c);
  return c.ds.buyers.map((b) => {
    const opps = c.oppsByBuyer.get(b.id) ?? [];
    const vals = opps.map((o) => o.estimatedValue).filter((v): v is number => v !== null);
    const awards = opps.flatMap((o) => c.awardsByOpp.get(o.id) ?? []);
    const sc = Object.entries(countBy(opps, (o) => o.sectorId)).sort((a, z) => z[1] - a[1]);
    const pubs = opps.map((o) => o.publicationDate).filter(Boolean).sort() as string[];
    return {
      id: b.id, name: b.name, acronym: b.acronym, type: b.type, region: regionName(c, b.regionId), city: b.city,
      opportunities: opps.length,
      active: opps.filter((o) => o.status === "Open" || o.status === "Closing soon").length,
      last24m: opps.filter((o) => o.publicationDate && diffDays(c.ref, o.publicationDate) <= 730).length,
      totalValue: sum(vals), medianValue: median(vals),
      awards: awards.length, awardees: new Set(awards.map((a) => a.companyId)).size,
      topSector: sc[0] ? sectorName(c, sc[0][0]) : "—", sectors: sc.length,
      lastPublication: pubs[pubs.length - 1] ?? null,
      recurringLines: series.filter((s) => s.buyerId === b.id && s.occurrences.length >= 2).length,
    };
  });
}

export interface BuyerProfile {
  summary: BuyerSummary;
  opportunities: Opportunity[];
  perYear: { year: number; count: number; value: number }[];
  perQuarter: { period: string; count: number }[];
  sectorMix: { key: string; label: string; count: number; value: number; share: number }[];
  regions: { key: string; label: string; count: number }[];
  procedures: { label: string; count: number }[];
  publicationFrequency: { perYear: number | null; medianGapDays: number | null; activeYears: number };
  values: { mean: number | null; median: number | null; max: number | null; known: number };
  awardees: { id: string; name: string; awards: number; value: number; sectors: string[]; share: number }[];
  awardsTotal: number;
  awardValue: number;
  recurring: RecurringSeries[];
  cancellationRate: number | null;
  observations: { text: string; evidence: string[] }[];
}

export function buyerProfile(c: Ctx, buyerId: string): BuyerProfile | null {
  const b = c.buyer.get(buyerId);
  if (!b) return null;
  const summary = buyerSummaries(c).find((s) => s.id === buyerId)!;
  const opps = [...(c.oppsByBuyer.get(buyerId) ?? [])].sort((a, z) => (z.publicationDate ?? "").localeCompare(a.publicationDate ?? ""));
  const dated = opps.filter((o) => o.publicationDate);
  const years = groupBy(dated, (o) => yearOf(o.publicationDate!));
  const perYear = [2023, 2024, 2025, 2026].map((y) => ({ year: y, count: years.get(y)?.length ?? 0, value: sum((years.get(y) ?? []).map((o) => o.estimatedValue ?? 0)) }));
  const qs = countBy(dated, (o) => `${o.publicationDate!.slice(0, 4)}-Q${Math.ceil(Number(o.publicationDate!.slice(5, 7)) / 3)}`);
  const perQuarter = Object.entries(qs).sort().map(([period, count]) => ({ period, count }));
  const secGroups = groupBy(opps, (o) => o.sectorId ?? "unclassified");
  const sectorMix = [...secGroups.entries()].map(([k, l]) => ({ key: k, label: sectorName(c, k === "unclassified" ? null : k), count: l.length, value: sum(l.map((o) => o.estimatedValue ?? 0)), share: l.length / opps.length })).sort((a, z) => z.count - a.count);
  const regions = Object.entries(countBy(opps, (o) => o.regionId ?? "unknown")).map(([k, n]) => ({ key: k, label: regionName(c, k === "unknown" ? null : k), count: n })).sort((a, z) => z.count - a.count);
  const procedures = Object.entries(countBy(opps, (o) => o.procedure)).map(([label, count]) => ({ label, count })).sort((a, z) => z.count - a.count);
  const pubs = dated.map((o) => o.publicationDate!).sort();
  const gaps = pubs.slice(1).map((d, i) => diffDays(d, pubs[i]));
  const activeYears = new Set(pubs.map((p) => p.slice(0, 4))).size;
  const spanYears = pubs.length > 1 ? Math.max(1, diffDays(pubs[pubs.length - 1], pubs[0]) / 365) : 1;
  const vals = opps.map((o) => o.estimatedValue).filter((v): v is number => v !== null);
  const awards = opps.flatMap((o) => c.awardsByOpp.get(o.id) ?? []);
  const byCo = groupBy(awards, (a) => a.companyId);
  const awardees = [...byCo.entries()].map(([id, l]) => ({
    id, name: companyName(c, id), awards: l.length, value: sum(l.map((a) => a.amount ?? 0)),
    sectors: [...new Set(l.map((a) => sectorName(c, c.opp.get(a.opportunityId)?.sectorId)))], share: l.length / awards.length,
  })).sort((a, z) => z.awards - a.awards || z.value - a.value);
  const recurring = recurringSeries(c).filter((s) => s.buyerId === buyerId && s.occurrences.length >= 2);
  const decided = opps.filter((o) => ["Awarded", "Cancelled", "Unsuccessful"].includes(o.status));
  const cancelled = decided.filter((o) => o.status !== "Awarded");
  const cancellationRate = decided.length >= 3 ? cancelled.length / decided.length : null;

  // Observations: rule-based, each tied to the records that support it.
  const obs: BuyerProfile["observations"] = [];
  if (sectorMix[0] && opps.length >= 3) obs.push({ text: `${sectorMix[0].label} accounts for ${Math.round(sectorMix[0].share * 100)}% of this buyer's ${opps.length} recorded opportunities.`, evidence: secGroups.get(sectorMix[0].key)!.map((o) => o.id) });
  for (const r of recurring.slice(0, 3)) obs.push({ text: `Recurring purchasing line in ${r.sectorName}: ${r.occurrences.length} publications, median interval ${r.medianIntervalDays ?? "n/a"} days (${r.regularity}).`, evidence: r.occurrences.map((o) => o.id) });
  if (awardees[0] && awards.length >= 3) obs.push({ text: `${awardees[0].name} holds ${awardees[0].awards} of ${awards.length} recorded awards (${Math.round(awardees[0].share * 100)}%)${awardees[0].share >= 0.5 ? " — a strong incumbent relationship" : ""}.`, evidence: byCo.get(awardees[0].id)!.map((a) => a.opportunityId) });
  const y25 = perYear.find((p) => p.year === 2025)!.count;
  const y24 = perYear.find((p) => p.year === 2024)!.count;
  if (y24 + y25 >= 4) {
    const ch = y24 ? (y25 - y24) / y24 : null;
    if (ch !== null && Math.abs(ch) >= 0.25) obs.push({ text: `Publication volume ${ch > 0 ? "rose" : "fell"} from ${y24} (2024) to ${y25} (2025), ${ch > 0 ? "+" : ""}${Math.round(ch * 100)}%.`, evidence: dated.filter((o) => ["2024", "2025"].includes(o.publicationDate!.slice(0, 4))).map((o) => o.id) });
  }
  if (cancellationRate !== null && cancellationRate >= 0.25) obs.push({ text: `${cancelled.length} of ${decided.length} decided procedures were cancelled or unsuccessful — factor this into bid effort.`, evidence: cancelled.map((o) => o.id) });
  if (awards.length === 0 && opps.length) obs.push({ text: `No award outcomes recorded for this buyer in the dataset; incumbent positions are unknown.`, evidence: [] });

  return {
    summary, opportunities: opps, perYear, perQuarter, sectorMix, regions, procedures,
    publicationFrequency: { perYear: pubs.length ? pubs.length / spanYears : null, medianGapDays: median(gaps), activeYears },
    values: { mean: vals.length ? sum(vals) / vals.length : null, median: median(vals), max: vals.length ? Math.max(...vals) : null, known: vals.length },
    awardees, awardsTotal: awards.length, awardValue: sum(awards.map((a) => a.amount ?? 0)),
    recurring, cancellationRate, observations: obs,
  };
}
