/**
 * Recurring demand & future procurement signals.
 *
 * Transparent statistical rules — no machine learning:
 *  1. A "purchasing line" = all de-duplicated opportunities of one buyer in one sector.
 *  2. A line is recurring when it has ≥2 dated publications.
 *  3. Interval statistics: median interval, median absolute deviation, coefficient of variation.
 *  4. Next expected publication = last publication + median interval.
 *     Window = ± max(30 days, min(MAD, 25% of interval), 12% of the median interval).
 *  5. Contract-cycle evidence: if the latest award states a duration, the
 *     contract end (award date + duration) is a second, independent estimate.
 *  6. Confidence score (0–1) =
 *        occurrences component  (2 → 0.30, 3 → 0.45, ≥4 → 0.55)
 *      + regularity component   (0.25 × (1 − min(CV, 1)), only with ≥2 intervals)
 *      + contract alignment     (+0.15 if contract end falls within ±90 days of the window centre)
 *      + recent activity        (+0.05 if the last publication is within 2 intervals of the reference date)
 *      − overdue penalty        (−0.20 if the window already closed with no new publication)
 *     Levels: High ≥ 0.70, Medium ≥ 0.50, otherwise Low.
 *  Signals are analytical expectations, never official announcements.
 */
import { t, tv } from "../i18n";
import * as f from "../format";
import { addDays, addMonths, diffDays } from "../dates";
import type { Opportunity } from "../types";
import { type Ctx, buyerName, sectorName } from "./context";
import { clamp, cv, groupBy, mad, median, sum } from "./stats";

export interface RecurringSeries {
  key: string;
  buyerId: string;
  buyerName: string;
  sectorId: string;
  sectorName: string;
  occurrences: Opportunity[]; // chronological
  intervalsDays: number[];
  medianIntervalDays: number | null;
  madDays: number | null;
  cv: number | null;
  regularity: "Regular cycle" | "Irregular" | "Single interval";
  months: number[]; // publication months (1–12)
  medianValue: number | null;
}

const cache = new WeakMap<Ctx, RecurringSeries[]>();

export function recurringSeries(c: Ctx): RecurringSeries[] {
  const hit = cache.get(c);
  if (hit) return hit;
  const rows = c.clean.filter((o) => o.buyerId && o.sectorId && o.publicationDate);
  const groups = groupBy(rows, (o) => `${o.buyerId}:${o.sectorId}`);
  const out: RecurringSeries[] = [];
  for (const [key, list] of groups) {
    const occ = [...list].sort((a, b) => a.publicationDate!.localeCompare(b.publicationDate!));
    const intervals = occ.slice(1).map((o, i) => diffDays(o.publicationDate!, occ[i].publicationDate!));
    const v = cv(intervals);
    const vals = occ.map((o) => o.estimatedValue).filter((x): x is number => x !== null);
    out.push({
      key,
      buyerId: occ[0].buyerId!, buyerName: buyerName(c, occ[0].buyerId),
      sectorId: occ[0].sectorId!, sectorName: sectorName(c, occ[0].sectorId),
      occurrences: occ,
      intervalsDays: intervals,
      medianIntervalDays: median(intervals) === null ? null : Math.round(median(intervals)!),
      madDays: mad(intervals) === null ? null : Math.round(mad(intervals)!),
      cv: v,
      regularity: intervals.length < 2 ? "Single interval" : v !== null && v <= 0.35 ? "Regular cycle" : "Irregular",
      months: occ.map((o) => Number(o.publicationDate!.slice(5, 7))),
      medianValue: median(vals),
    });
  }
  out.sort((a, b) => b.occurrences.length - a.occurrences.length || a.key.localeCompare(b.key));
  cache.set(c, out);
  return out;
}

export interface FutureSignal {
  id: string;
  buyerId: string;
  buyerName: string;
  sectorId: string;
  sectorName: string;
  historical: { id: string; reference: string; title: string; publicationDate: string; estimatedValue: number | null; status: string }[];
  lastPublication: string;
  medianIntervalDays: number;
  expected: string;
  windowStart: string;
  windowEnd: string;
  contractEnd: string | null;
  contractAligned: boolean;
  confidence: number;
  level: "High" | "Medium" | "Low";
  state: "Upcoming" | "Within window" | "Overdue";
  expectedValue: number | null;
  incumbent: { id: string; name: string } | null;
  components: { label: string; value: number }[];
  explanation: string;
}

export function futureSignals(c: Ctx): FutureSignal[] {
  const ref = c.ref;
  const horizon = addMonths(ref, 18);
  const out: FutureSignal[] = [];
  for (const s of recurringSeries(c)) {
    if (s.occurrences.length < 2 || s.medianIntervalDays === null) continue;
    if (s.medianIntervalDays < 150 || s.medianIntervalDays > 1300) continue; // not a procurement cycle
    const last = s.occurrences[s.occurrences.length - 1];
    // If the line already has a currently open tender, the next cycle starts after it.
    const lastPub = last.publicationDate!;
    const expected = addDays(lastPub, s.medianIntervalDays);
    const half = Math.round(Math.max(30, Math.min(s.madDays ?? 0, s.medianIntervalDays * 0.25), s.medianIntervalDays * 0.12));
    const windowStart = addDays(expected, -half);
    const windowEnd = addDays(expected, half);
    if (windowEnd < addDays(ref, -120) || windowStart > horizon) continue;

    // contract evidence from the latest award in the line
    const lastAward = [...s.occurrences].reverse().flatMap((o) => c.awardsByOpp.get(o.id) ?? [])[0];
    const contractEnd = lastAward?.durationMonths ? addMonths(lastAward.awardDate, lastAward.durationMonths) : null;
    const contractAligned = contractEnd ? Math.abs(diffDays(contractEnd, expected)) <= 90 : false;

    const n = s.occurrences.length;
    const occC = n >= 4 ? 0.55 : n === 3 ? 0.45 : 0.3;
    const regC = s.intervalsDays.length >= 2 && s.cv !== null ? 0.25 * (1 - Math.min(s.cv, 1)) : 0;
    const conC = contractAligned ? 0.15 : 0;
    const recC = diffDays(ref, lastPub) <= 2 * s.medianIntervalDays ? 0.05 : 0;
    const state: FutureSignal["state"] = windowEnd < ref ? "Overdue" : windowStart <= ref ? "Within window" : "Upcoming";
    const penalty = state === "Overdue" ? -0.2 : 0;
    const confidence = clamp(occC + regC + conC + recC + penalty);
    const level = confidence >= 0.7 ? "High" : confidence >= 0.5 ? "Medium" : "Low";
    const incumbentId = lastAward?.companyId ?? null;
    const sentences = [
      t("{buyer} published {n} {sector} opportunities between {first} and {last}.", { buyer: s.buyerName, n, sector: s.sectorName.toLowerCase(), first: f.date(s.occurrences[0].publicationDate!), last: f.date(lastPub) }),
      s.intervalsDays.length >= 2
        ? t("The median interval is {days} days (CV {cv}, {regularity}).", { days: s.medianIntervalDays, cv: f.fixed(s.cv!, 2), regularity: tv(s.regularity).toLowerCase() })
        : t("The median interval is {days} days (one interval only).", { days: s.medianIntervalDays }),
      t("Projecting that interval from the last publication gives {date} (window ±{half} days).", { date: f.date(expected), half }),
      contractEnd
        ? contractAligned
          ? t("The latest recorded award ({months}-month contract) ends around {date}, consistent with the projected window.", { months: lastAward!.durationMonths, date: f.date(contractEnd) })
          : t("The latest recorded award ({months}-month contract) ends around {date}, which does not align with the projection.", { months: lastAward!.durationMonths, date: f.date(contractEnd) })
        : t("No contract duration evidence is available for this line."),
      ...(state === "Overdue" ? [t("The window has passed without a captured publication: the need may have been dropped, delayed or published outside the monitored sources.")] : []),
    ];
    const explanation = sentences.join(" ");

    out.push({
      id: `SIG-${s.buyerId}-${s.sectorId}`,
      buyerId: s.buyerId, buyerName: s.buyerName, sectorId: s.sectorId, sectorName: s.sectorName,
      historical: s.occurrences.map((o) => ({ id: o.id, reference: o.reference, title: o.title, publicationDate: o.publicationDate!, estimatedValue: o.estimatedValue, status: o.status })),
      lastPublication: lastPub, medianIntervalDays: s.medianIntervalDays, expected, windowStart, windowEnd,
      contractEnd, contractAligned, confidence, level, state,
      expectedValue: s.medianValue,
      incumbent: incumbentId ? { id: incumbentId, name: c.company.get(incumbentId)?.name ?? incumbentId } : null,
      components: [
        { label: t("Occurrences (n={v0})", { v0: n }), value: occC },
        { label: t("Interval regularity"), value: regC },
        { label: t("Contract-end alignment"), value: conC },
        { label: t("Recent activity"), value: recC },
        { label: t("Overdue penalty"), value: penalty },
      ],
      explanation,
    });
  }
  return out.sort((a, b) => (a.state === "Overdue" ? 1 : 0) - (b.state === "Overdue" ? 1 : 0) || a.windowStart.localeCompare(b.windowStart));
}

/** Sector-level recurrence: how much of each sector's demand comes from recurring lines. */
export function sectorRecurrence(c: Ctx) {
  const series = recurringSeries(c);
  const bySector = groupBy(series, (s) => s.sectorId);
  return [...bySector.entries()].map(([sid, list]) => {
    const total = sum(list.map((s) => s.occurrences.length));
    const recurring = list.filter((s) => s.occurrences.length >= 2);
    const recurringOcc = sum(recurring.map((s) => s.occurrences.length));
    const intervals = recurring.map((s) => s.medianIntervalDays).filter((x): x is number => x !== null);
    return {
      sectorId: sid, sectorName: sectorName(c, sid), opportunities: total,
      recurringLines: recurring.length, recurringShare: total ? recurringOcc / total : 0,
      medianCycleDays: median(intervals) === null ? null : Math.round(median(intervals)!),
      buyers: recurring.map((s) => s.buyerId),
    };
  }).sort((a, b) => b.recurringShare - a.recurringShare);
}
