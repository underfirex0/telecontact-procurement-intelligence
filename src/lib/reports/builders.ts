/**
 * Report builders — turn analytical results into structured intelligence
 * documents. Pure functions: same inputs → same document (except generatedAt).
 * The same ReportDoc drives the on-screen document, PDF (print), Excel and CSV.
 */
import { t, tk, tv } from "../i18n";
import type { BidAssessment, Interaction, Meeting, ReportKind, Supplier } from "../types";
import type { Ctx } from "../analytics/context";
import type { StatementKind } from "../analytics/dossier";
import { buildDossier } from "../analytics/dossier";
import { buyerProfile } from "../analytics/buyers";
import { companyProfile, sectorLeaders } from "../analytics/competitors";
import { concentrationBySector, overallConcentration, buyerDependence } from "../analytics/concentration";
import { bySector, byRegion, growthSignals, overviewKpis, valueDistribution, timeSeries } from "../analytics/market";
import { futureSignals, sectorRecurrence } from "../analytics/recurrence";
import { analyseQuality } from "../analytics/quality";
import { RELATIONSHIP_STAGES } from "../types";
import * as f from "../format";
import type { Row } from "./export";

export interface ReportChart {
  title: string;
  note: string;
  rows: { label: string; value: number; display: string }[];
}
export interface ReportTable {
  title: string;
  rows: Row[];
}
export interface ReportDoc {
  kind: ReportKind;
  title: string;
  subtitle: string;
  subjectId: string | null;
  generatedAt: string;
  referenceDate: string;
  summary: string[];
  scope: string;
  methodology: string[];
  findings: { kind: StatementKind; text: string; evidence?: string[] }[];
  charts: ReportChart[];
  tables: ReportTable[];
  recommendations: string[];
  limitations: string[];
  sources: string[];
}

export const REPORT_TYPES: { kind: ReportKind; label: string; subject: "opportunity" | "buyer" | "company" | "sector" | "supplier" | "none" | "bid"; description: string }[] = [
  { kind: "opportunity", label: tk("Opportunity Intelligence Report"), subject: "opportunity", description: tk("Full dossier for one tender: buyer, competition, suppliers, risks, readiness.") },
  { kind: "buyer", label: tk("Buyer Intelligence Report"), subject: "buyer", description: tk("Purchasing profile, recurrence and awardee relationships of one buyer.") },
  { kind: "competitor", label: tk("Competitor Intelligence Report"), subject: "company", description: tk("Bids, awards, positioning and buyer relationships of one company.") },
  { kind: "awardee", label: tk("Awardee Intelligence Report"), subject: "sector", description: tk("Who wins, by sector or across the market, with concentration.") },
  { kind: "market", label: tk("Market Intelligence Report"), subject: "none", description: tk("Demand, growth, regions, values and concentration for the whole market.") },
  { kind: "supplier", label: tk("Supplier Intelligence Report"), subject: "supplier", description: tk("One supplier profile, or the whole network when no supplier is chosen.") },
  { kind: "signals", label: tk("Future Procurement Signals Report"), subject: "none", description: tk("Expected re-procurement windows with confidence and evidence.") },
  { kind: "bid", label: tk("Bid Readiness Report"), subject: "bid", description: tk("Readiness score, team assessment, checklist and decision for one tender.") },
];

const commonLimits = () => [
  t("All records are SYNTHETIC DEMO DATA generated from a fixed seed; figures illustrate the method, not the real Moroccan market."),
  t("Award outcomes are recorded for only part of the closed tenders; award-based metrics describe the recorded subset."),
  t("Bidder lists are disclosed for a small number of tenders; win rates rely on small samples."),
];
const SOURCES = (c: Ctx) => [
  t("{v0} — generator {v1}, seed {v2}.", { v0: tv(c.ds.meta.name), v1: c.ds.meta.generator, v2: c.ds.meta.seed }),
  t("Reference date {v0}; publication period {v1} – {v2}.", { v0: f.date(c.ds.meta.referenceDate), v1: f.date(c.ds.meta.periodStart), v2: f.date(c.ds.meta.periodEnd) }),
  t("Fictional source channels: synthetic portal feed, award notices, bid-opening minutes, buyer websites, press notices."),
];

function base(c: Ctx, kind: ReportKind, title: string, subtitle: string, subjectId: string | null): Pick<ReportDoc, "kind" | "title" | "subtitle" | "subjectId" | "generatedAt" | "referenceDate" | "sources"> {
  return { kind, title, subtitle, subjectId, generatedAt: new Date().toISOString(), referenceDate: c.ref, sources: SOURCES(c) };
}

export function buildReport(c: Ctx, kind: ReportKind, subjectId: string | null, extra: { suppliers?: Supplier[]; assessment?: BidAssessment; interactions?: Interaction[]; meetings?: Meeting[] } = {}): ReportDoc | null {
  const suppliers = extra.suppliers ?? c.ds.suppliers;
  switch (kind) {
    case "opportunity":
    case "bid": {
      if (!subjectId) return null;
      const d = buildDossier(c, subjectId, suppliers);
      if (!d) return null;
      const o = d.opp;
      const a = extra.assessment;
      const isBid = kind === "bid";
      return {
        ...base(c, kind, isBid ? t("Bid Readiness — {v0}", { v0: o.reference }) : t("Opportunity Intelligence — {v0}", { v0: o.reference }), o.title, o.id),
        summary: [
          t("{v0} (readiness {v1}/100). {v2}", { v0: tv(d.readiness.posture), v1: d.readiness.score, v2: d.readiness.verdict }),
          t("{v0} · {v1} · estimated {v2} · deadline {v3}.", { v0: c.buyer.get(o.buyerId ?? "")?.name ?? "Unidentified buyer", v1: c.sector.get(o.sectorId ?? "")?.name ?? "Unclassified", v2: f.mad(o.estimatedValue), v3: f.date(o.deadline) }),
          d.incumbent ? t("Incumbent in this purchasing line: {v0} ({v1} win(s)).", { v0: d.incumbent.name, v1: d.incumbent.winsInLine }) : t("No incumbent recorded for this purchasing line."),
          t("{v0} matching network suppliers, {v1} active or negotiating.", { v0: d.suppliers.length, v1: d.suppliers.filter((m) => ["Active partner", "Negotiation"].includes(m.supplier.status)).length }),
          ...(isBid && a ? [t("Team decision: {v0} (stage {v1}); checklist {v2}/{v3} complete; owner {v4}.", { v0: tv(a.decision), v1: tv(a.stage), v2: a.checklist.filter((x) => x.done).length, v3: a.checklist.length, v4: a.responsible })] : isBid ? [t("No team assessment recorded yet.")] : []),
        ],
        scope: t("One opportunity ({v0}) and every record connected to it: buyer history, similar tenders, bidders, awardees, sector concentration, matched suppliers and recurrence.", { v0: o.id }),
        methodology: [
          t("Similarity score: sector 0.45, same buyer 0.20, value proximity 0.15 (log-ratio), region 0.10, object-text Jaccard 0.10; threshold 0.45."),
          t("Readiness = 25% commercial attractiveness + 20% competitive openness + 15% buyer reliability + 15% partner availability + 15% time feasibility + 10% information completeness."),
          t("Concentration: Herfindahl-Hirschman Index on award value by sector."),
        ],
        findings: d.statements.filter((s) => s.kind !== "recommendation").map((s) => ({ kind: s.kind, text: t("{field}: {impact}", { field: t(s.section), impact: s.text }), evidence: s.evidence })),
        charts: [
          { title: t("Readiness components (0–100)"), note: t("Computed by the dossier engine"), rows: d.readiness.components.map((x) => ({ label: t(x.label), value: x.score, display: String(x.score) })) },
          ...(d.awardees.length ? [{ title: t("Awardees of similar contracts"), note: t("{v0} awards", { v0: d.awardees.reduce((s, x) => s + x.awards, 0) }), rows: d.awardees.slice(0, 8).map((x) => ({ label: x.name, value: x.awards, display: `${x.awards}` })) }] : []),
        ],
        tables: [
          { title: t("Similar opportunities"), rows: d.similar.map((s) => ({ score: s.score, reference: s.opp.reference, object: s.opp.title, published: s.opp.publicationDate ?? "", value_mad: s.opp.estimatedValue ?? "", status: s.opp.status, awarded_to: s.awardees.join("; ") })) },
          { title: t("Matched suppliers"), rows: d.suppliers.map((m) => ({ fit: m.score, supplier: m.supplier.name, country: m.supplier.country, stage: m.supplier.status, basis: m.reasons.join("; ") })) },
          { title: t("Risks"), rows: d.risks.map((r) => ({ level: r.level, risk: r.title, detail: r.detail })) },
          ...(isBid && a ? [{ title: t("Action checklist"), rows: a.checklist.map((x) => ({ action: x.label, owner: x.owner ?? "", due: x.due ?? "", done: x.done ? "yes" : "no" })) }, { title: t("Team scores (1–5)"), rows: Object.entries(a.scores).map(([k, v]) => ({ criterion: k, score: v })) }] : []),
        ],
        recommendations: d.actions.map((x) => `[${x.priority}] ${x.text}`),
        limitations: [...commonLimits(), ...d.missing.map((m) => `${m.field}: ${m.impact}`)],
      };
    }
    case "buyer": {
      if (!subjectId) return null;
      const p = buyerProfile(c, subjectId);
      if (!p) return null;
      return {
        ...base(c, kind, t("Buyer Intelligence — {v0}", { v0: p.summary.acronym }), p.summary.name, subjectId),
        summary: [
          t("{v0} recorded opportunities ({v1} per year); {v2} active now.", { v0: p.summary.opportunities, v1: f.num(p.publicationFrequency.perYear, 1), v2: p.summary.active }),
          t("Main purchasing category: {v0} ({v1}). Median estimated value {v2}.", { v0: p.sectorMix[0]?.label ?? "—", v1: f.pct(p.sectorMix[0]?.share), v2: f.mad(p.values.median) }),
          t("{v0} recorded awards to {v1} awardees{v2}.", { v0: p.awardsTotal, v1: p.awardees.length, v2: p.awardees[0] ? t("; leading awardee {v0} ({v1})", { v0: p.awardees[0].name, v1: f.pct(p.awardees[0].share) }) : "" }),
          t("{v0} recurring purchasing line(s) detected.", { v0: p.recurring.length }),
        ],
        scope: t("All de-duplicated opportunities and awards linked to buyer {v0}, 2023–2026.", { v0: subjectId }),
        methodology: [t("Publication rate = dated publications ÷ span in years between first and last publication."), t("Recurring line = ≥2 dated publications in one sector; regularity from the coefficient of variation of intervals (≤0.35 = regular).")],
        findings: p.observations.map((o) => ({ kind: o.evidence.length ? "interpretation" as const : "unknown" as const, text: o.text, evidence: o.evidence })),
        charts: [
          { title: t("Opportunities by sector"), note: `n = ${p.opportunities.length}`, rows: p.sectorMix.map((s) => ({ label: s.label, value: s.count, display: `${s.count} (${f.pct(s.share)})` })) },
          { title: t("Publications per year"), note: t("2026 to 2 Nov"), rows: p.perYear.map((y) => ({ label: String(y.year), value: y.count, display: String(y.count) })) },
        ],
        tables: [
          { title: t("Awardee relationships"), rows: p.awardees.map((a) => ({ awardee: a.name, awards: a.awards, share: f.pct(a.share), value_mad: a.value, sectors: a.sectors.join("; ") })) },
          { title: t("Recurring lines"), rows: p.recurring.map((r) => ({ sector: r.sectorName, publications: r.occurrences.length, median_interval_days: r.medianIntervalDays ?? "", regularity: r.regularity })) },
          { title: t("Opportunities"), rows: p.opportunities.map((o) => ({ reference: o.reference, object: o.title, published: o.publicationDate ?? "", deadline: o.deadline ?? "", value_mad: o.estimatedValue ?? "", status: o.status })) },
        ],
        recommendations: [
          ...(p.recurring.length ? [t("Plan for recurring needs: {v0}.", { v0: p.recurring.map((r) => r.sectorName).join(", ") })] : []),
          ...(p.awardees[0] && p.awardees[0].share >= 0.5 && p.awardsTotal >= 3 ? [t("Expect incumbent advantage for {v0}; differentiate on price or technical value.", { v0: p.awardees[0].name })] : []),
          t("Monitor the buyer's active tenders and add relevant ones to the Bid Workspace."),
        ],
        limitations: commonLimits(),
      };
    }
    case "competitor": {
      if (!subjectId) return null;
      const p = companyProfile(c, subjectId);
      if (!p) return null;
      const s = p.summary;
      return {
        ...base(c, kind, t("Competitor Intelligence — {v0}", { v0: s.name }), `${s.primarySector} · ${s.city}`, subjectId),
        summary: [
          t("Role: {v0}. {v1} recorded bids (win rate {v2} on {v3} decided) and {v4} verified awards worth {v5}.", { v0: s.role, v1: s.participations, v2: s.winRate === null ? "n/a" : f.pct(s.winRate), v3: s.decided, v4: s.awards, v5: f.mad(s.awardValue) }),
          p.positioning.rankInSector ? t("Ranks #{v0} of {v1} awardees in {v2}.", { v0: p.positioning.rankInSector, v1: p.positioning.sectorAwardees, v2: p.positioning.sectorLabel }) : t("No award in its primary sector ({v0}).", { v0: p.positioning.sectorLabel }),
          t("{v0} awarding buyer(s), {v1} with repeat business.", { v0: s.buyers, v1: s.repeatBuyers }),
        ],
        scope: t("Participations and awards recorded for company {v0}.", { v0: subjectId }),
        methodology: [t("Win rate = awarded ÷ decided participations (Awarded, Unsuccessful, Shortlisted); pending and withdrawn bids excluded."), t("Awards on tenders without a disclosed bidder list are counted as awards but excluded from the win rate.")],
        findings: p.observations.map((o) => ({ kind: "metric" as const, text: o.text, evidence: o.evidence })),
        charts: [{ title: t("Awards per year"), note: t("verified awards"), rows: p.byYear.map((y) => ({ label: y.year, value: y.awards, display: `${y.awards} · ${f.mad(y.value)}` })) }],
        tables: [
          { title: t("Awards"), rows: p.awards.map((a) => ({ date: a.awardDate, reference: a.reference, object: a.title, buyer: a.buyer, sector: a.sector, amount_mad: a.amount ?? "" })) },
          { title: t("Participations"), rows: p.participations.map((x) => ({ submitted: x.submittedOn, reference: x.reference, buyer: x.buyer, bid_mad: x.bidAmount ?? "", outcome: x.outcome, awarded_to: x.awardedTo.join("; ") })) },
          { title: "Head-to-head", rows: p.headToHead.map((h) => ({ competitor: h.name, encounters: h.meetings, we_won: h.weWon, they_won: h.theyWon })) },
        ],
        recommendations: [
          p.buyerRelationships.some((b) => b.repeat) ? t("Treat {v0} as this competitor's strongholds.", { v0: p.buyerRelationships.filter((b) => b.repeat).map((b) => b.name).join(", ") }) : t("No entrenched buyer relationship detected."),
          t("Track its next awards to update positioning."),
        ],
        limitations: commonLimits(),
      };
    }
    case "awardee": {
      const leaders = sectorLeaders(c, subjectId);
      const conc = subjectId ? concentrationBySector(c).find((r) => r.key === subjectId) ?? null : overallConcentration(c);
      const label = subjectId ? c.sector.get(subjectId)?.name ?? subjectId : "All sectors";
      return {
        ...base(c, kind, t("Awardee Intelligence — {v0}", { v0: label }), t("Who receives the contracts"), subjectId),
        summary: [
          t("{v0} recorded awards to {v1} awardees.", { v0: leaders.reduce((a, l) => a + l.awards, 0), v1: leaders.length }),
          conc ? (conc.smallSample ? t("Concentration: HHI {v0} ({v1}); top-5 share {v2} — small sample.", { v0: f.int(Math.round(conc.hhiValue ?? 0)), v1: tv(conc.band).toLowerCase(), v2: f.pct(conc.top5Share) }) : t("Concentration: HHI {v0} ({v1}); top-5 share {v2}.", { v0: f.int(Math.round(conc.hhiValue ?? 0)), v1: tv(conc.band).toLowerCase(), v2: f.pct(conc.top5Share) })) : t("No concentration figure."),
          leaders[0] ? t("Leader: {v0} with {v1} awards ({v2}).", { v0: leaders[0].name, v1: leaders[0].awards, v2: f.pct(leaders[0].share) }) : "",
        ].filter(Boolean),
        scope: t("Recorded awards {v0}.", { v0: subjectId ? `in ${label}` : "across all sectors" }),
        methodology: [t("Shares by number of awards; HHI on award value."), t("Bands: <1,500 unconcentrated, 1,500–2,500 moderate, >2,500 high.")],
        findings: leaders.slice(0, 5).map((l) => ({ kind: "metric" as const, text: t("{v0}: {v1} awards, {v2}, {v3} buyer(s).", { v0: l.name, v1: l.awards, v2: f.mad(l.value), v3: l.buyers }) })),
        charts: [{ title: t("Leading awardees"), note: t("by number of awards"), rows: leaders.slice(0, 10).map((l) => ({ label: l.name, value: l.awards, display: `${l.awards} (${f.pct(l.share)})` })) }],
        tables: [
          { title: t("Awardees"), rows: leaders.map((l) => ({ awardee: l.name, awards: l.awards, share: f.pct(l.share), value_mad: l.value, buyers: l.buyers })) },
          ...(!subjectId ? [{ title: t("Concentration by sector"), rows: concentrationBySector(c).map((r) => ({ sector: r.label, awards: r.awards, awardees: r.awardees, leader: r.top1?.name ?? "", lead_share: f.pct(r.top1?.share), hhi: Math.round(r.hhiValue ?? 0), band: r.band })) }] : []),
        ],
        recommendations: [t("Prioritise segments where concentration is moderate and no single awardee exceeds 40%."), t("Investigate leaders' buyer relationships before competing head-on.")],
        limitations: commonLimits(),
      };
    }
    case "market": {
      const k = overviewKpis(c);
      const g = growthSignals(c);
      const sec = bySector(c);
      const reg = byRegion(c);
      const v = valueDistribution(c);
      const conc = overallConcentration(c);
      const q = analyseQuality(c);
      const ts = timeSeries(c, {}, "quarter");
      return {
        ...base(c, kind, t("Market Intelligence Report"), t("Synthetic Moroccan public procurement market, 2023–2026"), null),
        summary: [
          t("{v0} unique opportunities ({v1} duplicates removed); {v2} active, {v3} closing within 14 days.", { v0: k.total, v1: c.duplicates.length, v2: k.active, v3: k.upcoming14 }),
          t("Rising sectors: {v0}.{v1}", { v0: g.filter((x) => x.trend === "Rising").map((x) => `${x.label} (${f.signedPct(x.change)})`).join(", ") || t("none"), v1: g.some((x) => x.trend === "Emerging") ? t(" Emerging from a low base: {v0}.", { v0: g.filter((x) => x.trend === "Emerging").map((x) => `${x.label} (${x.previous} → ${x.current})`).join(", ") }) : "" }),
          t("{v0} leads activity ({v1}); {v2} leads regions ({v3}).", { v0: sec[0]?.label, v1: f.pct(sec[0]?.share), v2: reg[0]?.label, v3: f.pct(reg[0]?.share) }),
          t("Median estimated value {v0} vs mean {v1}: a long tail of large tenders.", { v0: f.mad(v.median), v1: f.mad(v.mean) }),
          t("Award market {v0} overall (HHI {v1}), but sector markets are concentrated.", { v0: tv(conc.band).toLowerCase(), v1: f.int(Math.round(conc.hhiValue ?? 0)) }),
        ],
        scope: t("All de-duplicated opportunities and awards in the synthetic dataset."),
        methodology: [t("Growth = trailing 12 months vs prior 12 months; ±20% thresholds; ≥6 records."), t("Data quality score {v0}/100 (40% completeness, 15% uniqueness, 15% consistency, 15% integrity, 15% outcome coverage).", { v0: f.fixed(q.score) })],
        findings: g.filter((x) => x.trend !== "Insufficient data").map((x) => ({ kind: "metric" as const, text: t("{v0}: {v1} vs {v2} publications{v3} — {v4}.", { v0: x.label, v1: x.current, v2: x.previous, v3: x.trend === "Emerging" ? "" : ` (${f.signedPct(x.change)})`, v4: x.trend === "Emerging" ? t("emerging from a low base") : tv(x.trend).toLowerCase() }), evidence: x.ids })),
        charts: [
          { title: t("Opportunities by sector"), note: `n = ${k.total}`, rows: sec.map((s) => ({ label: s.label, value: s.count, display: `${s.count} (${f.pct(s.share)})` })) },
          { title: t("Publications per quarter"), note: `n = ${ts.n}`, rows: ts.points.map((p) => ({ label: p.period, value: p.count, display: String(p.count) })) },
          { title: t("Opportunities by region"), note: `n = ${k.total}`, rows: reg.map((r) => ({ label: r.label, value: r.count, display: String(r.count) })) },
        ],
        tables: [
          { title: t("Sectors"), rows: sec.map((s) => ({ sector: s.label, opportunities: s.count, share: f.pct(s.share, 1), known_value_mad: s.totalValue, median_value_mad: s.medianValue ?? "" })) },
          { title: t("Growth signals"), rows: g.map((x) => ({ sector: x.label, last_12m: x.current, prior_12m: x.previous, change: f.signedPct(x.change), trend: x.trend })) },
          { title: t("Concentration by sector"), rows: concentrationBySector(c).map((r) => ({ sector: r.label, awards: r.awards, hhi: Math.round(r.hhiValue ?? 0), band: r.band, top5_share: f.pct(r.top5Share) })) },
          { title: t("Buyer dependence"), rows: buyerDependence(c).filter((d) => d.dependent).map((d) => ({ buyer: d.buyerName, awards: d.awards, main_supplier: d.topSupplierName, share: f.pct(d.share) })) },
        ],
        recommendations: [
          t("Focus business development on rising sectors: {v0}.", { v0: g.filter((x) => x.trend === "Rising").slice(0, 4).map((x) => x.label).join(", ") }),
          t("Use Future Signals to prepare for recurring needs before publication."),
          t("Avoid segments dominated by a single awardee unless a partner gives a clear edge."),
        ],
        limitations: commonLimits(),
      };
    }
    case "supplier": {
      if (subjectId) {
        const s = suppliers.find((x) => x.id === subjectId);
        if (!s) return null;
        const ints = (extra.interactions ?? c.ds.interactions).filter((i) => i.supplierId === s.id);
        const mts = (extra.meetings ?? c.ds.meetings).filter((m) => m.supplierId === s.id);
        const active = c.clean.filter((o) => (o.status === "Open" || o.status === "Closing soon") && o.sectorId && s.sectorIds.includes(o.sectorId));
        return {
          ...base(c, kind, t("Supplier Intelligence — {v0}", { v0: s.name }), `${s.city}, ${tv(s.country)}`, s.id),
          summary: [
            t("Relationship stage: {v0}; owner {v1}; last interaction {v2}; follow-up {v3}.", { v0: tv(s.status), v1: tv(s.relationshipOwner), v2: f.date(s.lastInteraction), v3: f.date(s.followUpDate) }),
            t("Sectors: {v0}; coverage: {v1}.", { v0: s.sectorIds.map((x) => c.sector.get(x)?.name).join(", "), v1: s.coverage.join(", ") }),
            t("{v0} active tenders in its sectors; {v1} interactions and {v2} meetings recorded.", { v0: active.length, v1: ints.length, v2: mts.length }),
          ],
          scope: t("Supplier {v0}, its contacts, interactions and meetings.", { v0: s.id }),
          methodology: [t("Relevance to demand = active tenders whose sector matches the supplier's declared sectors.")],
          findings: [
            { kind: "fact", text: t("Services: {v0}. Specialisation: {v1}.", { v0: s.services.join(", "), v1: s.specialisation }) },
            { kind: "fact", text: t("Previous cooperation: {v0}.", { v0: s.previousCooperation }) },
            { kind: s.contactIds.length ? "fact" : "unknown", text: s.contactIds.length ? t("{v0} named contact(s) on file.", { v0: s.contactIds.length }) : t("No named contact recorded.") },
          ],
          charts: [],
          tables: [
            { title: t("Interaction history"), rows: ints.map((i) => ({ date: i.date, type: i.type, summary: i.summary, by: i.by, stage_after: i.stageAfter ?? "" })) },
            { title: t("Meetings"), rows: mts.map((m) => ({ date: m.date, time: m.time, subject: m.subject, status: m.status, location: m.location })) },
            { title: t("Relevant active tenders"), rows: active.map((o) => ({ reference: o.reference, object: o.title, deadline: o.deadline ?? "", value_mad: o.estimatedValue ?? "" })) },
          ],
          recommendations: [s.followUpDate && s.followUpDate < c.ref ? t("Follow-up is overdue: contact the provider.") : t("Keep the planned follow-up."), active.length ? t("Share relevant active tenders with this provider to test joint-bid interest.") : t("No active tender currently matches; keep warm.")],
          limitations: [...commonLimits(), t("Relationship data reflects the demo workspace and may include user-entered records.")],
        };
      }
      const byStage = RELATIONSHIP_STAGES.map((st) => ({ st, n: suppliers.filter((s) => s.status === st).length }));
      const byCountry = Object.entries(suppliers.reduce<Record<string, number>>((a, s) => ((a[s.country] = (a[s.country] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1]);
      return {
        ...base(c, kind, t("Supplier Network Intelligence"), t("Network-wide view"), null),
        summary: [
          t("{v0} suppliers in {v1} countries; {v2} active partners.", { v0: suppliers.length, v1: byCountry.length, v2: suppliers.filter((s) => s.status === "Active partner").length }),
          t("{v0} overdue follow-ups.", { v0: suppliers.filter((s) => s.followUpDate && s.followUpDate < c.ref && !["Rejected", "Inactive"].includes(s.status)).length }),
          t("{v0} suppliers have no named contact.", { v0: suppliers.filter((s) => !s.contactIds.length).length }),
        ],
        scope: t("All suppliers and partners in the network (synthetic and user-entered)."),
        methodology: [t("Counts by relationship stage, country and primary sector.")],
        findings: sectorRecurrence(c).slice(0, 5).map((r) => ({ kind: "metric" as const, text: t("{v0}: {v1} active partner(s) for a sector with {v2} tenders ({v3} recurring).", { v0: r.sectorName, v1: suppliers.filter((s) => s.sectorIds.includes(r.sectorId) && s.status === "Active partner").length, v2: r.opportunities, v3: f.pct(r.recurringShare) }) })),
        charts: [
          { title: t("Suppliers by relationship stage"), note: `n = ${suppliers.length}`, rows: byStage.map((x) => ({ label: tv(x.st), value: x.n, display: String(x.n) })) },
          { title: t("Suppliers by country"), note: `n = ${suppliers.length}`, rows: byCountry.map(([k, n]) => ({ label: tv(k), value: n, display: String(n) })) },
        ],
        tables: [{ title: t("Suppliers"), rows: suppliers.map((s) => ({ supplier: s.name, country: s.country, city: s.city, sectors: s.sectorIds.map((x) => c.sector.get(x)?.name).join("; "), stage: s.status, owner: s.relationshipOwner, follow_up: s.followUpDate ?? "" })) }],
        recommendations: [t("Clear overdue follow-ups first."), t("Recruit partners in sectors with demand but no active partner (see Provider Acquisition → Discovery).")],
        limitations: commonLimits(),
      };
    }
    case "signals": {
      const sigs = futureSignals(c).filter((s) => s.state !== "Overdue");
      return {
        ...base(c, kind, t("Future Procurement Signals Report"), t("Expected re-procurement windows (analytical expectations, not announcements)"), null),
        summary: [
          t("{v0} forward signals: {v1} high, {v2} medium, {v3} low confidence.", { v0: sigs.length, v1: sigs.filter((s) => s.level === "High").length, v2: sigs.filter((s) => s.level === "Medium").length, v3: sigs.filter((s) => s.level === "Low").length }),
          t("{v0} windows are open now.", { v0: sigs.filter((s) => s.state === "Within window").length }),
          t("Signals are statistical projections of past publication cycles; they are not official announcements."),
        ],
        scope: t("Recurring buyer × sector purchasing lines with ≥2 dated publications and a median interval of 150–1,300 days."),
        methodology: [
          t("Expected date = last publication + median interval; window ± max(30 d, min(MAD, 25% of interval), 12% of interval)."),
          t("Confidence = occurrences (0.30/0.45/0.55) + regularity 0.25×(1−CV) + contract-end alignment 0.15 + recent activity 0.05 − overdue penalty 0.20."),
        ],
        findings: sigs.slice(0, 12).map((s) => ({ kind: "interpretation" as const, text: `${s.buyerName} · ${s.sectorName}: ${f.date(s.windowStart)} → ${f.date(s.windowEnd)} (${tv(s.level)}). ${s.explanation}`, evidence: s.historical.map((h) => h.id) })),
        charts: [{ title: t("Signals by sector"), note: `n = ${sigs.length}`, rows: Object.entries(sigs.reduce<Record<string, number>>((a, s) => ((a[s.sectorName] = (a[s.sectorName] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ label: k, value: n, display: String(n) })) }],
        tables: [{ title: t("Signals"), rows: sigs.map((s) => ({ buyer: s.buyerName, sector: s.sectorName, window_start: s.windowStart, window_end: s.windowEnd, confidence: s.confidence.toFixed(2), level: s.level, state: s.state, past_publications: s.historical.length, median_interval_days: s.medianIntervalDays, incumbent: s.incumbent?.name ?? "" })) }],
        recommendations: [t("Engage buyers in open windows now; prepare partners for high-confidence upcoming windows."), t("Re-check overdue lines with buyers before planning.")],
        limitations: [...commonLimits(), t("Recurrence detection cannot see needs published outside the monitored sources.")],
      };
    }
  }
}
