/**
 * Competitor & awardee analysis.
 *
 * Definitions (never conflated):
 *  - Participation: a recorded bid (from disclosed bid-opening minutes).
 *  - Award: a recorded contract award (from award notices).
 *  - Win rate = participations with outcome "Awarded" ÷ decided participations
 *    (Awarded + Unsuccessful + Shortlisted-not-awarded). Pending and Withdrawn are excluded.
 *    Shown only with its sample size; awards without a disclosed bidder list do NOT enter the win rate.
 */
import { t, tv } from "../i18n";
import * as f from "../format";
import { diffDays } from "../dates";
import { type Ctx, buyerName, regionName, sectorName } from "./context";
import { groupBy, sum } from "./stats";
import type { Award, Participation } from "../types";

export type CompanyRole = "Verified awardee" | "Shortlisted participant" | "Participant" | "No recorded activity";

export interface CompanySummary {
  id: string;
  name: string;
  primarySector: string;
  sectorId: string;
  city: string;
  region: string;
  size: string;
  participations: number;
  decided: number;
  wins: number; // awarded participations
  winRate: number | null;
  shortlisted: number;
  awards: number;
  awardValue: number;
  buyers: number;
  repeatBuyers: number;
  regions: number;
  role: CompanyRole;
  lastAward: string | null;
  awardsWithoutBidData: number;
}

function decidedOf(ps: Participation[]) {
  return ps.filter((p) => p.outcome === "Awarded" || p.outcome === "Unsuccessful" || p.outcome === "Shortlisted");
}

export function companySummaries(c: Ctx): CompanySummary[] {
  return c.ds.companies.map((co) => {
    const ps = c.partsByCompany.get(co.id) ?? [];
    const aw = c.awardsByCompany.get(co.id) ?? [];
    const decided = decidedOf(ps);
    const wins = ps.filter((p) => p.outcome === "Awarded").length;
    const byBuyer = groupBy(aw, (a) => c.opp.get(a.opportunityId)?.buyerId ?? null);
    const regions = new Set(aw.map((a) => c.opp.get(a.opportunityId)?.regionId).filter(Boolean));
    const bidOpps = new Set(ps.map((p) => p.opportunityId));
    const shortlisted = ps.filter((p) => p.outcome === "Shortlisted").length;
    const role: CompanyRole = aw.length ? "Verified awardee" : shortlisted ? "Shortlisted participant" : ps.length ? "Participant" : "No recorded activity";
    const dates = aw.map((a) => a.awardDate).sort();
    return {
      id: co.id, name: co.name, primarySector: sectorName(c, co.sectorIds[0]), sectorId: co.sectorIds[0], city: co.city,
      region: regionName(c, co.regionId), size: co.size,
      participations: ps.length, decided: decided.length, wins, winRate: decided.length ? wins / decided.length : null, shortlisted,
      awards: aw.length, awardValue: sum(aw.map((a) => a.amount ?? 0)),
      buyers: byBuyer.size, repeatBuyers: [...byBuyer.values()].filter((l) => l.length >= 2).length,
      regions: regions.size, role, lastAward: dates[dates.length - 1] ?? null,
      awardsWithoutBidData: aw.filter((a) => !bidOpps.has(a.opportunityId)).length,
    };
  });
}

export interface CompanyProfile {
  summary: CompanySummary;
  awards: (Award & { reference: string; title: string; buyerId: string | null; buyer: string; sector: string; region: string })[];
  participations: (Participation & { reference: string; title: string; buyer: string; awardedTo: string[] })[];
  sectorPresence: { key: string; label: string; awards: number; value: number; shareOfSector: number; sectorAwards: number }[];
  buyerRelationships: { id: string; name: string; awards: number; value: number; first: string; last: string; repeat: boolean }[];
  regionActivity: { key: string; label: string; awards: number }[];
  byYear: { year: string; awards: number; value: number }[];
  headToHead: { id: string; name: string; meetings: number; theyWon: number; weWon: number }[];
  positioning: { rankInSector: number | null; sectorAwardees: number; shareInSector: number | null; sectorLabel: string };
  observations: { text: string; evidence: string[] }[];
}

export function companyProfile(c: Ctx, companyId: string): CompanyProfile | null {
  const co = c.company.get(companyId);
  if (!co) return null;
  const summary = companySummaries(c).find((s) => s.id === companyId)!;
  const aw = (c.awardsByCompany.get(companyId) ?? []).map((a) => {
    const o = c.opp.get(a.opportunityId)!;
    return { ...a, reference: o.reference, title: o.title, buyerId: o.buyerId, buyer: buyerName(c, o.buyerId), sector: sectorName(c, o.sectorId), region: regionName(c, o.regionId) };
  }).sort((a, b) => b.awardDate.localeCompare(a.awardDate));
  const ps = (c.partsByCompany.get(companyId) ?? []).map((p) => {
    const o = c.opp.get(p.opportunityId)!;
    return { ...p, reference: o.reference, title: o.title, buyer: buyerName(c, o.buyerId), awardedTo: (c.awardsByOpp.get(o.id) ?? []).map((a) => c.company.get(a.companyId)?.name ?? a.companyId) };
  }).sort((a, b) => b.submittedOn.localeCompare(a.submittedOn));

  // sector presence vs total sector awards
  const allBySector = groupBy(c.ds.awards, (a) => c.opp.get(a.opportunityId)?.sectorId ?? "unclassified");
  const mineBySector = groupBy(aw, (a) => c.opp.get(a.opportunityId)?.sectorId ?? "unclassified");
  const sectorPresence = [...mineBySector.entries()].map(([k, l]) => {
    const total = allBySector.get(k) ?? [];
    return { key: k, label: sectorName(c, k === "unclassified" ? null : k), awards: l.length, value: sum(l.map((a) => a.amount ?? 0)), sectorAwards: total.length, shareOfSector: total.length ? l.length / total.length : 0 };
  }).sort((a, b) => b.awards - a.awards);

  const byBuyer = groupBy(aw, (a) => a.buyerId);
  const buyerRelationships = [...byBuyer.entries()].map(([id, l]) => {
    const ds = l.map((a) => a.awardDate).sort();
    return { id, name: buyerName(c, id), awards: l.length, value: sum(l.map((a) => a.amount ?? 0)), first: ds[0], last: ds[ds.length - 1], repeat: l.length >= 2 };
  }).sort((a, b) => b.awards - a.awards);

  const regionActivity = [...groupBy(aw, (a) => c.opp.get(a.opportunityId)?.regionId ?? "unknown").entries()]
    .map(([k, l]) => ({ key: k, label: regionName(c, k === "unknown" ? null : k), awards: l.length })).sort((a, b) => b.awards - a.awards);
  const byYear = ["2023", "2024", "2025", "2026"].map((y) => {
    const l = aw.filter((a) => a.awardDate.startsWith(y));
    return { year: y, awards: l.length, value: sum(l.map((a) => a.amount ?? 0)) };
  });

  // head-to-head from disclosed bidder lists
  const h2h = new Map<string, { meetings: number; theyWon: number; weWon: number }>();
  for (const p of c.partsByCompany.get(companyId) ?? []) {
    const winners = new Set((c.awardsByOpp.get(p.opportunityId) ?? []).map((a) => a.companyId));
    for (const other of c.partsByOpp.get(p.opportunityId) ?? []) {
      if (other.companyId === companyId) continue;
      const e = h2h.get(other.companyId) ?? { meetings: 0, theyWon: 0, weWon: 0 };
      e.meetings++;
      if (winners.has(other.companyId)) e.theyWon++;
      if (winners.has(companyId)) e.weWon++;
      h2h.set(other.companyId, e);
    }
  }
  const headToHead = [...h2h.entries()].map(([id, e]) => ({ id, name: c.company.get(id)?.name ?? id, ...e })).sort((a, b) => b.meetings - a.meetings);

  // positioning in primary sector (by award count, then value)
  const primary = co.sectorIds[0];
  const secAwards = allBySector.get(primary) ?? [];
  const rank = [...groupBy(secAwards, (a) => a.companyId).entries()].map(([id, l]) => ({ id, n: l.length, v: sum(l.map((a) => a.amount ?? 0)) })).sort((a, b) => b.n - a.n || b.v - a.v);
  const idx = rank.findIndex((r) => r.id === companyId);
  const positioning = { rankInSector: idx >= 0 ? idx + 1 : null, sectorAwardees: rank.length, shareInSector: idx >= 0 && secAwards.length ? rank[idx].n / secAwards.length : null, sectorLabel: sectorName(c, primary) };

  const obs: CompanyProfile["observations"] = [];
  if (positioning.rankInSector) obs.push({ text: t("Ranks #{v0} of {v1} awardees in {v2} by recorded awards ({v3} of {v4} sector awards).", { v0: positioning.rankInSector, v1: positioning.sectorAwardees, v2: positioning.sectorLabel, v3: f.pct(positioning.shareInSector ?? 0), v4: secAwards.length }), evidence: (mineBySector.get(primary) ?? []).map((a) => a.opportunityId) });
  const rep = buyerRelationships.filter((b) => b.repeat);
  if (rep.length) obs.push({ text: t("Repeat business with {v0} buyer(s): {v1}.", { v0: rep.length, v1: rep.map((r) => t("{v0} ({v1} awards)", { v0: r.name, v1: r.awards })).join("; ") }), evidence: aw.filter((a) => rep.some((r) => r.id === a.buyerId)).map((a) => a.opportunityId) });
  if (summary.decided >= 3) obs.push({ text: t("Win rate {v0} on {v1} decided participations with disclosed outcomes.", { v0: f.pct(summary.winRate ?? 0), v1: summary.decided }), evidence: ps.map((p) => p.opportunityId) });
  else if (summary.participations > 0) obs.push({ text: t("Only {v0} decided participation(s) recorded — sample too small for a reliable win rate.", { v0: summary.decided }), evidence: ps.map((p) => p.opportunityId) });
  if (summary.participations && !summary.awards) obs.push({ text: t("Active bidder without a recorded award: participant, not a verified awardee."), evidence: ps.map((p) => p.opportunityId) });
  if (summary.awardsWithoutBidData) obs.push({ text: t("{v0} of {v1} awards come from tenders whose bidder list was not disclosed; these do not enter the win rate.", { v0: summary.awardsWithoutBidData, v1: summary.awards }), evidence: [] });
  const recent = aw.filter((a) => diffDays(c.ref, a.awardDate) <= 365);
  if (aw.length >= 2) obs.push({ text: t("{v0} award(s) in the last 12 months vs {v1} earlier.", { v0: recent.length, v1: aw.length - recent.length }), evidence: recent.map((a) => a.opportunityId) });

  return { summary, awards: aw, participations: ps, sectorPresence, buyerRelationships, regionActivity, byYear, headToHead, positioning, observations: obs };
}

/** Sector leaderboard for the Awardees module. */
export function sectorLeaders(c: Ctx, sectorId: string | null) {
  const awards = c.ds.awards.filter((a) => !sectorId || c.opp.get(a.opportunityId)?.sectorId === sectorId);
  const total = awards.length;
  return [...groupBy(awards, (a) => a.companyId).entries()].map(([id, l]) => ({
    id, name: c.company.get(id)?.name ?? id, awards: l.length, value: sum(l.map((a) => a.amount ?? 0)), share: total ? l.length / total : 0,
    buyers: new Set(l.map((a) => c.opp.get(a.opportunityId)?.buyerId)).size,
  })).sort((a, b) => b.awards - a.awards || b.value - a.value);
}
