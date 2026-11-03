/**
 * Data quality analysis.
 *
 * Overall score (0–100), transparent formula:
 *   score = 40% × Completeness   (mean completeness of 8 critical opportunity fields)
 *         + 15% × Uniqueness     (1 − detected duplicate rate)
 *         + 15% × Consistency    (1 − share of records whose object text contradicts their sector code)
 *         + 15% × Integrity      (share of relationship checks that pass)
 *         + 15% × Outcome coverage (share of award-eligible tenders with a recorded award)
 */
import { t, tk } from "../i18n";
import { SECTORS } from "../data/reference";
import { diffDays } from "../dates";
import type { Opportunity } from "../types";
import { type Ctx, normalise } from "./context";

export interface FieldCompleteness {
  field: string;
  label: string;
  present: number;
  total: number;
  rate: number;
  critical: boolean;
}

export interface QualityIssue {
  kind: "Missing information" | "Inconsistent classification" | "Duplicate record" | "Duplicate entity" | "Incomplete relationship" | "Unreliable record";
  severity: "High" | "Medium" | "Low";
  recordType: "Opportunity" | "Company" | "Award" | "Participation" | "Supplier";
  recordId: string;
  detail: string;
}

export interface QualityReport {
  totals: { opportunities: number; uniqueReferences: number; duplicates: number; buyers: number; companies: number; awards: number; participations: number; suppliers: number };
  fields: FieldCompleteness[];
  coverage: {
    awardEligible: number;
    awardCovered: number;
    awardCoverage: number;
    awardeeIdentified: number;
    awardAmountKnown: number;
    awardedWithBidders: number;
    awardedTotal: number;
    bidderCoverage: number;
    publicationRange: [string, string] | null;
    deadlineRange: [string, string] | null;
  };
  components: { key: string; label: string; weight: number; value: number; explanation: string }[];
  score: number;
  issues: QualityIssue[];
  worstFields: FieldCompleteness[];
  duplicateEntities: { ids: string[]; names: string[]; reason: string }[];
  inconsistent: { id: string; coded: string; textSuggests: string }[];
  unreliable: { id: string; missing: string[] }[];
}

const CRITICAL: { field: keyof Opportunity; label: string }[] = [
  { field: "publicationDate", label: tk("Publication date") },
  { field: "deadline", label: tk("Submission deadline") },
  { field: "buyerId", label: tk("Buyer identification") },
  { field: "sectorId", label: tk("Sector classification") },
  { field: "regionId", label: tk("Region") },
  { field: "city", label: tk("City") },
  { field: "estimatedValue", label: tk("Estimated budget") },
  { field: "contractDurationMonths", label: tk("Contract duration") },
];

/** Which sector does the object text point to? Returns sector id or null. */
export function sectorFromText(title: string): string | null {
  const t = normalise(title);
  let best: string | null = null;
  let bestHits = 0;
  for (const s of SECTORS) {
    const hits = s.keywords.filter((k) => t.includes(normalise(k))).length + s.titles.filter((x) => t.startsWith(normalise(x).slice(0, 28))).length * 2;
    if (hits > bestHits) {
      best = s.id;
      bestHits = hits;
    }
  }
  return best;
}

export function analyseQuality(c: Ctx): QualityReport {
  const all = c.ds.opportunities;
  const issues: QualityIssue[] = [];

  const fields: FieldCompleteness[] = CRITICAL.map(({ field, label }) => {
    const present = all.filter((o) => o[field] !== null && o[field] !== undefined && o[field] !== "").length;
    return { field: String(field), label, present, total: all.length, rate: present / all.length, critical: true };
  });
  const docsPresent = all.filter((o) => o.documents.length >= 3).length;
  fields.push({ field: "documents", label: tk("Tender documents (≥3)"), present: docsPresent, total: all.length, rate: docsPresent / all.length, critical: false });

  for (const o of all) {
    const missing = CRITICAL.filter(({ field }) => o[field] === null || o[field] === undefined).map((f) => f.label);
    for (const m of missing) {
      issues.push({ kind: "Missing information", severity: ["Buyer identification", "Submission deadline", "Sector classification"].includes(m) ? "High" : "Medium", recordType: "Opportunity", recordId: o.id, detail: t("{v0} not provided by source.", { v0: t(m) }) });
    }
  }
  const unreliable = all
    .map((o) => ({ id: o.id, missing: CRITICAL.filter(({ field }) => o[field] === null || o[field] === undefined).map((f) => f.label) }))
    .filter((x) => x.missing.length >= 2);
  for (const u of unreliable) issues.push({ kind: "Unreliable record", severity: "High", recordType: "Opportunity", recordId: u.id, detail: t("{v0} critical fields missing ({v1}). Excluded from value-based metrics where relevant.", { v0: u.missing.length, v1: u.missing.map((x) => t(x)).join(", ") }) });

  // duplicates
  for (const d of c.duplicates) issues.push({ kind: "Duplicate record", severity: "High", recordType: "Opportunity", recordId: d.id, detail: t("Same reference, buyer and object as {v0}; excluded from analytics (earliest record kept).", { v0: d.keptId }) });

  // inconsistent classifications
  const inconsistent: QualityReport["inconsistent"] = [];
  for (const o of all) {
    if (!o.sectorId) continue;
    const suggested = sectorFromText(o.title);
    if (suggested && suggested !== o.sectorId) {
      inconsistent.push({ id: o.id, coded: o.sectorId, textSuggests: suggested });
      issues.push({ kind: "Inconsistent classification", severity: "Medium", recordType: "Opportunity", recordId: o.id, detail: t("Coded as {v0}; object text suggests {v1}.", { v0: c.sector.get(o.sectorId)?.name, v1: c.sector.get(suggested)?.name }) });
    }
  }

  // duplicate company entities (same ICE or same normalised core name)
  const duplicateEntities: QualityReport["duplicateEntities"] = [];
  const byIce = new Map<string, string[]>();
  for (const co of c.ds.companies) byIce.set(co.ice, [...(byIce.get(co.ice) ?? []), co.id]);
  for (const [ice, ids] of byIce) {
    if (ids.length > 1) {
      duplicateEntities.push({ ids, names: ids.map((i) => c.company.get(i)!.name), reason: t("Shared fictional ICE {v0}", { v0: ice }) });
      issues.push({ kind: "Duplicate entity", severity: "High", recordType: "Company", recordId: ids.join(" / "), detail: t("{v0} share identifier {v1}. Award counts may be split across entities.", { v0: ids.map((i) => c.company.get(i)!.name).join(t(" vs ")), v1: ice }) });
    }
  }

  // relationship integrity checks
  let checks = 0;
  let passed = 0;
  const check = (ok: boolean, issue?: QualityIssue) => {
    checks++;
    if (ok) passed++;
    else if (issue) issues.push(issue);
  };
  for (const a of c.ds.awards) {
    const o = c.opp.get(a.opportunityId);
    check(!!o && o.status === "Awarded", { kind: "Incomplete relationship", severity: "High", recordType: "Award", recordId: a.id, detail: t("Award linked to a tender not in Awarded status.") });
    check(c.company.has(a.companyId), { kind: "Incomplete relationship", severity: "High", recordType: "Award", recordId: a.id, detail: t("Awardee not found in company registry.") });
    check(a.amount !== null, { kind: "Missing information", severity: "Medium", recordType: "Award", recordId: a.id, detail: t("Award amount not published.") });
  }
  for (const o of c.clean.filter((x) => x.status === "Awarded")) {
    check((c.awardsByOpp.get(o.id) ?? []).length > 0, { kind: "Incomplete relationship", severity: "High", recordType: "Opportunity", recordId: o.id, detail: t("Status Awarded but no award record.") });
    const parts = c.partsByOpp.get(o.id);
    if (parts) {
      const winners = (c.awardsByOpp.get(o.id) ?? []).map((a) => a.companyId);
      const listed = parts.map((p) => p.companyId);
      check(winners.every((w) => listed.includes(w)), { kind: "Incomplete relationship", severity: "Medium", recordType: "Participation", recordId: o.id, detail: t("Awardee missing from the recorded bidder list.") });
    }
  }
  for (const s of c.ds.suppliers) {
    check(s.contactIds.length > 0, { kind: "Incomplete relationship", severity: "Low", recordType: "Supplier", recordId: s.id, detail: t("No named contact recorded for supplier.") });
  }

  // award coverage
  const eligible = c.clean.filter((o) => o.deadline && diffDays(c.ref, o.deadline) >= 45 && o.status !== "Cancelled" && o.status !== "Unsuccessful");
  const covered = eligible.filter((o) => (c.awardsByOpp.get(o.id) ?? []).length > 0);
  const awardedOpps = c.clean.filter((o) => (c.awardsByOpp.get(o.id) ?? []).length > 0);
  const withBidders = awardedOpps.filter((o) => (c.partsByOpp.get(o.id) ?? []).length > 0);
  const pubs = all.map((o) => o.publicationDate).filter(Boolean).sort() as string[];
  const dls = all.map((o) => o.deadline).filter(Boolean).sort() as string[];

  const completeness = fields.filter((f) => f.critical).reduce((a, f) => a + f.rate, 0) / CRITICAL.length;
  const uniqueness = 1 - c.duplicates.length / all.length;
  const consistency = 1 - inconsistent.length / all.length;
  const integrity = checks ? passed / checks : 1;
  const outcome = eligible.length ? covered.length / eligible.length : 0;
  const components = [
    { key: "completeness", label: tk("Completeness"), weight: 0.4, value: completeness, explanation: t("Mean fill rate of {v0} critical opportunity fields across {v1} records.", { v0: CRITICAL.length, v1: all.length }) },
    { key: "uniqueness", label: tk("Uniqueness"), weight: 0.15, value: uniqueness, explanation: t("{v0} duplicate records detected (same reference, buyer and object).", { v0: c.duplicates.length }) },
    { key: "consistency", label: tk("Consistency"), weight: 0.15, value: consistency, explanation: t("{v0} records whose object text contradicts the sector code.", { v0: inconsistent.length }) },
    { key: "integrity", label: tk("Relationship integrity"), weight: 0.15, value: integrity, explanation: t("{v0} of {v1} relationship checks pass (award↔tender, awardee↔registry, bidder lists, supplier contacts).", { v0: passed, v1: checks }) },
    { key: "outcome", label: tk("Outcome coverage"), weight: 0.15, value: outcome, explanation: t("{v0} of {v1} award-eligible tenders (deadline ≥45 days ago, not cancelled/unsuccessful) have a recorded award.", { v0: covered.length, v1: eligible.length }) },
  ];
  const score = Math.round(components.reduce((a, x) => a + x.weight * x.value, 0) * 1000) / 10;

  return {
    totals: {
      opportunities: all.length,
      uniqueReferences: new Set(all.map((o) => o.reference)).size,
      duplicates: c.duplicates.length,
      buyers: c.ds.buyers.length,
      companies: c.ds.companies.length,
      awards: c.ds.awards.length,
      participations: c.ds.participations.length,
      suppliers: c.ds.suppliers.length,
    },
    fields,
    coverage: {
      awardEligible: eligible.length,
      awardCovered: covered.length,
      awardCoverage: outcome,
      awardeeIdentified: c.ds.awards.filter((a) => c.company.has(a.companyId)).length,
      awardAmountKnown: c.ds.awards.filter((a) => a.amount !== null).length,
      awardedWithBidders: withBidders.length,
      awardedTotal: awardedOpps.length,
      bidderCoverage: awardedOpps.length ? withBidders.length / awardedOpps.length : 0,
      publicationRange: pubs.length ? [pubs[0], pubs[pubs.length - 1]] : null,
      deadlineRange: dls.length ? [dls[0], dls[dls.length - 1]] : null,
    },
    components,
    score,
    issues,
    worstFields: [...fields].sort((a, b) => a.rate - b.rate).slice(0, 4),
    duplicateEntities,
    inconsistent,
    unreliable,
  };
}
