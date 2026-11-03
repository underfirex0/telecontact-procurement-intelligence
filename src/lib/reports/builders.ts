/**
 * Report builders — turn analytical results into structured intelligence
 * documents. Pure functions: same inputs → same document (except generatedAt).
 * The same ReportDoc drives the on-screen document, PDF (print), Excel and CSV.
 */
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
  { kind: "opportunity", label: "Opportunity Intelligence Report", subject: "opportunity", description: "Full dossier for one tender: buyer, competition, suppliers, risks, readiness." },
  { kind: "buyer", label: "Buyer Intelligence Report", subject: "buyer", description: "Purchasing profile, recurrence and awardee relationships of one buyer." },
  { kind: "competitor", label: "Competitor Intelligence Report", subject: "company", description: "Bids, awards, positioning and buyer relationships of one company." },
  { kind: "awardee", label: "Awardee Intelligence Report", subject: "sector", description: "Who wins, by sector or across the market, with concentration." },
  { kind: "market", label: "Market Intelligence Report", subject: "none", description: "Demand, growth, regions, values and concentration for the whole market." },
  { kind: "supplier", label: "Supplier Intelligence Report", subject: "supplier", description: "One supplier profile, or the whole network when no supplier is chosen." },
  { kind: "signals", label: "Future Procurement Signals Report", subject: "none", description: "Expected re-procurement windows with confidence and evidence." },
  { kind: "bid", label: "Bid Readiness Report", subject: "bid", description: "Readiness score, team assessment, checklist and decision for one tender." },
];

const COMMON_LIMITS = [
  "All records are SYNTHETIC DEMO DATA generated from a fixed seed; figures illustrate the method, not the real Moroccan market.",
  "Award outcomes are recorded for only part of the closed tenders; award-based metrics describe the recorded subset.",
  "Bidder lists are disclosed for a small number of tenders; win rates rely on small samples.",
];
const SOURCES = (c: Ctx) => [
  `${c.ds.meta.name} — generator ${c.ds.meta.generator}, seed ${c.ds.meta.seed}.`,
  `Reference date ${c.ds.meta.referenceDate}; publication period ${c.ds.meta.periodStart} – ${c.ds.meta.periodEnd}.`,
  "Fictional source channels: synthetic portal feed, award notices, bid-opening minutes, buyer websites, press notices.",
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
        ...base(c, kind, isBid ? `Bid Readiness — ${o.reference}` : `Opportunity Intelligence — ${o.reference}`, o.title, o.id),
        summary: [
          `${d.readiness.posture} (readiness ${d.readiness.score}/100). ${d.readiness.verdict}`,
          `${c.buyer.get(o.buyerId ?? "")?.name ?? "Unidentified buyer"} · ${c.sector.get(o.sectorId ?? "")?.name ?? "Unclassified"} · estimated ${f.mad(o.estimatedValue)} · deadline ${f.date(o.deadline)}.`,
          d.incumbent ? `Incumbent in this purchasing line: ${d.incumbent.name} (${d.incumbent.winsInLine} win(s)).` : "No incumbent recorded for this purchasing line.",
          `${d.suppliers.length} matching network suppliers, ${d.suppliers.filter((m) => ["Active partner", "Negotiation"].includes(m.supplier.status)).length} active or negotiating.`,
          ...(isBid && a ? [`Team decision: ${a.decision} (stage ${a.stage}); checklist ${a.checklist.filter((x) => x.done).length}/${a.checklist.length} complete; owner ${a.responsible}.`] : isBid ? ["No team assessment recorded yet."] : []),
        ],
        scope: `One opportunity (${o.id}) and every record connected to it: buyer history, similar tenders, bidders, awardees, sector concentration, matched suppliers and recurrence.`,
        methodology: [
          "Similarity score: sector 0.45, same buyer 0.20, value proximity 0.15 (log-ratio), region 0.10, object-text Jaccard 0.10; threshold 0.45.",
          "Readiness = 25% commercial attractiveness + 20% competitive openness + 15% buyer reliability + 15% partner availability + 15% time feasibility + 10% information completeness.",
          "Concentration: Herfindahl-Hirschman Index on award value by sector.",
        ],
        findings: d.statements.filter((s) => s.kind !== "recommendation").map((s) => ({ kind: s.kind, text: `${s.section}: ${s.text}`, evidence: s.evidence })),
        charts: [
          { title: "Readiness components (0–100)", note: "Computed by the dossier engine", rows: d.readiness.components.map((x) => ({ label: x.label, value: x.score, display: String(x.score) })) },
          ...(d.awardees.length ? [{ title: "Awardees of similar contracts", note: `${d.awardees.reduce((s, x) => s + x.awards, 0)} awards`, rows: d.awardees.slice(0, 8).map((x) => ({ label: x.name, value: x.awards, display: `${x.awards}` })) }] : []),
        ],
        tables: [
          { title: "Similar opportunities", rows: d.similar.map((s) => ({ score: s.score, reference: s.opp.reference, object: s.opp.title, published: s.opp.publicationDate ?? "", value_mad: s.opp.estimatedValue ?? "", status: s.opp.status, awarded_to: s.awardees.join("; ") })) },
          { title: "Matched suppliers", rows: d.suppliers.map((m) => ({ fit: m.score, supplier: m.supplier.name, country: m.supplier.country, stage: m.supplier.status, basis: m.reasons.join("; ") })) },
          { title: "Risks", rows: d.risks.map((r) => ({ level: r.level, risk: r.title, detail: r.detail })) },
          ...(isBid && a ? [{ title: "Action checklist", rows: a.checklist.map((x) => ({ action: x.label, owner: x.owner ?? "", due: x.due ?? "", done: x.done ? "yes" : "no" })) }, { title: "Team scores (1–5)", rows: Object.entries(a.scores).map(([k, v]) => ({ criterion: k, score: v })) }] : []),
        ],
        recommendations: d.actions.map((x) => `[${x.priority}] ${x.text}`),
        limitations: [...COMMON_LIMITS, ...d.missing.map((m) => `${m.field}: ${m.impact}`)],
      };
    }
    case "buyer": {
      if (!subjectId) return null;
      const p = buyerProfile(c, subjectId);
      if (!p) return null;
      return {
        ...base(c, kind, `Buyer Intelligence — ${p.summary.acronym}`, p.summary.name, subjectId),
        summary: [
          `${p.summary.opportunities} recorded opportunities (${f.num(p.publicationFrequency.perYear, 1)} per year); ${p.summary.active} active now.`,
          `Main purchasing category: ${p.sectorMix[0]?.label ?? "—"} (${f.pct(p.sectorMix[0]?.share)}). Median estimated value ${f.mad(p.values.median)}.`,
          `${p.awardsTotal} recorded awards to ${p.awardees.length} awardees${p.awardees[0] ? `; leading awardee ${p.awardees[0].name} (${f.pct(p.awardees[0].share)})` : ""}.`,
          `${p.recurring.length} recurring purchasing line(s) detected.`,
        ],
        scope: `All de-duplicated opportunities and awards linked to buyer ${subjectId}, 2023–2026.`,
        methodology: ["Publication rate = dated publications ÷ span in years between first and last publication.", "Recurring line = ≥2 dated publications in one sector; regularity from the coefficient of variation of intervals (≤0.35 = regular)."],
        findings: p.observations.map((o) => ({ kind: o.evidence.length ? "interpretation" as const : "unknown" as const, text: o.text, evidence: o.evidence })),
        charts: [
          { title: "Opportunities by sector", note: `n = ${p.opportunities.length}`, rows: p.sectorMix.map((s) => ({ label: s.label, value: s.count, display: `${s.count} (${f.pct(s.share)})` })) },
          { title: "Publications per year", note: "2026 to 2 Nov", rows: p.perYear.map((y) => ({ label: String(y.year), value: y.count, display: String(y.count) })) },
        ],
        tables: [
          { title: "Awardee relationships", rows: p.awardees.map((a) => ({ awardee: a.name, awards: a.awards, share: f.pct(a.share), value_mad: a.value, sectors: a.sectors.join("; ") })) },
          { title: "Recurring lines", rows: p.recurring.map((r) => ({ sector: r.sectorName, publications: r.occurrences.length, median_interval_days: r.medianIntervalDays ?? "", regularity: r.regularity })) },
          { title: "Opportunities", rows: p.opportunities.map((o) => ({ reference: o.reference, object: o.title, published: o.publicationDate ?? "", deadline: o.deadline ?? "", value_mad: o.estimatedValue ?? "", status: o.status })) },
        ],
        recommendations: [
          ...(p.recurring.length ? [`Plan for recurring needs: ${p.recurring.map((r) => r.sectorName).join(", ")}.`] : []),
          ...(p.awardees[0] && p.awardees[0].share >= 0.5 && p.awardsTotal >= 3 ? [`Expect incumbent advantage for ${p.awardees[0].name}; differentiate on price or technical value.`] : []),
          "Monitor the buyer's active tenders and add relevant ones to the Bid Workspace.",
        ],
        limitations: COMMON_LIMITS,
      };
    }
    case "competitor": {
      if (!subjectId) return null;
      const p = companyProfile(c, subjectId);
      if (!p) return null;
      const s = p.summary;
      return {
        ...base(c, kind, `Competitor Intelligence — ${s.name}`, `${s.primarySector} · ${s.city}`, subjectId),
        summary: [
          `Role: ${s.role}. ${s.participations} recorded bids (win rate ${s.winRate === null ? "n/a" : f.pct(s.winRate)} on ${s.decided} decided) and ${s.awards} verified awards worth ${f.mad(s.awardValue)}.`,
          p.positioning.rankInSector ? `Ranks #${p.positioning.rankInSector} of ${p.positioning.sectorAwardees} awardees in ${p.positioning.sectorLabel}.` : `No award in its primary sector (${p.positioning.sectorLabel}).`,
          `${s.buyers} awarding buyer(s), ${s.repeatBuyers} with repeat business.`,
        ],
        scope: `Participations and awards recorded for company ${subjectId}.`,
        methodology: ["Win rate = awarded ÷ decided participations (Awarded, Unsuccessful, Shortlisted); pending and withdrawn bids excluded.", "Awards on tenders without a disclosed bidder list are counted as awards but excluded from the win rate."],
        findings: p.observations.map((o) => ({ kind: "metric" as const, text: o.text, evidence: o.evidence })),
        charts: [{ title: "Awards per year", note: "verified awards", rows: p.byYear.map((y) => ({ label: y.year, value: y.awards, display: `${y.awards} · ${f.mad(y.value)}` })) }],
        tables: [
          { title: "Awards", rows: p.awards.map((a) => ({ date: a.awardDate, reference: a.reference, object: a.title, buyer: a.buyer, sector: a.sector, amount_mad: a.amount ?? "" })) },
          { title: "Participations", rows: p.participations.map((x) => ({ submitted: x.submittedOn, reference: x.reference, buyer: x.buyer, bid_mad: x.bidAmount ?? "", outcome: x.outcome, awarded_to: x.awardedTo.join("; ") })) },
          { title: "Head-to-head", rows: p.headToHead.map((h) => ({ competitor: h.name, encounters: h.meetings, we_won: h.weWon, they_won: h.theyWon })) },
        ],
        recommendations: [
          p.buyerRelationships.some((b) => b.repeat) ? `Treat ${p.buyerRelationships.filter((b) => b.repeat).map((b) => b.name).join(", ")} as this competitor's strongholds.` : "No entrenched buyer relationship detected.",
          "Track its next awards to update positioning.",
        ],
        limitations: COMMON_LIMITS,
      };
    }
    case "awardee": {
      const leaders = sectorLeaders(c, subjectId);
      const conc = subjectId ? concentrationBySector(c).find((r) => r.key === subjectId) ?? null : overallConcentration(c);
      const label = subjectId ? c.sector.get(subjectId)?.name ?? subjectId : "All sectors";
      return {
        ...base(c, kind, `Awardee Intelligence — ${label}`, "Who receives the contracts", subjectId),
        summary: [
          `${leaders.reduce((a, l) => a + l.awards, 0)} recorded awards to ${leaders.length} awardees.`,
          conc ? `Concentration: HHI ${Math.round(conc.hhiValue ?? 0)} (${conc.band.toLowerCase()}); top-5 share ${f.pct(conc.top5Share)}${conc.smallSample ? " — small sample" : ""}.` : "No concentration figure.",
          leaders[0] ? `Leader: ${leaders[0].name} with ${leaders[0].awards} awards (${f.pct(leaders[0].share)}).` : "",
        ].filter(Boolean),
        scope: `Recorded awards ${subjectId ? `in ${label}` : "across all sectors"}.`,
        methodology: ["Shares by number of awards; HHI on award value.", "Bands: <1,500 unconcentrated, 1,500–2,500 moderate, >2,500 high."],
        findings: leaders.slice(0, 5).map((l) => ({ kind: "metric" as const, text: `${l.name}: ${l.awards} awards, ${f.mad(l.value)}, ${l.buyers} buyer(s).` })),
        charts: [{ title: "Leading awardees", note: "by number of awards", rows: leaders.slice(0, 10).map((l) => ({ label: l.name, value: l.awards, display: `${l.awards} (${f.pct(l.share)})` })) }],
        tables: [
          { title: "Awardees", rows: leaders.map((l) => ({ awardee: l.name, awards: l.awards, share: f.pct(l.share), value_mad: l.value, buyers: l.buyers })) },
          ...(!subjectId ? [{ title: "Concentration by sector", rows: concentrationBySector(c).map((r) => ({ sector: r.label, awards: r.awards, awardees: r.awardees, leader: r.top1?.name ?? "", lead_share: f.pct(r.top1?.share), hhi: Math.round(r.hhiValue ?? 0), band: r.band })) }] : []),
        ],
        recommendations: ["Prioritise segments where concentration is moderate and no single awardee exceeds 40%.", "Investigate leaders' buyer relationships before competing head-on."],
        limitations: COMMON_LIMITS,
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
        ...base(c, kind, "Market Intelligence Report", "Synthetic Moroccan public procurement market, 2023–2026", null),
        summary: [
          `${k.total} unique opportunities (${c.duplicates.length} duplicates removed); ${k.active} active, ${k.upcoming14} closing within 14 days.`,
          `Rising sectors: ${g.filter((x) => x.trend === "Rising").map((x) => `${x.label} (${f.signedPct(x.change)})`).join(", ") || "none"}.${g.some((x) => x.trend === "Emerging") ? ` Emerging from a low base: ${g.filter((x) => x.trend === "Emerging").map((x) => `${x.label} (${x.previous} → ${x.current})`).join(", ")}.` : ""}`,
          `${sec[0]?.label} leads activity (${f.pct(sec[0]?.share)}); ${reg[0]?.label} leads regions (${f.pct(reg[0]?.share)}).`,
          `Median estimated value ${f.mad(v.median)} vs mean ${f.mad(v.mean)}: a long tail of large tenders.`,
          `Award market ${conc.band.toLowerCase()} overall (HHI ${Math.round(conc.hhiValue ?? 0)}), but sector markets are concentrated.`,
        ],
        scope: "All de-duplicated opportunities and awards in the synthetic dataset.",
        methodology: ["Growth = trailing 12 months vs prior 12 months; ±20% thresholds; ≥6 records.", `Data quality score ${q.score}/100 (40% completeness, 15% uniqueness, 15% consistency, 15% integrity, 15% outcome coverage).`],
        findings: g.filter((x) => x.trend !== "Insufficient data").map((x) => ({ kind: "metric" as const, text: `${x.label}: ${x.current} vs ${x.previous} publications${x.trend === "Emerging" ? "" : ` (${f.signedPct(x.change)})`} — ${x.trend === "Emerging" ? "emerging from a low base" : x.trend.toLowerCase()}.`, evidence: x.ids })),
        charts: [
          { title: "Opportunities by sector", note: `n = ${k.total}`, rows: sec.map((s) => ({ label: s.label, value: s.count, display: `${s.count} (${f.pct(s.share)})` })) },
          { title: "Publications per quarter", note: `n = ${ts.n}`, rows: ts.points.map((p) => ({ label: p.period, value: p.count, display: String(p.count) })) },
          { title: "Opportunities by region", note: `n = ${k.total}`, rows: reg.map((r) => ({ label: r.label, value: r.count, display: String(r.count) })) },
        ],
        tables: [
          { title: "Sectors", rows: sec.map((s) => ({ sector: s.label, opportunities: s.count, share: f.pct(s.share, 1), known_value_mad: s.totalValue, median_value_mad: s.medianValue ?? "" })) },
          { title: "Growth signals", rows: g.map((x) => ({ sector: x.label, last_12m: x.current, prior_12m: x.previous, change: f.signedPct(x.change), trend: x.trend })) },
          { title: "Concentration by sector", rows: concentrationBySector(c).map((r) => ({ sector: r.label, awards: r.awards, hhi: Math.round(r.hhiValue ?? 0), band: r.band, top5_share: f.pct(r.top5Share) })) },
          { title: "Buyer dependence", rows: buyerDependence(c).filter((d) => d.dependent).map((d) => ({ buyer: d.buyerName, awards: d.awards, main_supplier: d.topSupplierName, share: f.pct(d.share) })) },
        ],
        recommendations: [
          `Focus business development on rising sectors: ${g.filter((x) => x.trend === "Rising").slice(0, 4).map((x) => x.label).join(", ")}.`,
          "Use Future Signals to prepare for recurring needs before publication.",
          "Avoid segments dominated by a single awardee unless a partner gives a clear edge.",
        ],
        limitations: COMMON_LIMITS,
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
          ...base(c, kind, `Supplier Intelligence — ${s.name}`, `${s.city}, ${s.country}`, s.id),
          summary: [
            `Relationship stage: ${s.status}; owner ${s.relationshipOwner}; last interaction ${f.date(s.lastInteraction)}; follow-up ${f.date(s.followUpDate)}.`,
            `Sectors: ${s.sectorIds.map((x) => c.sector.get(x)?.name).join(", ")}; coverage: ${s.coverage.join(", ")}.`,
            `${active.length} active tenders in its sectors; ${ints.length} interactions and ${mts.length} meetings recorded.`,
          ],
          scope: `Supplier ${s.id}, its contacts, interactions and meetings.`,
          methodology: ["Relevance to demand = active tenders whose sector matches the supplier's declared sectors."],
          findings: [
            { kind: "fact", text: `Services: ${s.services.join(", ")}. Specialisation: ${s.specialisation}.` },
            { kind: "fact", text: `Previous cooperation: ${s.previousCooperation}.` },
            { kind: s.contactIds.length ? "fact" : "unknown", text: s.contactIds.length ? `${s.contactIds.length} named contact(s) on file.` : "No named contact recorded." },
          ],
          charts: [],
          tables: [
            { title: "Interaction history", rows: ints.map((i) => ({ date: i.date, type: i.type, summary: i.summary, by: i.by, stage_after: i.stageAfter ?? "" })) },
            { title: "Meetings", rows: mts.map((m) => ({ date: m.date, time: m.time, subject: m.subject, status: m.status, location: m.location })) },
            { title: "Relevant active tenders", rows: active.map((o) => ({ reference: o.reference, object: o.title, deadline: o.deadline ?? "", value_mad: o.estimatedValue ?? "" })) },
          ],
          recommendations: [s.followUpDate && s.followUpDate < c.ref ? "Follow-up is overdue: contact the provider." : "Keep the planned follow-up.", active.length ? "Share relevant active tenders with this provider to test joint-bid interest." : "No active tender currently matches; keep warm."],
          limitations: [...COMMON_LIMITS, "Relationship data reflects the demo workspace and may include user-entered records."],
        };
      }
      const byStage = RELATIONSHIP_STAGES.map((st) => ({ st, n: suppliers.filter((s) => s.status === st).length }));
      const byCountry = Object.entries(suppliers.reduce<Record<string, number>>((a, s) => ((a[s.country] = (a[s.country] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1]);
      return {
        ...base(c, kind, "Supplier Network Intelligence", "Network-wide view", null),
        summary: [
          `${suppliers.length} suppliers in ${byCountry.length} countries; ${suppliers.filter((s) => s.status === "Active partner").length} active partners.`,
          `${suppliers.filter((s) => s.followUpDate && s.followUpDate < c.ref && !["Rejected", "Inactive"].includes(s.status)).length} overdue follow-ups.`,
          `${suppliers.filter((s) => !s.contactIds.length).length} suppliers have no named contact.`,
        ],
        scope: "All suppliers and partners in the network (synthetic and user-entered).",
        methodology: ["Counts by relationship stage, country and primary sector."],
        findings: sectorRecurrence(c).slice(0, 5).map((r) => ({ kind: "metric" as const, text: `${r.sectorName}: ${suppliers.filter((s) => s.sectorIds.includes(r.sectorId) && s.status === "Active partner").length} active partner(s) for a sector with ${r.opportunities} tenders (${f.pct(r.recurringShare)} recurring).` })),
        charts: [
          { title: "Suppliers by relationship stage", note: `n = ${suppliers.length}`, rows: byStage.map((x) => ({ label: x.st, value: x.n, display: String(x.n) })) },
          { title: "Suppliers by country", note: `n = ${suppliers.length}`, rows: byCountry.map(([k, n]) => ({ label: k, value: n, display: String(n) })) },
        ],
        tables: [{ title: "Suppliers", rows: suppliers.map((s) => ({ supplier: s.name, country: s.country, city: s.city, sectors: s.sectorIds.map((x) => c.sector.get(x)?.name).join("; "), stage: s.status, owner: s.relationshipOwner, follow_up: s.followUpDate ?? "" })) }],
        recommendations: ["Clear overdue follow-ups first.", "Recruit partners in sectors with demand but no active partner (see Provider Acquisition → Discovery)."],
        limitations: COMMON_LIMITS,
      };
    }
    case "signals": {
      const sigs = futureSignals(c).filter((s) => s.state !== "Overdue");
      return {
        ...base(c, kind, "Future Procurement Signals Report", "Expected re-procurement windows (analytical expectations, not announcements)", null),
        summary: [
          `${sigs.length} forward signals: ${sigs.filter((s) => s.level === "High").length} high, ${sigs.filter((s) => s.level === "Medium").length} medium, ${sigs.filter((s) => s.level === "Low").length} low confidence.`,
          `${sigs.filter((s) => s.state === "Within window").length} windows are open now.`,
          "Signals are statistical projections of past publication cycles; they are not official announcements.",
        ],
        scope: "Recurring buyer × sector purchasing lines with ≥2 dated publications and a median interval of 150–1,300 days.",
        methodology: [
          "Expected date = last publication + median interval; window ± max(30 d, MAD, 12% of interval).",
          "Confidence = occurrences (0.30/0.45/0.55) + regularity 0.25×(1−CV) + contract-end alignment 0.15 + recent activity 0.05 − overdue penalty 0.20.",
        ],
        findings: sigs.slice(0, 12).map((s) => ({ kind: "interpretation" as const, text: `${s.buyerName} · ${s.sectorName}: ${s.windowStart} → ${s.windowEnd} (${s.level}). ${s.explanation}`, evidence: s.historical.map((h) => h.id) })),
        charts: [{ title: "Signals by sector", note: `n = ${sigs.length}`, rows: Object.entries(sigs.reduce<Record<string, number>>((a, s) => ((a[s.sectorName] = (a[s.sectorName] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ label: k, value: n, display: String(n) })) }],
        tables: [{ title: "Signals", rows: sigs.map((s) => ({ buyer: s.buyerName, sector: s.sectorName, window_start: s.windowStart, window_end: s.windowEnd, confidence: s.confidence.toFixed(2), level: s.level, state: s.state, past_publications: s.historical.length, median_interval_days: s.medianIntervalDays, incumbent: s.incumbent?.name ?? "" })) }],
        recommendations: ["Engage buyers in open windows now; prepare partners for high-confidence upcoming windows.", "Re-check overdue lines with buyers before planning."],
        limitations: [...COMMON_LIMITS, "Recurrence detection cannot see needs published outside the monitored sources."],
      };
    }
  }
}
