/**
 * Referential-integrity validator for the dataset (and for user-created records).
 * Returns hard errors (broken links) and warnings (tolerated data-quality defects).
 */
import type { Dataset, Supplier } from "../types";
import { RELATIONSHIP_STAGES } from "../types";

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

export function validateDataset(ds: Dataset): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = (xs: { id: string }[]) => new Set(xs.map((x) => x.id));
  const buyers = ids(ds.buyers);
  const companies = ids(ds.companies);
  const opps = ids(ds.opportunities);
  const sectors = ids(ds.sectors);
  const regions = ids(ds.regions);
  const suppliers = ids(ds.suppliers);
  for (const set of [buyers, companies, opps, suppliers]) if (set.size === 0) errors.push("empty collection");
  if (opps.size !== ds.opportunities.length) errors.push("duplicate opportunity ids");
  for (const o of ds.opportunities) {
    if (o.buyerId && !buyers.has(o.buyerId)) errors.push(`${o.id}: unknown buyer ${o.buyerId}`);
    if (o.sectorId && !sectors.has(o.sectorId)) errors.push(`${o.id}: unknown sector ${o.sectorId}`);
    if (o.regionId && !regions.has(o.regionId)) errors.push(`${o.id}: unknown region ${o.regionId}`);
    if (o.publicationDate && o.deadline && o.deadline < o.publicationDate) errors.push(`${o.id}: deadline before publication`);
    if (!o.lots.length) errors.push(`${o.id}: no lots`);
    if (o.lots.some((l) => l.opportunityId !== o.id)) errors.push(`${o.id}: lot linked to another tender`);
    if (o.estimatedValue !== null && o.estimatedValue <= 0) errors.push(`${o.id}: non-positive value`);
    if (!o.buyerId) warnings.push(`${o.id}: buyer missing`);
  }
  for (const a of ds.awards) {
    if (!opps.has(a.opportunityId)) errors.push(`${a.id}: unknown opportunity`);
    if (!companies.has(a.companyId)) errors.push(`${a.id}: unknown awardee`);
    if (a.amount === null) warnings.push(`${a.id}: amount missing`);
  }
  for (const p of ds.participations) {
    if (!opps.has(p.opportunityId)) errors.push(`${p.id}: unknown opportunity`);
    if (!companies.has(p.companyId)) errors.push(`${p.id}: unknown company`);
  }
  for (const c of ds.contacts) if (c.supplierId && !suppliers.has(c.supplierId)) errors.push(`${c.id}: unknown supplier`);
  for (const i of ds.interactions) if (!suppliers.has(i.supplierId)) errors.push(`${i.id}: unknown supplier`);
  for (const m of ds.meetings) if (!suppliers.has(m.supplierId)) errors.push(`${m.id}: unknown supplier`);
  for (const a of ds.applications) {
    if (!ds.jobs.some((j) => j.id === a.jobId)) errors.push(`${a.id}: unknown job`);
    if (!ds.talents.some((t) => t.id === a.talentId)) errors.push(`${a.id}: unknown talent`);
  }
  for (const s of ds.suppliers) errors.push(...validateSupplier(s).map((e) => `${s.id}: ${e}`));
  return { errors, warnings };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Field-level validation used by both the dataset check and the supplier forms. */
export function validateSupplier(s: Partial<Supplier>): string[] {
  const e: string[] = [];
  if (!s.name || s.name.trim().length < 2) e.push("Company name is required");
  if (!s.country) e.push("Country is required");
  if (!s.sectorIds || !s.sectorIds.length) e.push("At least one sector is required");
  if (s.email && !EMAIL.test(s.email)) e.push("Email format is invalid");
  if (s.website && !/^https?:\/\//.test(s.website)) e.push("Website must start with http:// or https://");
  if (s.status && !RELATIONSHIP_STAGES.includes(s.status)) e.push("Unknown relationship stage");
  if (s.followUpDate && s.lastInteraction && s.followUpDate < s.lastInteraction) e.push("Follow-up date is before the last interaction");
  return e;
}

export function isEmail(v: string): boolean {
  return EMAIL.test(v);
}
