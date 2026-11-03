/**
 * Analytical context: the dataset plus lookup indexes.
 *
 * Analytics never read the generator's ground-truth flags (e.g. `duplicateOf`).
 * Duplicates are *detected* here from the records themselves, and every market
 * metric runs on `clean` opportunities (detected duplicates removed).
 */
import { t } from "../i18n";
import type { Award, Buyer, Company, Dataset, Opportunity, Participation, Region, Sector } from "../types";
import { groupBy } from "./stats";

export interface Ctx {
  ds: Dataset;
  ref: string; // reference date
  buyer: Map<string, Buyer>;
  company: Map<string, Company>;
  sector: Map<string, Sector>;
  region: Map<string, Region>;
  opp: Map<string, Opportunity>;
  /** opportunities with detected duplicates removed (earliest record kept) */
  clean: Opportunity[];
  duplicates: { id: string; keptId: string; key: string }[];
  awardsByOpp: Map<string, Award[]>;
  awardsByCompany: Map<string, Award[]>;
  partsByOpp: Map<string, Participation[]>;
  partsByCompany: Map<string, Participation[]>;
  oppsByBuyer: Map<string, Opportunity[]>; // clean only
}

export function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Duplicate key: same reference, same buyer, same normalised object. */
export function duplicateKey(o: Opportunity): string {
  return `${normalise(o.reference)}|${o.buyerId ?? "?"}|${normalise(o.title)}`;
}

export function buildContext(ds: Dataset): Ctx {
  const seen = new Map<string, Opportunity>();
  const duplicates: Ctx["duplicates"] = [];
  const sorted = [...ds.opportunities].sort((a, b) => {
    const pa = a.publicationDate ?? "9999";
    const pb = b.publicationDate ?? "9999";
    return pa === pb ? a.id.localeCompare(b.id) : pa < pb ? -1 : 1;
  });
  const clean: Opportunity[] = [];
  for (const o of sorted) {
    const k = duplicateKey(o);
    const kept = seen.get(k);
    if (kept) duplicates.push({ id: o.id, keptId: kept.id, key: k });
    else {
      seen.set(k, o);
      clean.push(o);
    }
  }
  clean.sort((a, b) => a.id.localeCompare(b.id));
  return {
    ds,
    ref: ds.meta.referenceDate,
    buyer: new Map(ds.buyers.map((x) => [x.id, x])),
    company: new Map(ds.companies.map((x) => [x.id, x])),
    sector: new Map(ds.sectors.map((x) => [x.id, x])),
    region: new Map(ds.regions.map((x) => [x.id, x])),
    opp: new Map(ds.opportunities.map((x) => [x.id, x])),
    clean,
    duplicates,
    awardsByOpp: groupBy(ds.awards, (a) => a.opportunityId),
    awardsByCompany: groupBy(ds.awards, (a) => a.companyId),
    partsByOpp: groupBy(ds.participations, (p) => p.opportunityId),
    partsByCompany: groupBy(ds.participations, (p) => p.companyId),
    oppsByBuyer: groupBy(clean, (o) => o.buyerId),
  };
}

export const sectorName = (c: Ctx, id: string | null | undefined) => (id ? c.sector.get(id)?.name ?? id : t("Unclassified"));
export const regionName = (c: Ctx, id: string | null | undefined) => (id ? c.region.get(id)?.name ?? id : t("Unknown region"));
export const buyerName = (c: Ctx, id: string | null | undefined) => (id ? c.buyer.get(id)?.name ?? id : t("Unidentified buyer"));
export const companyName = (c: Ctx, id: string | null | undefined) => (id ? c.company.get(id)?.name ?? id : t("Unidentified"));

/** Generic filter applied across market analytics. */
export interface MarketFilter {
  sectorIds?: string[];
  regionIds?: string[];
  buyerTypes?: string[];
  from?: string; // inclusive ISO date
  to?: string; // inclusive ISO date
}

export function filterOpps(c: Ctx, f: MarketFilter = {}, rows: Opportunity[] = c.clean): Opportunity[] {
  return rows.filter((o) => {
    if (f.sectorIds?.length && (!o.sectorId || !f.sectorIds.includes(o.sectorId))) return false;
    if (f.regionIds?.length && (!o.regionId || !f.regionIds.includes(o.regionId))) return false;
    if (f.buyerTypes?.length) {
      const b = o.buyerId ? c.buyer.get(o.buyerId) : null;
      if (!b || !f.buyerTypes.includes(b.type)) return false;
    }
    if (f.from && (!o.publicationDate || o.publicationDate < f.from)) return false;
    if (f.to && (!o.publicationDate || o.publicationDate > f.to)) return false;
    return true;
  });
}

/** Awards whose opportunity passes the filter (filter applies to the tender's attributes). */
export function filterAwards(c: Ctx, f: MarketFilter = {}): Award[] {
  const ok = new Set(filterOpps(c, f).map((o) => o.id));
  return c.ds.awards.filter((a) => ok.has(a.opportunityId));
}
