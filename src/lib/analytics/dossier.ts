/**
 * Single Opportunity Intelligence Dossier — the central analytical product.
 *
 * Assembles every connected record around one opportunity and separates:
 *   FACT            — copied from synthetic source records
 *   METRIC          — calculated from records (with sample size)
 *   INTERPRETATION  — rule-based reading of metrics
 *   RECOMMENDATION  — suggested actions derived from rules
 *   ASSUMPTION      — premises the analysis relies on
 *   UNKNOWN         — information the dataset does not contain
 */
import { t, tk, tv } from "../i18n";
import * as f from "../format";
import { REGIONS } from "../data/reference";
import { diffDays } from "../dates";
import type { Opportunity, Supplier } from "../types";
import { type Ctx, buyerName, companyName, regionName, sectorName } from "./context";
import { buyerProfile } from "./buyers";
import { concentrationBySector, type ConcentrationRow } from "./concentration";
import { growthSignals, type GrowthSignal } from "./market";
import { futureSignals, recurringSeries, type FutureSignal, type RecurringSeries } from "./recurrence";
import { clamp, groupBy, median, percentileRank, sum } from "./stats";

export type StatementKind = "fact" | "metric" | "interpretation" | "recommendation" | "assumption" | "unknown";
export interface Statement {
  kind: StatementKind;
  section: string;
  text: string;
  evidence?: string[]; // record ids
}

export interface SimilarOpp {
  opp: Opportunity;
  score: number;
  reasons: string[];
  awardees: string[];
}

/* ---------------- Similarity ---------------- */

const tokens = (s: string) => new Set(s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z]+/).filter((w) => w.length > 3));

export function similarity(a: Opportunity, b: Opportunity): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  if (a.sectorId && a.sectorId === b.sectorId) { score += 0.45; reasons.push(t("same sector")); }
  if (a.buyerId && a.buyerId === b.buyerId) { score += 0.2; reasons.push(t("same buyer")); }
  if (a.regionId && a.regionId === b.regionId) { score += 0.1; reasons.push(t("same region")); }
  if (a.estimatedValue && b.estimatedValue) {
    const r = Math.abs(Math.log10(a.estimatedValue / b.estimatedValue));
    const v = Math.max(0, 1 - r);
    score += 0.15 * v;
    if (v > 0.7) reasons.push(t("comparable value"));
  }
  const ta = tokens(a.title);
  const tb = tokens(b.title);
  const inter = [...ta].filter((t) => tb.has(t)).length;
  const j = ta.size + tb.size - inter ? inter / (ta.size + tb.size - inter) : 0;
  score += 0.1 * j;
  if (j >= 0.5) reasons.push(t("similar object"));
  return { score: Math.round(score * 100) / 100, reasons };
}

export function similarOpportunities(c: Ctx, o: Opportunity, limit = 12, minScore = 0.45): SimilarOpp[] {
  return c.clean
    .filter((x) => x.id !== o.id && x.id !== o.duplicateOf)
    .map((x) => ({ opp: x, ...similarity(o, x) }))
    .filter((x) => x.score >= minScore)
    .sort((a, b) => b.score - a.score || (b.opp.publicationDate ?? "").localeCompare(a.opp.publicationDate ?? ""))
    .slice(0, limit)
    .map((x) => ({ ...x, awardees: (c.awardsByOpp.get(x.opp.id) ?? []).map((a) => companyName(c, a.companyId)) }));
}

/* ---------------- Supplier matching ---------------- */

const STAGE_WEIGHT: Record<string, number> = {
  "Active partner": 30, Negotiation: 22, "Meeting scheduled": 16, Responded: 12, Contacted: 8, Identified: 5, "Not contacted": 5, Inactive: 3, Rejected: 0,
};

export function matchSuppliers(o: Opportunity, suppliers: Supplier[], limit = 8) {
  const regionCities = o.regionId ? REGIONS.find((r) => r.id === o.regionId)?.cities ?? [] : [];
  return suppliers
    .map((s) => {
      const reasons: string[] = [];
      let score = 0;
      if (o.sectorId && s.sectorIds[0] === o.sectorId) { score += 40; reasons.push(t("primary sector match")); }
      else if (o.sectorId && s.sectorIds.includes(o.sectorId)) { score += 25; reasons.push(t("secondary sector match")); }
      else return null;
      score += STAGE_WEIGHT[s.status] ?? 0;
      reasons.push(t("relationship: {stage}", { stage: tv(s.status).toLowerCase() }));
      if (s.coverage.includes("Morocco")) { score += 15; reasons.push(t("covers Morocco")); }
      if (s.country === "Morocco" && regionCities.includes(s.city)) { score += 10; reasons.push(t("based in {v0}", { v0: s.city })); }
      score += s.capacityScore * 3;
      return { supplier: s, score: Math.min(100, score), reasons };
    })
    .filter((x): x is { supplier: Supplier; score: number; reasons: string[] } => !!x && x.supplier.status !== "Rejected")
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/* ---------------- Dossier ---------------- */

export interface ReadinessComponent {
  key: string;
  label: string;
  weight: number;
  score: number; // 0–100
  basis: string;
}

export interface Risk {
  level: "High" | "Medium" | "Low";
  title: string;
  detail: string;
  evidence: string[];
}

export interface Dossier {
  opp: Opportunity;
  isDuplicateOf: string | null;
  timing: { daysToDeadline: number | null; daysSincePublication: number | null; state: "Open" | "Closing" | "Closed" | "Unknown" };
  buyer: ReturnType<typeof buyerProfile>;
  buyerSameSector: Opportunity[];
  similar: SimilarOpp[];
  series: RecurringSeries | null;
  positionInSeries: number | null;
  signal: FutureSignal | null;
  participants: { id: string; name: string; bids: number; wins: number; outcomes: Record<string, number> }[];
  participantsSample: number; // similar tenders with disclosed bidder lists
  awardees: { id: string; name: string; awards: number; value: number; atBuyer: number }[];
  incumbent: { id: string; name: string; winsInLine: number; lastAwardDate: string } | null;
  sectorConcentration: ConcentrationRow | null;
  meanBidders: number | null;
  suppliers: ReturnType<typeof matchSuppliers>;
  supplierCoverage: { country: string; count: number }[];
  growth: GrowthSignal | null;
  sectorMedianValue: number | null;
  sectorValueN: number;
  valuePercentile: number | null;
  risks: Risk[];
  missing: { field: string; impact: string }[];
  readiness: { score: number; components: ReadinessComponent[]; verdict: string; posture: "Pursue" | "Pursue with partner" | "Qualify further" | "Do not prioritise" | "Historical — intelligence only" };
  actions: { priority: "Now" | "Next" | "Later"; text: string; href?: string }[];
  statements: Statement[];
}

const MAD = (v: number) => f.madFull(v);

export function buildDossier(c: Ctx, oppId: string, suppliers: Supplier[] = c.ds.suppliers): Dossier | null {
  const o = c.opp.get(oppId);
  if (!o) return null;
  const S: Statement[] = [];
  const say = (kind: StatementKind, section: string, text: string, evidence?: string[]) => S.push({ kind, section, text, evidence });
  const dup = c.duplicates.find((d) => d.id === o.id);
  const base = dup ? c.opp.get(dup.keptId)! : o;

  /* timing */
  const daysToDeadline = o.deadline ? diffDays(o.deadline, c.ref) : null;
  const daysSincePublication = o.publicationDate ? diffDays(c.ref, o.publicationDate) : null;
  const state = daysToDeadline === null ? "Unknown" : daysToDeadline < 0 ? "Closed" : daysToDeadline <= 10 ? "Closing" : "Open";

  /* 1. facts */
  say("fact", tk("Opportunity"), o.publicationDate ? t("{ref} — \"{title}\", published by {buyer} on {date}; procedure: {procedure}.", { ref: o.reference, title: o.title, buyer: buyerName(c, o.buyerId), date: f.date(o.publicationDate), procedure: o.procedure }) : t("{ref} — \"{title}\", published by {buyer}; procedure: {procedure}.", { ref: o.reference, title: o.title, buyer: buyerName(c, o.buyerId), procedure: o.procedure }), [o.id]);
  if (o.deadline) say("fact", tk("Opportunity"), t("Submission deadline {v0} ({v1}).", { v0: f.date(o.deadline), v1: daysToDeadline! >= 0 ? t("{v0} days from the reference date {v1}", { v0: daysToDeadline, v1: f.date(c.ref) }) : t("{v0} days ago", { v0: -daysToDeadline! }) }), [o.id]);
  if (o.estimatedValue) say("fact", tk("Opportunity"), t("Estimated value {v0} across {v1} lot(s); contract duration {v2} months.", { v0: MAD(o.estimatedValue), v1: o.lots.length, v2: o.contractDurationMonths ?? t("n/a") }), [o.id]);
  if (dup) say("fact", tk("Opportunity"), t("This record duplicates {v0} (same reference, buyer and object); analytics use the original.", { v0: dup.keptId }), [dup.keptId]);

  /* 2. buyer history */
  const bp = o.buyerId ? buyerProfile(c, o.buyerId) : null;
  const buyerSameSector = bp ? bp.opportunities.filter((x) => x.sectorId === o.sectorId && x.id !== base.id) : [];
  if (bp) {
    say("metric", tk("Buyer"), t("{v0} has {v1} recorded opportunities ({v2} per year), {v3} recorded awards to {v4} distinct awardees.", { v0: bp.summary.name, v1: bp.summary.opportunities, v2: bp.publicationFrequency.perYear != null ? f.fixed(bp.publicationFrequency.perYear) : t("n/a"), v3: bp.awardsTotal, v4: bp.awardees.length }), bp.opportunities.map((x) => x.id));
    say("metric", tk("Buyer"), t("{v0} earlier/other opportunities from this buyer in {v1}.", { v0: buyerSameSector.length, v1: sectorName(c, o.sectorId) }), buyerSameSector.map((x) => x.id));
    if (bp.cancellationRate !== null) say("metric", tk("Buyer"), t("Cancellation/unsuccessful rate on decided procedures: {v0}.", { v0: f.pct(bp.cancellationRate) }));
  } else say("unknown", tk("Buyer"), t("Buyer not identified in the source record — buyer history cannot be assembled."));

  /* 3. similar */
  const similar = similarOpportunities(c, base);
  say("metric", tk("Similar opportunities"), t("{v0} similar opportunities found (similarity ≥ 0.45; weights: sector 0.45, buyer 0.20, value 0.15, region 0.10, object text 0.10).", { v0: similar.length }), similar.map((s) => s.opp.id));

  /* 4. recurrence */
  const series = recurringSeries(c).find((s) => s.buyerId === o.buyerId && s.sectorId === o.sectorId) ?? null;
  const positionInSeries = series ? series.occurrences.findIndex((x) => x.id === base.id) + 1 || null : null;
  const signal = futureSignals(c).find((s) => s.buyerId === o.buyerId && s.sectorId === o.sectorId) ?? null;
  if (series && series.occurrences.length >= 2) {
    say("metric", tk("Recurring demand"), t("Purchasing line {v0} × {v1}: {v2} publications, median interval {v3} days{v4}.", { v0: buyerName(c, o.buyerId), v1: sectorName(c, o.sectorId), v2: series.occurrences.length, v3: series.medianIntervalDays, v4: series.cv !== null ? `, CV ${f.fixed(series.cv, 2)}` : "" }), series.occurrences.map((x) => x.id));
    say("interpretation", tk("Recurring demand"), series.regularity === "Regular cycle" ? t("The buyer re-procures this need on a regular cycle: losing this round does not close the account, and winning creates an incumbent position for the next cycle.") : t("The need recurs but irregularly; plan for it without relying on precise timing."));
  } else say("interpretation", tk("Recurring demand"), t("No recurring pattern for this buyer and sector in the dataset — treat as a one-off need unless other evidence appears."));

  /* 5–6. participants & awardees of similar tenders */
  const simIds = new Set([...similar.map((s) => s.opp.id), ...buyerSameSector.map((x) => x.id)]);
  const parts = [...simIds].flatMap((id) => c.partsByOpp.get(id) ?? []);
  const disclosed = new Set(parts.map((p) => p.opportunityId)).size;
  const pBy = groupBy(parts, (p) => p.companyId);
  const participants = [...pBy.entries()].map(([id, l]) => {
    const outcomes: Record<string, number> = {};
    l.forEach((p) => (outcomes[p.outcome] = (outcomes[p.outcome] ?? 0) + 1));
    return { id, name: companyName(c, id), bids: l.length, wins: outcomes.Awarded ?? 0, outcomes };
  }).sort((a, b) => b.bids - a.bids || b.wins - a.wins);
  const simAwards = [...simIds].flatMap((id) => c.awardsByOpp.get(id) ?? []);
  const aBy = groupBy(simAwards, (a) => a.companyId);
  const awardees = [...aBy.entries()].map(([id, l]) => ({
    id, name: companyName(c, id), awards: l.length, value: sum(l.map((a) => a.amount ?? 0)),
    atBuyer: l.filter((a) => c.opp.get(a.opportunityId)?.buyerId === o.buyerId).length,
  })).sort((a, b) => b.awards - a.awards || b.value - a.value);
  say("metric", tk("Competition"), t("{v0} companies recorded as bidders across {v1} similar tenders with disclosed bidder lists; {v2} verified awardees across {v3} awards on similar tenders.", { v0: participants.length, v1: disclosed, v2: awardees.length, v3: simAwards.length }), [...simIds]);
  if (disclosed === 0) say("unknown", tk("Competition"), t("No bidder lists disclosed for similar tenders — the field of likely competitors is inferred from awards only."));

  /* 7. incumbent & concentration */
  let incumbent: Dossier["incumbent"] = null;
  if (series) {
    const lineAwards = series.occurrences.filter((x) => x.id !== base.id).flatMap((x) => c.awardsByOpp.get(x.id) ?? []).sort((a, b) => b.awardDate.localeCompare(a.awardDate));
    if (lineAwards[0]) {
      const id = lineAwards[0].companyId;
      incumbent = { id, name: companyName(c, id), winsInLine: lineAwards.filter((a) => a.companyId === id).length, lastAwardDate: lineAwards[0].awardDate };
      say("fact", tk("Competition"), t("Most recent award in this purchasing line went to {v0} on {v1}.", { v0: incumbent.name, v1: f.date(incumbent.lastAwardDate) }), lineAwards.map((a) => a.opportunityId));
      say("interpretation", tk("Competition"), incumbent.winsInLine >= 2 ? t("{v0} has won this line {v1} times — an entrenched incumbent; a challenger bid needs a clear price or technical differentiator.", { v0: incumbent.name, v1: incumbent.winsInLine }) : t("{v0} is the current incumbent from a single award — the position is not yet entrenched.", { v0: incumbent.name }));
    }
  }
  const sectorConcentration = o.sectorId ? concentrationBySector(c).find((r) => r.key === o.sectorId) ?? null : null;
  if (sectorConcentration) {
    say("metric", tk("Competition"), t("Sector award concentration: HHI {v0} ({v1}), top-5 share {v2} over {v3} awards.", { v0: f.int(Math.round(sectorConcentration.hhiValue ?? 0)), v1: tv(sectorConcentration.band).toLowerCase(), v2: f.pct(sectorConcentration.top5Share), v3: sectorConcentration.awards }), sectorConcentration.awardIds);
    if (sectorConcentration.smallSample) say("assumption", tk("Competition"), t("Concentration is based on fewer than 8 awards — treat as indicative only."));
  }
  const sectorTenders = [...c.partsByOpp.entries()].filter(([oid]) => c.opp.get(oid)?.sectorId === o.sectorId);
  const meanBidders = sectorTenders.length ? sum(sectorTenders.map(([, l]) => l.length)) / sectorTenders.length : null;
  if (meanBidders !== null) say("metric", tk("Competition"), t("Average {v0} bidders per tender in this sector (n={v1} tenders with disclosed bids).", { v0: f.fixed(meanBidders), v1: sectorTenders.length }), sectorTenders.map(([id]) => id));

  /* 8–9. suppliers */
  const matched = matchSuppliers(o, suppliers);
  const coverage = Object.entries(matched.reduce<Record<string, number>>((acc, m) => ((acc[m.supplier.country] = (acc[m.supplier.country] ?? 0) + 1), acc), {})).map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count);
  const activeMatches = matched.filter((m) => ["Active partner", "Negotiation"].includes(m.supplier.status));
  say("metric", tk("Suppliers"), t("{v0} network suppliers match the sector; {v1} are active partners or in negotiation.", { v0: matched.length, v1: activeMatches.length }), matched.map((m) => m.supplier.id));
  if (!matched.some((m) => m.supplier.coverage.includes("Morocco"))) say("interpretation", tk("Suppliers"), t("No matched supplier covers Morocco — execution capacity would need to be built before bidding."));

  /* 10. market */
  const growth = o.sectorId ? growthSignals(c).find((g) => g.key === o.sectorId) ?? null : null;
  const sectorVals = c.clean.filter((x) => x.sectorId === o.sectorId && x.estimatedValue !== null).map((x) => x.estimatedValue!);
  const sectorMedianValue = median(sectorVals);
  const valuePercentile = o.estimatedValue ? percentileRank(sectorVals, o.estimatedValue) : null;
  if (growth) say("metric", tk("Market"), t("Sector publications: {v0} in the last 12 months vs {v1} in the prior 12 ({v2}) — {v3}.", { v0: growth.current, v1: growth.previous, v2: growth.change === null ? t("n/a") : f.signedPct(growth.change), v3: tv(growth.trend).toLowerCase() }), growth.ids);
  if (valuePercentile !== null && sectorMedianValue) say("metric", tk("Market"), t("Estimated value sits at the {v0}th percentile of {v1} sector opportunities (sector median {v2}).", { v0: Math.round(valuePercentile), v1: sectorVals.length, v2: MAD(sectorMedianValue) }));

  /* 13. missing information */
  const missing: Dossier["missing"] = [];
  if (!o.estimatedValue) missing.push({ field: tk("Estimated value"), impact: t("Commercial attractiveness and price positioning cannot be benchmarked.") });
  if (!o.deadline) missing.push({ field: tk("Submission deadline"), impact: t("Time feasibility cannot be assessed; confirm with the buyer.") });
  if (!o.buyerId) missing.push({ field: tk("Buyer"), impact: t("No buyer history, incumbents or recurrence can be linked.") });
  if (!o.sectorId) missing.push({ field: tk("Sector classification"), impact: t("Similarity, competitor and supplier matching are degraded.") });
  if (!o.regionId) missing.push({ field: tk("Region / city"), impact: t("Geographic supplier coverage cannot be checked.") });
  if (disclosed === 0) missing.push({ field: tk("Bidder lists for similar tenders"), impact: t("Expected competitor field is inferred from awards only.") });
  if (!incumbent && series && series.occurrences.length >= 2) missing.push({ field: tk("Previous award outcome in this line"), impact: t("Incumbent unknown.") });
  missing.push({ field: tk("Evaluation criteria weighting (price vs technical)"), impact: t("Not captured in the dataset; read the RC before deciding.") });
  for (const m of missing) say("unknown", tk("Missing information"), t("{field}: {impact}", { field: t(m.field), impact: m.impact }));

  /* 12. risks */
  const risks: Risk[] = [];
  if (daysToDeadline !== null && daysToDeadline >= 0 && daysToDeadline < 10) risks.push({ level: "High", title: t("Short preparation window"), detail: t("{v0} days to deadline — limited time for partner alignment and pricing.", { v0: daysToDeadline }), evidence: [o.id] });
  if (incumbent && incumbent.winsInLine >= 2) risks.push({ level: "High", title: t("Entrenched incumbent"), detail: t("{v0} won this line {v1} times.", { v0: incumbent.name, v1: incumbent.winsInLine }), evidence: series!.occurrences.map((x) => x.id) });
  else if (incumbent) risks.push({ level: "Medium", title: t("Incumbent in place"), detail: t("{v0} holds the latest award in this line.", { v0: incumbent.name }), evidence: series!.occurrences.map((x) => x.id) });
  if (sectorConcentration && sectorConcentration.band === "Highly concentrated" && !sectorConcentration.smallSample) risks.push({ level: "Medium", title: t("Concentrated sector"), detail: t("HHI {v0}; leading awardee {v1} holds {v2} of award value.", { v0: f.int(Math.round(sectorConcentration.hhiValue!)), v1: sectorConcentration.top1?.name, v2: f.pct(sectorConcentration.top1?.share) }), evidence: sectorConcentration.awardIds });
  if (valuePercentile !== null && valuePercentile >= 85) risks.push({ level: "Medium", title: t("Large commitment"), detail: t("Value above the sector's 85th percentile — guarantees, cash-flow and references must scale."), evidence: [o.id] });
  if (bp?.cancellationRate !== null && bp?.cancellationRate !== undefined && bp.cancellationRate >= 0.25) risks.push({ level: "Medium", title: t("Procedure reliability"), detail: t("{v0} of this buyer's decided procedures were cancelled or unsuccessful.", { v0: f.pct(bp.cancellationRate) }), evidence: bp.opportunities.filter((x) => ["Cancelled", "Unsuccessful"].includes(x.status)).map((x) => x.id) });
  if (!activeMatches.length) risks.push({ level: matched.length ? "Medium" : "High", title: t("Execution capacity gap"), detail: matched.length ? t("Matching suppliers exist but none is an active partner.") : t("No matching supplier in the network."), evidence: matched.map((m) => m.supplier.id) });
  if (meanBidders !== null && meanBidders >= 4.5) risks.push({ level: "Low", title: t("Crowded field"), detail: t("Sector tenders attract {v0} bidders on average.", { v0: f.fixed(meanBidders) }), evidence: sectorTenders.map(([id]) => id) });
  if (missing.length >= 4) risks.push({ level: "Low", title: t("Information gaps"), detail: t("{v0} material information gaps (see Missing information).", { v0: missing.length }), evidence: [] });
  for (const r of risks) say("interpretation", tk("Risks"), t("{v0} risk — {v1}: {v2}", { v0: tv(r.level), v1: r.title, v2: r.detail }), r.evidence);

  /* 14. readiness */
  const sectorGrowthBonus = growth?.trend === "Rising" || growth?.trend === "Emerging" ? 10 : growth?.trend === "Declining" ? -10 : 0;
  const commercial = valuePercentile !== null ? clamp((40 + valuePercentile * 0.5 + sectorGrowthBonus) / 100) * 100 : 45 + sectorGrowthBonus;
  let openness = 75;
  if (incumbent) openness -= incumbent.winsInLine >= 2 ? 30 : 15;
  if (sectorConcentration?.band === "Highly concentrated" && !sectorConcentration.smallSample) openness -= 15;
  if (meanBidders !== null && meanBidders >= 4.5) openness -= 10;
  if (series && series.occurrences.length >= 2) openness += 10; // recurring → repeated chances
  const buyerScore = bp ? (bp.cancellationRate === null ? 60 : Math.round((1 - bp.cancellationRate) * 100)) : 30;
  const supplierScore = Math.min(100, activeMatches.length * 35 + (matched.length - activeMatches.length) * 10);
  const timeScore = daysToDeadline === null ? 40 : daysToDeadline < 0 ? 0 : daysToDeadline >= 21 ? 100 : daysToDeadline >= 10 ? 70 : daysToDeadline >= 5 ? 40 : 15;
  const infoScore = Math.max(0, 100 - (missing.length - 1) * 15);
  const components: ReadinessComponent[] = [
    { key: "commercial", label: tk("Commercial attractiveness"), weight: 0.25, score: Math.round(commercial), basis: valuePercentile !== null ? t("value percentile {v0} in sector; sector trend {v1}", { v0: Math.round(valuePercentile), v1: growth ? tv(growth.trend).toLowerCase() : t("n/a") }) : t("value unknown — neutral score") },
    { key: "openness", label: tk("Competitive openness"), weight: 0.2, score: Math.round(clamp(openness / 100) * 100), basis: t("incumbent {v0}; concentration {v1}; avg bidders {v2}", { v0: incumbent ? incumbent.name : t("none recorded"), v1: sectorConcentration ? tv(sectorConcentration.band).toLowerCase() : t("n/a"), v2: meanBidders !== null ? f.fixed(meanBidders) : t("n/a") }) },
    { key: "buyer", label: tk("Buyer reliability"), weight: 0.15, score: buyerScore, basis: bp ? (bp.cancellationRate === null ? t("fewer than 3 decided procedures — neutral") : t("{v0} cancelled/unsuccessful", { v0: f.pct(bp.cancellationRate) })) : t("buyer unidentified") },
    { key: "suppliers", label: tk("Supplier & partner availability"), weight: 0.15, score: supplierScore, basis: t("{v0} active/negotiating, {v1} matching in total", { v0: activeMatches.length, v1: matched.length }) },
    { key: "time", label: tk("Time feasibility"), weight: 0.15, score: timeScore, basis: daysToDeadline === null ? t("deadline unknown") : daysToDeadline < 0 ? t("deadline passed") : t("{v0} days to deadline", { v0: daysToDeadline }) },
    { key: "information", label: tk("Information completeness"), weight: 0.1, score: infoScore, basis: t("{v0} information gaps", { v0: missing.length }) },
  ];
  const score = Math.round(components.reduce((a, x) => a + x.weight * x.score, 0));
  let posture: Dossier["readiness"]["posture"];
  if (state === "Closed") posture = "Historical — intelligence only";
  else if (score >= 72) posture = "Pursue";
  else if (score >= 55) posture = activeMatches.length ? "Pursue with partner" : "Qualify further";
  else if (score >= 42) posture = "Qualify further";
  else posture = "Do not prioritise";
  const verdict = {
    Pursue: t("Commercially attractive and feasible with current capabilities. Move to bid preparation."),
    "Pursue with partner": t("Viable, but success depends on securing an execution partner and a differentiated offer."),
    "Qualify further": t("Open questions outweigh the evidence. Resolve the key unknowns before committing bid resources."),
    "Do not prioritise": t("Weak fit on the measured dimensions. Monitor the buyer instead of bidding this round."),
    "Historical — intelligence only": t("The deadline has passed. Use this record to understand the buyer, incumbents and the next cycle."),
  }[posture];
  say("assumption", tk("Bid readiness"), t("Readiness weights (25/20/15/15/15/10) reflect a generic services company; adjust in Bid Workspace to your own priorities."));
  say("assumption", tk("Bid readiness"), t("Supplier availability assumes relationship status in the network is current."));

  /* 15. actions */
  const actions: Dossier["actions"] = [];
  if (state !== "Closed") {
    actions.push({ priority: "Now", text: t("Open a bid assessment and assign a responsible owner."), href: `/bids/${o.id}` });
    if (o.documents.some((d) => d.kind === "RC")) actions.push({ priority: "Now", text: t("Review the RC and CPS for evaluation criteria and eligibility (not captured in dataset).") });
    if (!activeMatches.length && matched[0]) actions.push({ priority: "Now", text: t("Contact {v0} ({v1}) to secure execution capacity.", { v0: matched[0].supplier.name, v1: tv(matched[0].supplier.country) }), href: `/suppliers/${matched[0].supplier.id}` });
    else if (activeMatches[0]) actions.push({ priority: "Next", text: t("Confirm availability and pricing with active partner {v0}.", { v0: activeMatches[0].supplier.name }), href: `/suppliers/${activeMatches[0].supplier.id}` });
    if (incumbent) actions.push({ priority: "Next", text: t("Analyse {v0}'s award history to build a challenger price/technical position.", { v0: incumbent.name }), href: `/competitors/${incumbent.id}` });
    if (o.provisionalGuarantee) actions.push({ priority: "Next", text: t("Arrange the provisional guarantee of {v0} with your bank.", { v0: MAD(o.provisionalGuarantee) }) });
  } else {
    actions.push({ priority: "Now", text: t("Study the outcome and awardee to calibrate future bids with this buyer."), href: o.buyerId ? `/buyers/${o.buyerId}` : undefined });
  }
  if (signal && signal.state !== "Overdue") actions.push({ priority: "Later", text: t("Prepare for the next expected cycle ({v0} → {v1}, {v2} confidence).", { v0: f.date(signal.windowStart), v1: f.date(signal.windowEnd), v2: tv(signal.level).toLowerCase() }), href: `/signals?focus=${signal.id}` });
  if (o.buyerId) actions.push({ priority: "Later", text: t("Build the relationship with {v0} ahead of future publications.", { v0: buyerName(c, o.buyerId) }), href: `/buyers/${o.buyerId}` });
  for (const a of actions) say("recommendation", tk("Next actions"), a.text);

  /* strategy headline statements */
  say("recommendation", tk("Strategy"), t("{field}: {impact}", { field: tv(posture), impact: verdict }));

  return {
    opp: o, isDuplicateOf: dup?.keptId ?? null,
    timing: { daysToDeadline, daysSincePublication, state },
    buyer: bp, buyerSameSector, similar, series, positionInSeries, signal,
    participants, participantsSample: disclosed, awardees, incumbent, sectorConcentration, meanBidders,
    suppliers: matched, supplierCoverage: coverage,
    growth, sectorMedianValue, sectorValueN: sectorVals.length, valuePercentile,
    risks, missing,
    readiness: { score, components, verdict, posture },
    actions, statements: S,
  };
}

