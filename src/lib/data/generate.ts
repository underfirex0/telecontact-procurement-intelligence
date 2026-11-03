/**
 * Synthetic dataset generator — SYNTHETIC DEMO DATA ONLY.
 *
 * Builds a coherent fictional Moroccan procurement market from a single seed:
 *   buyers → recurring programmes + one-off needs → opportunities (+lots, documents)
 *   → statuses relative to a fixed reference date → awards (with incumbency and
 *   buyer loyalty effects) → bidder participation (a subset of tenders disclose
 *   bidders; the awardee is always among them) → deliberate data-quality defects.
 *
 * Generation is pure and deterministic: same seed ⇒ identical dataset.
 */
import { addDays, addMonths, dateFromFraction, diffDays, toDate, yearOf } from "../dates";
import type {
  Application, Award, Buyer, Company, CompanySize, Contact, Dataset, Interaction, ISODate, JobOpportunity,
  Lot, Meeting, Opportunity, OpportunityStatus, Participation, ParticipationOutcome, Procedure, ProcurementDocument,
  Provenance, RelationshipStage, Supplier, SupplierDocument, TalentProfile,
} from "../types";
import { Rng } from "./rng";
import {
  BUYER_SEEDS, COMPANY_NAMES, FIRST_NAMES, LAST_NAMES, PROCEDURES, PROCEDURE_WEIGHTS, REGIONS, SECTORS,
  SUPPLIER_COUNTRIES, SUPPLIER_STEMS, SUPPLIER_SUFFIX, TEAM, type SectorProfile,
} from "./reference";

export const DEFAULT_SEED = 20261103;
export const GENERATOR_ID = "tci-synthetic-generator@1.0.0";
export const REFERENCE_DATE: ISODate = "2026-11-03";
export const PERIOD_START: ISODate = "2023-01-02";
export const PERIOD_END: ISODate = "2026-11-02";

export const TARGET_COUNTS = {
  opportunities: 300,
  buyers: 40,
  companies: 70,
  participations: 100,
  awards: 90,
  suppliers: 60,
  contacts: 20,
  sectors: 15,
} as const;

const SEASON = [0.8, 1.0, 1.2, 1.15, 1.1, 1.0, 0.75, 0.55, 0.9, 1.1, 1.15, 1.0];
const BUYER_SCALE: Record<string, number> = {
  "Ministry department": 1.3, "State-owned enterprise": 1.4, "Public agency": 1.1, "Regional council": 1.2,
  Municipality: 0.7, "Public hospital": 0.9, University: 0.8, "Public office": 1.0,
};

const sectorById = new Map(SECTORS.map((s) => [s.id, s]));
const round = (v: number, step = 1000) => Math.max(step, Math.round(v / step) * step);
const pad = (n: number, w = 3) => String(n).padStart(w, "0");

interface Draft {
  opp: Opportunity;
  trueSector: string; // sector before any classification defect
  programme: string | null; // recurring programme key
}

export function generateDataset(seed: number = DEFAULT_SEED): Dataset {
  const rng = new Rng(seed);
  const prov = (source: string, createdAt: ISODate): Provenance => ({
    synthetic: true, source, generator: GENERATOR_ID, seed, createdAt,
  });

  /* ---------------- Buyers ---------------- */
  const buyers: Buyer[] = BUYER_SEEDS.map((b, i) => ({
    id: `B${pad(i + 1)}`,
    name: b.name,
    acronym: b.acronym,
    type: b.type,
    regionId: b.regionId,
    city: b.city,
    description: `Fictional ${b.type.toLowerCase()} based in ${b.city}. Synthetic profile created for the Telecontact Intelligence demo; procurement focus on ${b.sectors.map((s) => sectorById.get(s)!.name.toLowerCase()).join(", ")}.`,
    established: rng.int(1962, 2015),
    provenance: prov("Synthetic buyer registry", "2023-01-02"),
  }));
  const buyerSeed = new Map(buyers.map((b, i) => [b.id, BUYER_SEEDS[i]]));

  /* ---------------- Companies ---------------- */
  const companies: Company[] = [];
  const strength = new Map<string, number>();
  const sizes: CompanySize[] = ["Micro", "SME", "Mid-market", "Large"];
  const legal: Company["legalForm"][] = ["SARL", "SA", "SARL AU", "SAS"];
  for (const sector of SECTORS) {
    const names = COMPANY_NAMES[sector.id];
    // Zipf-like market strength: the first names in each sector are the "leaders".
    names.forEach((name, rank) => {
      const id = `C${pad(companies.length + 1)}`;
      const home = rng.weighted(REGIONS, REGIONS.map((r) => (r.id === "cs" ? 4 : r.id === "rsk" ? 3 : r.id === "dod" || r.id === "gon" ? 0.4 : 1)));
      const related = SECTORS.filter((s) => s.id !== sector.id && s.domain === sector.domain);
      const secondary = rng.sample(related.length ? related : SECTORS.filter((s) => s.id !== sector.id), rng.int(0, 2)).map((s) => s.id);
      const coverageN = rank < 2 ? rng.int(4, 8) : rng.int(1, 4);
      const coverage = [home.id, ...rng.sample(REGIONS.filter((r) => r.id !== home.id), coverageN - 1).map((r) => r.id)];
      const size = rank === 0 ? "Large" : rank < 3 ? rng.weighted(sizes, [0, 2, 4, 2]) : rng.weighted(sizes, [2, 5, 2, 0.5]);
      const legalForm = rng.pick(legal);
      companies.push({
        id,
        name: `${name} ${legalForm}`,
        legalForm,
        ice: `00${rng.int(1000000, 9999999)}${rng.int(100000, 999999)}`,
        rc: `RC-DEMO-${rng.int(10000, 99999)}`,
        city: rng.pick(home.cities),
        regionId: home.id,
        sectorIds: [sector.id, ...secondary],
        regionIds: coverage,
        services: [...sector.activities.slice(0, rng.int(1, sector.activities.length))],
        size,
        founded: rng.int(1988, 2019),
        provenance: prov("Synthetic company registry", "2023-01-02"),
      });
      strength.set(id, 1 / Math.pow(rank + 1, 1.15));
    });
  }
  // Two deliberate near-duplicate company entities (same fictional ICE, variant spelling).
  for (const srcIdx of [7, 43]) {
    const src = companies[srcIdx];
    const base = src.name.replace(/ (SARL AU|SARL|SA|SAS)$/, "");
    const variant = srcIdx === 7 ? base.toUpperCase().replace("SYSTEMS", "SYS.") : base.replace("Énergie", "Energie").replace(" ", "-");
    const id = `C${pad(companies.length + 1)}`;
    companies.push({ ...src, id, name: `${variant} ${src.legalForm}`, provenance: prov("Synthetic award notice (secondary source)", "2024-05-14") });
    strength.set(id, 0.05);
  }

  /* ---------------- Opportunity drafts ---------------- */
  const drafts: Draft[] = [];
  const seqByBuyerYear = new Map<string, number>();
  const nextRef = (buyer: Buyer, date: ISODate) => {
    const key = `${buyer.id}-${yearOf(date)}`;
    const n = (seqByBuyerYear.get(key) ?? 0) + 1;
    seqByBuyerYear.set(key, n);
    return `AO-${buyer.acronym}-${pad(n, 2)}/${yearOf(date)}`;
  };

  const makeOpp = (buyer: Buyer, sector: SectorProfile, pub: ISODate, title: string, baseValue: number | null, programme: string | null) => {
    const seedB = buyerSeed.get(buyer.id)!;
    let procedure: Procedure = rng.weighted(PROCEDURES, PROCEDURE_WEIGHTS) as Procedure;
    let value = baseValue ?? round(rng.logNormal(sector.medianValue * BUYER_SCALE[buyer.type], sector.sigma));
    if (procedure === "Bon de commande" && value > 500_000) {
      if (value > 1_200_000) procedure = "Appel d'offres ouvert";
      else value = round(rng.float(80_000, 495_000));
    }
    if (procedure === "Concours" && !["engineering", "consulting", "construction"].includes(sector.id)) procedure = "Appel d'offres ouvert";
    const deadlineSpan: Record<Procedure, [number, number]> = {
      "Appel d'offres ouvert": [21, 45], "Appel d'offres restreint": [30, 50], "Appel d'offres avec présélection": [40, 60],
      Concours: [45, 70], "Procédure négociée": [10, 20], "Bon de commande": [7, 15],
    };
    const [dmin, dmax] = deadlineSpan[procedure];
    const national = buyer.type === "Ministry department" || buyer.type === "State-owned enterprise";
    const region = national && rng.chance(0.4) ? rng.pick(REGIONS) : REGIONS.find((r) => r.id === buyer.regionId)!;
    const city = region.id === buyer.regionId ? (rng.chance(0.8) ? buyer.city : rng.pick(region.cities)) : rng.pick(region.cities);
    const id = `OPP-${pad(drafts.length + 1, 4)}`;
    const lots: Lot[] = [];
    if (value > 1_500_000 && procedure !== "Bon de commande" && rng.chance(0.27)) {
      const n = rng.int(2, 4);
      const w = Array.from({ length: n }, () => rng.float(0.5, 1.5));
      const tw = w.reduce((a, b) => a + b, 0);
      for (let k = 0; k < n; k++) {
        lots.push({ id: `${id}-L${k + 1}`, opportunityId: id, number: k + 1, title: `Lot n°${k + 1} — ${sector.activities[k % sector.activities.length]}${k >= sector.activities.length ? " (zone " + (k + 1) + ")" : ""}`, estimatedValue: round((value * w[k]) / tw) });
      }
    } else {
      lots.push({ id: `${id}-L1`, opportunityId: id, number: 1, title: "Lot unique", estimatedValue: value });
    }
    const docs: ProcurementDocument[] = [];
    const doc = (kind: ProcurementDocument["kind"], name: string) => docs.push({ id: `${id}-D${docs.length + 1}`, kind, name, pages: rng.int(4, 90) });
    doc("Avis", "Avis d'appel d'offres (synthetic)");
    if (procedure !== "Bon de commande") { doc("RC", "Règlement de consultation"); doc("CPS", "Cahier des prescriptions spéciales"); }
    doc("BPU", "Bordereau des prix — détail estimatif");
    if (["construction", "infrastructure", "energy"].includes(sector.id)) doc("Plans", "Plans et pièces graphiques");
    if (rng.chance(0.3)) doc("Annex", "Annexe technique");
    const duration = sector.cycleMonths === 12 && programme ? 12 : rng.int(sector.duration[0], sector.duration[1]);
    const opp: Opportunity = {
      id,
      reference: nextRef(buyer, pub),
      title,
      description: `${sector.activities[0]} need published by ${buyer.acronym} for ${city}. ${programme ? "Part of a recurring purchasing line at this buyer." : "One-off requirement."} Estimated contract duration ${duration} months. Synthetic tender object.`,
      buyerId: buyer.id,
      sectorId: sector.id,
      regionId: region.id,
      city,
      publicationDate: pub,
      deadline: addDays(pub, rng.int(dmin, dmax)),
      estimatedValue: value,
      procedure,
      status: "Open",
      lots,
      documents: docs,
      contractDurationMonths: duration,
      provisionalGuarantee: procedure === "Bon de commande" ? null : round(value * rng.float(0.01, 0.015), 500),
      requirements: rng.sample(sector.requirements, rng.int(2, Math.min(4, sector.requirements.length))),
      provenance: prov(rng.pick(["Synthetic portal feed", "Synthetic portal feed", "Synthetic press notice", "Synthetic buyer website"]), addDays(pub, rng.int(0, 2))),
    };
    drafts.push({ opp, trueSector: sector.id, programme });
    return opp;
  };

  // Recurring programmes: a buyer repeatedly buys the same service on a cycle.
  for (const buyer of buyers) {
    const s = buyerSeed.get(buyer.id)!;
    const nProg = s.activity >= 1.3 ? 2 : s.activity >= 0.8 ? (rng.chance(0.45) ? 2 : 1) : 1;
    const chosen = new Set<string>();
    for (let p = 0; p < nProg; p++) {
      const sid = rng.weighted(s.sectors, s.sectors.map((_, i) => [4, 3, 2, 1][i] ?? 1));
      if (chosen.has(sid)) continue;
      chosen.add(sid);
      const sector = sectorById.get(sid)!;
      const cycle = sector.cycleMonths;
      const title = rng.pick(sector.titles);
      let base = round(rng.logNormal(sector.medianValue * BUYER_SCALE[buyer.type], sector.sigma * 0.7));
      let date = addDays(PERIOD_START, rng.int(10, cycle * 30 - 10));
      let k = 0;
      while (date <= PERIOD_END) {
        if (rng.chance(0.93)) {
          makeOpp(buyer, sector, date, `${title} — ${yearOf(date)}`, k === 0 ? base : round(base), `${buyer.id}:${sid}`);
        }
        base = base * rng.float(1.0, 1.1);
        k++;
        date = addDays(addMonths(date, cycle), rng.int(-21, 21));
      }
    }
  }
  const recurringCount = drafts.length;

  // One-off needs, weighted by buyer activity, sector growth and seasonality.
  const oneOffTarget = TARGET_COUNTS.opportunities - 4 - recurringCount;
  const actWeights = buyers.map((b) => buyerSeed.get(b.id)!.activity);
  let guard = 0;
  while (drafts.length < recurringCount + oneOffTarget && guard++ < 20000) {
    const buyer = rng.weighted(buyers, actWeights);
    const s = buyerSeed.get(buyer.id)!;
    const sector = rng.chance(0.12) ? rng.pick(SECTORS) : sectorById.get(rng.weighted(s.sectors, s.sectors.map((_, i) => [4, 3, 2, 1][i] ?? 1)))!;
    // ~9% of one-off needs are recent publications, so the live pipeline is realistic.
    const recent = rng.chance(0.055);
    const date = recent ? addDays(REFERENCE_DATE, -rng.int(1, 75)) : dateFromFraction(PERIOD_START, PERIOD_END, rng.next());
    const years = diffDays(date, PERIOD_START) / 365;
    const w = Math.pow(sector.growth, years) * Math.pow(1.12, years) * SEASON[toDate(date).getUTCMonth()];
    if (!recent && !rng.chance(w / 3.6)) continue;
    makeOpp(buyer, sector, date, rng.pick(sector.titles), null, null);
  }

  // Order chronologically and re-number ids for readability.
  drafts.sort((a, b) => (a.opp.publicationDate! < b.opp.publicationDate! ? -1 : 1));
  drafts.forEach((d, i) => {
    const id = `OPP-${pad(i + 1, 4)}`;
    d.opp.id = id;
    d.opp.lots = d.opp.lots.map((l) => ({ ...l, id: `${id}-L${l.number}`, opportunityId: id }));
    d.opp.documents = d.opp.documents.map((doc, k) => ({ ...doc, id: `${id}-D${k + 1}` }));
  });

  /* ---------------- Statuses relative to the reference date ---------------- */
  const past: Draft[] = [];
  for (const d of drafts) {
    const o = d.opp;
    const until = diffDays(o.deadline!, REFERENCE_DATE);
    if (until >= 0) o.status = until <= 10 ? "Closing soon" : "Open";
    else past.push(d);
  }
  const eligible = past.filter((d) => diffDays(REFERENCE_DATE, d.opp.deadline!) >= 45);
  // cancellations / unsuccessful procedures
  for (const d of rng.sample(eligible, 14)) d.opp.status = rng.chance(0.5) ? "Cancelled" : "Unsuccessful";
  const awardable = eligible.filter((d) => d.opp.status !== "Cancelled" && d.opp.status !== "Unsuccessful");

  // pick awarded opportunities until exactly 90 awards (multi-lot tenders can yield 2 awards)
  const pool = [...awardable];
  const picked: { d: Draft; lotsAwarded: number }[] = [];
  let awardTotal = 0;
  let multiUsed = 0;
  while (awardTotal < TARGET_COUNTS.awards && pool.length) {
    const d = rng.weighted(pool, pool.map((x) => (x.programme ? 2.4 : 1)));
    pool.splice(pool.indexOf(d), 1);
    const multi = d.opp.lots.length > 1 && multiUsed < 5 && TARGET_COUNTS.awards - awardTotal >= 2;
    if (multi) multiUsed++;
    picked.push({ d, lotsAwarded: multi ? 2 : 1 });
    awardTotal += multi ? 2 : 1;
  }
  const pickedIds = new Set(picked.map((p) => p.d.opp.id));
  for (const d of past) {
    if (pickedIds.has(d.opp.id)) d.opp.status = "Awarded";
    else if (d.opp.status === "Open" || d.opp.status === "Closing soon")
      d.opp.status = diffDays(REFERENCE_DATE, d.opp.deadline!) >= 45 ? "Closed" : "Under evaluation";
  }

  /* ---------------- Awards (chronological, with incumbency) ---------------- */
  const awards: Award[] = [];
  const incumbent = new Map<string, string>(); // programme -> company
  const buyerWins = new Map<string, Set<string>>(); // buyer -> companies
  const chrono = [...picked].sort((a, b) => (a.d.opp.deadline! < b.d.opp.deadline! ? -1 : 1));
  const baseCompanies = companies.slice(0, companies.length - 2);
  for (const { d, lotsAwarded } of chrono) {
    const o = d.opp;
    const candidates = baseCompanies.filter((c) => c.sectorIds.includes(d.trueSector));
    const awardLots = lotsAwarded === 2 ? o.lots.slice(0, 2) : [o.lots.length > 1 ? o.lots[0] : null];
    const usedInTender = new Set<string>();
    for (const lot of awardLots) {
      let winner: Company | undefined;
      const inc = d.programme ? incumbent.get(d.programme) : undefined;
      if (inc && !usedInTender.has(inc) && rng.chance(0.58)) winner = companies.find((c) => c.id === inc);
      if (!winner) {
        const pool2 = candidates.filter((c) => !usedInTender.has(c.id));
        const weights = pool2.map((c) => {
          let w = strength.get(c.id)! * (c.sectorIds[0] === d.trueSector ? 1 : 0.35);
          w *= c.regionIds.includes(o.regionId ?? "") ? 1.6 : 0.6;
          if (buyerWins.get(o.buyerId!)?.has(c.id)) w *= 1.8;
          return w;
        });
        winner = rng.weighted(pool2, weights);
      }
      usedInTender.add(winner.id);
      if (d.programme) incumbent.set(d.programme, winner.id);
      if (!buyerWins.has(o.buyerId!)) buyerWins.set(o.buyerId!, new Set());
      buyerWins.get(o.buyerId!)!.add(winner.id);
      const est = lot ? lot.estimatedValue : o.estimatedValue;
      const awardDate = addDays(o.deadline!, rng.int(18, 44));
      awards.push({
        id: `AW-${pad(awards.length + 1, 3)}`,
        opportunityId: o.id,
        lotId: lot ? lot.id : null,
        companyId: winner.id,
        amount: round((est ?? o.estimatedValue ?? 1_000_000) * rng.float(0.79, 1.0)),
        awardDate: awardDate > REFERENCE_DATE ? REFERENCE_DATE : awardDate,
        durationMonths: o.contractDurationMonths,
        provenance: prov(rng.chance(0.8) ? "Synthetic award notice" : "Synthetic results bulletin", awardDate),
      });
    }
  }
  // Route two awards to the near-duplicate entities (same ICE, variant names) — a realistic entity-resolution defect.
  for (const [dupIdx, srcIdx] of [[companies.length - 2, 7], [companies.length - 1, 43]] as const) {
    const srcAward = awards.filter((a) => a.companyId === companies[srcIdx].id).pop();
    if (srcAward) srcAward.companyId = companies[dupIdx].id;
  }
  // Award amount missing for 3 records (source did not publish it).
  for (const a of rng.sample(awards, 3)) a.amount = null;

  /* ---------------- Bidder participation (exactly 100 records) ---------------- */
  const participations: Participation[] = [];
  const pushPart = (o: Opportunity, companyId: string, outcome: ParticipationOutcome, amount: number | null) => {
    participations.push({
      id: `BID-${pad(participations.length + 1, 3)}`,
      opportunityId: o.id,
      lotId: null,
      companyId,
      bidAmount: amount,
      submittedOn: o.deadline!,
      outcome,
      provenance: prov("Synthetic bid-opening minutes (PV d'ouverture des plis)", addDays(o.deadline!, 1)),
    });
  };
  const draftById = new Map(drafts.map((d) => [d.opp.id, d]));
  const underEval = drafts.filter((d) => d.opp.status === "Under evaluation");
  for (const d of rng.sample(underEval, Math.min(4, underEval.length))) {
    const comps = rng.sample(baseCompanies.filter((c) => c.sectorIds.includes(d.trueSector)), rng.int(2, 4));
    for (const c of comps) {
      if (participations.length >= TARGET_COUNTS.participations) break;
      pushPart(d.opp, c.id, rng.chance(0.3) ? "Shortlisted" : "Pending", d.opp.estimatedValue ? round(d.opp.estimatedValue * rng.float(0.82, 1.15)) : null);
    }
  }
  const awardedOpps = rng.shuffle([...new Set(awards.map((a) => a.opportunityId))]);
  for (const oid of awardedOpps) {
    if (participations.length >= TARGET_COUNTS.participations) break;
    const d = draftById.get(oid)!;
    const oppAwards = awards.filter((a) => a.opportunityId === oid);
    const winners = new Set(oppAwards.map((a) => a.companyId));
    for (const a of oppAwards) {
      if (participations.length >= TARGET_COUNTS.participations) break;
      pushPart(d.opp, a.companyId, "Awarded", a.amount);
    }
    const others = rng.sample(baseCompanies.filter((c) => c.sectorIds.includes(d.trueSector) && !winners.has(c.id)), rng.int(2, 5));
    const ref = oppAwards[0].amount ?? d.opp.estimatedValue ?? 1_000_000;
    for (const c of others) {
      if (participations.length >= TARGET_COUNTS.participations) break;
      const outcome: ParticipationOutcome = rng.weighted(["Unsuccessful", "Shortlisted", "Withdrawn"], [75, 15, 10]) as ParticipationOutcome;
      pushPart(d.opp, c.id, outcome, outcome === "Withdrawn" || rng.chance(0.1) ? null : round(ref * rng.float(0.9, 1.35)));
    }
  }

  /* ---------------- Data-quality defects (deliberate, documented) ---------------- */
  const opps = drafts.map((d) => d.opp);
  const pastOnly = opps.filter((o) => o.status !== "Open" && o.status !== "Closing soon");
  for (const o of rng.sample(opps, 33)) o.estimatedValue = null; // ~11% missing budget
  for (const o of rng.sample(opps, 9)) { o.regionId = null; o.city = null; }
  for (const o of rng.sample(opps.filter((x) => x.status !== "Awarded"), 6)) o.sectorId = null;
  for (const o of rng.sample(opps.filter((x) => x.status !== "Awarded"), 3)) o.buyerId = null;
  for (const o of rng.sample(pastOnly.filter((x) => x.status !== "Awarded"), 6)) o.deadline = null;
  for (const o of rng.sample(pastOnly.filter((x) => x.status !== "Awarded" && x.deadline), 3)) o.publicationDate = null;
  // Inconsistent classification: object text from one sector, code from another.
  for (const o of rng.sample(opps.filter((x) => x.status !== "Awarded" && x.sectorId), 6)) {
    const other = rng.pick(SECTORS.filter((s) => s.id !== o.sectorId && s.domain !== sectorById.get(o.sectorId!)!.domain));
    o.title = rng.pick(other.titles);
  }
  // Duplicates: the same notice ingested twice from a second channel.
  for (const src of rng.sample(opps.filter((x) => x.publicationDate && x.buyerId), 4)) {
    const id = `OPP-${pad(opps.length + 1, 4)}`;
    opps.push({
      ...src,
      id,
      lots: src.lots.map((l) => ({ ...l, id: `${id}-L${l.number}`, opportunityId: id })),
      documents: src.documents.slice(0, 2).map((doc, k) => ({ ...doc, id: `${id}-D${k + 1}` })),
      publicationDate: addDays(src.publicationDate!, rng.int(1, 3)),
      duplicateOf: src.id,
      provenance: prov("Synthetic press notice (re-ingested)", addDays(src.publicationDate!, 3)),
    });
  }

  /* ---------------- Suppliers & partner network ---------------- */
  const suppliers: Supplier[] = [];
  const contacts: Contact[] = [];
  const interactions: Interaction[] = [];
  const meetings: Meeting[] = [];
  const legalByCountry: Record<string, string> = {
    Morocco: "SARL", France: "SAS", Spain: "S.L.", Senegal: "SUARL", "Côte d'Ivoire": "SARL", Tunisia: "SARL", Portugal: "Lda",
    "United Arab Emirates": "LLC", Mauritania: "SARL", Egypt: "S.A.E.", Germany: "GmbH", Nigeria: "Ltd",
  };
  const dial: Record<string, string> = {
    Morocco: "+212", France: "+33", Spain: "+34", Senegal: "+221", "Côte d'Ivoire": "+225", Tunisia: "+216", Portugal: "+351",
    "United Arab Emirates": "+971", Mauritania: "+222", Egypt: "+20", Germany: "+49", Nigeria: "+234",
  };
  const stageWeights = [8, 7, 10, 8, 6, 5, 10, 3, 3];
  const stages: RelationshipStage[] = ["Identified", "Not contacted", "Contacted", "Responded", "Meeting scheduled", "Negotiation", "Active partner", "Inactive", "Rejected"];
  const stems = rng.shuffle([...SUPPLIER_STEMS]);
  let si = 0;
  for (const cdef of SUPPLIER_COUNTRIES) {
    for (let k = 0; k < cdef.count; k++) {
      const sector = rng.weighted(SECTORS, SECTORS.map((s) => (["it", "telecom", "energy", "engineering", "construction", "infrastructure"].includes(s.id) ? 2 : 1)));
      const sec2 = rng.chance(0.5) ? [rng.pick(SECTORS.filter((s) => s.domain === sector.domain && s.id !== sector.id).concat(SECTORS.filter((s) => s.id !== sector.id)).slice(0, 3)).id] : [];
      const stem = stems[si++ % stems.length];
      const name = `${stem} ${rng.pick(SUPPLIER_SUFFIX[sector.id])} ${legalByCountry[cdef.country]}`;
      const slug = `${stem}-${SUPPLIER_SUFFIX[sector.id][0]}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-");
      const status = rng.weighted(stages, stageWeights);
      const sIdx = stages.indexOf(status);
      const created = dateFromFraction("2024-01-15", "2026-08-30", rng.next());
      const contacted = sIdx >= 2;
      const firstContact = contacted ? addDays(created, rng.int(5, 60)) : null;
      const lastInt = contacted ? (addDays(firstContact!, rng.int(10, 260)) < REFERENCE_DATE ? addDays(firstContact!, rng.int(10, 260)) : addDays(REFERENCE_DATE, -rng.int(2, 30))) : null;
      const coverage = cdef.country === "Morocco"
        ? ["Morocco", ...(rng.chance(0.3) ? rng.sample(["Mauritania", "Senegal", "Côte d'Ivoire"], rng.int(1, 2)) : [])]
        : [cdef.country, ...(rng.chance(0.55) ? ["Morocco"] : []), ...(cdef.region === "West Africa" && rng.chance(0.5) ? rng.sample(["Senegal", "Mauritania", "Côte d'Ivoire", "Nigeria"].filter((c) => c !== cdef.country), 1) : [])];
      const id = `SUP-${pad(suppliers.length + 1)}`;
      const city = rng.pick(cdef.cities);
      const docs: SupplierDocument[] = [];
      if (sIdx >= 3 && sIdx <= 7) docs.push({ id: `${id}-DOC1`, name: "Company profile (synthetic).pdf", kind: "Company profile", addedOn: lastInt ?? created });
      if (sIdx >= 5 && sIdx <= 6) docs.push({ id: `${id}-DOC2`, name: "Mutual NDA (synthetic).pdf", kind: "NDA", addedOn: lastInt ?? created });
      if (sIdx === 5) docs.push({ id: `${id}-DOC3`, name: "Indicative price list (synthetic).xlsx", kind: "Price list", addedOn: lastInt ?? created });
      if (rng.chance(0.3) && sIdx >= 3) docs.push({ id: `${id}-DOC4`, name: "ISO certificate (synthetic).pdf", kind: "Certification", addedOn: created });
      const followUp = ["Contacted", "Responded", "Meeting scheduled", "Negotiation", "Active partner"].includes(status)
        ? addDays(REFERENCE_DATE, rng.int(-20, 45))
        : status === "Identified" || status === "Not contacted" ? (rng.chance(0.5) ? addDays(REFERENCE_DATE, rng.int(3, 30)) : null) : null;
      suppliers.push({
        id, name,
        description: `Fictional ${sector.name.toLowerCase()} provider based in ${city}, ${cdef.country}. Synthetic profile for network-building demonstrations; capabilities in ${sector.activities.join(", ").toLowerCase()}.`,
        country: cdef.country, region: cdef.region, city,
        sectorIds: [sector.id, ...sec2], domain: sector.domain,
        services: rng.sample(sector.activities, rng.int(1, sector.activities.length)),
        specialisation: rng.pick(sector.activities),
        coverage,
        website: `https://www.${slug}.example`,
        phone: `${dial[cdef.country]} 00 ${rng.int(10, 99)} ${rng.int(10, 99)} ${rng.int(10, 99)}`,
        email: `contact@${slug}.example`,
        address: `${rng.int(1, 240)} Rue Fictive ${stem}, ${city}, ${cdef.country}`,
        contactIds: [],
        relationshipOwner: rng.pick(TEAM),
        status,
        firstContactDate: firstContact,
        lastInteraction: lastInt,
        previousCooperation: status === "Active partner" ? `Joint delivery on ${rng.int(1, 3)} synthetic project(s) in ${rng.pick(["2024", "2025", "2026"])}` : status === "Inactive" ? "One synthetic subcontract in 2024; no activity since" : "None recorded",
        notes: status === "Rejected" ? "Capacity or pricing not aligned with demo requirements." : status === "Negotiation" ? "Discussing exclusivity scope and margin split (simulated)." : "",
        documents: docs,
        followUpDate: followUp && lastInt && followUp < lastInt ? addDays(lastInt, 14) : followUp,
        capacityScore: rng.int(2, 5),
        createdAt: created,
        provenance: prov(rng.pick(["Synthetic trade-fair list", "Synthetic referral", "Synthetic directory import", "Synthetic inbound registration"]), created),
      });
      // interaction history consistent with the stage
      const s = suppliers[suppliers.length - 1];
      if (contacted && s.firstContactDate && s.lastInteraction) {
        const steps: { type: Interaction["type"]; summary: string; stage: RelationshipStage }[] = [
          { type: "Introduction", summary: "Introduction message prepared from template and logged (simulated — no email sent).", stage: "Contacted" },
        ];
        if (sIdx >= 3 && sIdx !== 8) steps.push({ type: "Response", summary: "Provider replied with company profile and availability (simulated).", stage: "Responded" });
        if (sIdx >= 4 && sIdx <= 7) steps.push({ type: "Meeting", summary: "Discovery meeting: capabilities, references and coverage reviewed.", stage: "Meeting scheduled" });
        if (sIdx >= 5 && sIdx <= 7) steps.push({ type: "Evaluation", summary: `Capacity assessed at ${s.capacityScore}/5; commercial terms discussed.`, stage: "Negotiation" });
        if (sIdx === 6 || sIdx === 7) steps.push({ type: "Note", summary: "Framework cooperation agreement recorded (synthetic).", stage: "Active partner" });
        if (sIdx === 7) steps.push({ type: "Note", summary: "No activity for 6+ months; relationship marked inactive.", stage: "Inactive" });
        if (sIdx === 8) steps.push({ type: "Evaluation", summary: "Assessment concluded: not pursued.", stage: "Rejected" });
        const span = Math.max(1, diffDays(s.lastInteraction, s.firstContactDate));
        steps.forEach((st, i) => {
          interactions.push({
            id: `INT-${pad(interactions.length + 1, 4)}`, supplierId: s.id,
            date: addDays(s.firstContactDate!, Math.round((span * i) / Math.max(1, steps.length - 1))),
            type: st.type, summary: st.summary, by: s.relationshipOwner, stageAfter: st.stage,
          });
        });
        if (status === "Meeting scheduled") {
          meetings.push({ id: `MTG-${pad(meetings.length + 1)}`, supplierId: s.id, date: addDays(REFERENCE_DATE, rng.int(2, 21)), time: `${rng.int(9, 16)}:${rng.pick(["00", "30"])}`, subject: "Introductory capability meeting", location: rng.pick(["Video call", "Casablanca office (demo)", "Rabat office (demo)"]), attendees: [s.relationshipOwner], status: "Scheduled", notes: "" });
        }
        if (sIdx >= 5 && sIdx <= 7) {
          meetings.push({ id: `MTG-${pad(meetings.length + 1)}`, supplierId: s.id, date: addDays(s.lastInteraction, -rng.int(5, 40)), time: "10:00", subject: "Commercial terms review", location: "Video call", attendees: [s.relationshipOwner], status: "Held", notes: "Pricing structure and coverage confirmed (simulated)." });
        }
      }
    }
  }
  // 20 contacts — main contacts for the most advanced relationships first
  const byAdvance = [...suppliers].sort((a, b) => stages.indexOf(b.status) % 7 - stages.indexOf(a.status) % 7);
  const roles = ["Managing Director", "Business Development Manager", "Head of Partnerships", "Technical Director", "Export Manager", "Operations Manager"];
  for (let i = 0; i < TARGET_COUNTS.contacts; i++) {
    const s = byAdvance[i];
    const fn = FIRST_NAMES[(i * 7) % FIRST_NAMES.length];
    const ln = LAST_NAMES[(i * 11 + 3) % LAST_NAMES.length];
    const domain = s.email.split("@")[1];
    const c: Contact = {
      id: `CT-${pad(i + 1)}`, name: `${fn} ${ln}`, role: rng.pick(roles),
      email: `${fn}.${ln}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z.]/g, "") + "@" + domain,
      phone: s.phone.replace(/\d\d$/, String(rng.int(10, 99))),
      supplierId: s.id,
      languages: s.country === "Morocco" ? ["Arabic", "French"] : ["Spain", "Portugal"].includes(s.country) ? ["Spanish", "French", "English"] : ["French", "English"],
      provenance: prov("Synthetic contact card", s.createdAt),
    };
    contacts.push(c);
    s.contactIds.push(c.id);
  }

  /* ---------------- Talent & local experts ---------------- */
  const jobDefs: [string, string, string, string, string[], number, JobOpportunity["engagement"]][] = [
    ["Local project coordinator — solar programmes", "Project coordinator", "Senegal", "Dakar", ["Solar PV", "Project management"], 5, "Project-based"],
    ["Telecom field engineer", "Field engineer", "Côte d'Ivoire", "Abidjan", ["Fibre networks", "RF survey"], 4, "Short mission"],
    ["Procurement analyst (public tenders)", "Analyst", "Morocco", "Casablanca", ["Public procurement", "Market analysis"], 3, "Full-time"],
    ["Bid manager — infrastructure", "Bid manager", "Morocco", "Rabat", ["Tender writing", "Civil works pricing"], 7, "Full-time"],
    ["Biomedical equipment specialist", "Technical expert", "Mauritania", "Nouakchott", ["Biomedical maintenance", "Training"], 6, "Short mission"],
    ["Energy efficiency auditor", "Auditor", "Tunisia", "Tunis", ["Energy audit", "Building systems"], 5, "Project-based"],
    ["Local partnerships advisor", "Advisor", "Spain", "Sevilla", ["Business development", "EU funding"], 8, "Advisory"],
    ["IT systems integrator", "Engineer", "Morocco", "Tanger", ["Systems integration", "Networking"], 4, "Project-based"],
    ["Training facilitator — digital skills", "Trainer", "Morocco", "Marrakech", ["Adult learning", "Digital literacy"], 3, "Short mission"],
    ["Quantity surveyor", "Surveyor", "Côte d'Ivoire", "Yamoussoukro", ["Quantity surveying", "Cost estimation"], 6, "Project-based"],
    ["Security operations lead", "Operations lead", "Morocco", "Agadir", ["Site security", "Team management"], 8, "Full-time"],
    ["Logistics coordinator — port operations", "Coordinator", "Senegal", "Thiès", ["Freight", "Customs"], 4, "Project-based"],
  ];
  const sectorForJob = ["energy", "telecom", "consulting", "infrastructure", "medical", "energy", "consulting", "it", "training", "construction", "security", "transport"];
  const jobStatus: JobOpportunity["status"][] = ["Open", "Open", "Open", "Interviewing", "Open", "On hold", "Open", "Interviewing", "Filled", "Open", "Open", "Interviewing"];
  const jobs: JobOpportunity[] = jobDefs.map((j, i) => ({
    id: `JOB-${pad(i + 1)}`, title: j[0], role: j[1], country: j[2], location: j[3], expertise: j[4], experienceYears: j[5], engagement: j[6],
    sectorId: sectorForJob[i], status: jobStatus[i], postedOn: addDays(REFERENCE_DATE, -rng.int(5, 120)),
    description: `Synthetic role to support delivery of fictional opportunities in ${j[2]}. Requires ${j[5]}+ years in ${j[4].join(" and ").toLowerCase()}.`,
  }));
  const talents: TalentProfile[] = [];
  const talentCountries = ["Morocco", "Morocco", "Morocco", "Senegal", "Côte d'Ivoire", "Tunisia", "Spain", "Mauritania", "France", "Morocco", "Senegal", "Morocco", "Portugal", "Côte d'Ivoire", "Morocco", "Tunisia"];
  for (let i = 0; i < 16; i++) {
    const job = jobs[i % jobs.length];
    const fn = FIRST_NAMES[(i * 5 + 2) % FIRST_NAMES.length];
    const ln = LAST_NAMES[(i * 3 + 7) % LAST_NAMES.length];
    talents.push({
      id: `TAL-${pad(i + 1)}`, name: `${fn} ${ln} (synthetic)`,
      email: `${fn}.${ln}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z.]/g, "") + "@talent-demo.example",
      country: talentCountries[i], city: talentCountries[i] === job.country ? job.location : "—",
      expertise: job.expertise, experienceYears: rng.int(2, 15), skills: rng.sample(["French", "English", "Arabic", "Spanish", "AutoCAD", "MS Project", "Power BI", "SAP", "QGIS", "PMP"], 3),
      availability: rng.pick(["Immediate", "1 month", "3 months", "Unavailable"]), consent: true,
      createdAt: addDays(REFERENCE_DATE, -rng.int(10, 200)), synthetic: true,
    });
  }
  const applications: Application[] = [];
  const appStatus: Application["status"][] = ["Received", "Screening", "Interview", "Shortlisted", "Placed", "Declined"];
  for (let i = 0; i < 22; i++) {
    const t = talents[i % talents.length];
    const job = i < 16 ? jobs[i % jobs.length] : rng.pick(jobs);
    if (applications.some((a) => a.jobId === job.id && a.talentId === t.id)) continue;
    applications.push({
      id: `APP-${pad(applications.length + 1)}`, jobId: job.id, talentId: t.id,
      submittedOn: addDays(job.postedOn, rng.int(1, 30)) > REFERENCE_DATE ? REFERENCE_DATE : addDays(job.postedOn, rng.int(1, 30)),
      status: job.status === "Filled" && i % 12 === 8 ? "Placed" : rng.weighted(appStatus, [5, 4, 3, 2, 0, 2]),
      cvPlaceholder: "CV attachment placeholder (no file stored)", note: "",
    });
  }

  return {
    meta: {
      name: "Telecontact Intelligence — Synthetic Moroccan Procurement Dataset",
      seed, generator: GENERATOR_ID, referenceDate: REFERENCE_DATE, periodStart: PERIOD_START, periodEnd: PERIOD_END,
      disclaimer: "SYNTHETIC DEMO DATA. All organisations, people, tenders, bids, awards and suppliers are fictional and generated for demonstration. Not real procurement information.",
    },
    sectors: SECTORS.map(({ id, code, name, domain, activities }) => ({ id, code, name, domain, activities })),
    regions: REGIONS,
    buyers,
    companies,
    opportunities: opps,
    participations,
    awards,
    suppliers,
    contacts,
    interactions,
    meetings,
    jobs,
    talents,
    applications,
  };
}
