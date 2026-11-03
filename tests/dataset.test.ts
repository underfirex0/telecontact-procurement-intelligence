import { describe, expect, it } from "vitest";
import { generateDataset, TARGET_COUNTS } from "@/lib/data/generate";
import { validateDataset } from "@/lib/data/validate";

const ds = generateDataset();

describe("synthetic dataset", () => {
  it("is reproducible from the seed", () => {
    const again = generateDataset();
    expect(JSON.stringify(again)).toBe(JSON.stringify(ds));
    const other = generateDataset(42);
    expect(JSON.stringify(other)).not.toBe(JSON.stringify(ds));
  });

  it("hits the specified record counts", () => {
    expect(ds.opportunities).toHaveLength(TARGET_COUNTS.opportunities);
    expect(ds.buyers).toHaveLength(TARGET_COUNTS.buyers);
    expect(ds.companies).toHaveLength(TARGET_COUNTS.companies);
    expect(ds.participations).toHaveLength(TARGET_COUNTS.participations);
    expect(ds.awards).toHaveLength(TARGET_COUNTS.awards);
    expect(ds.suppliers).toHaveLength(TARGET_COUNTS.suppliers);
    expect(ds.contacts).toHaveLength(TARGET_COUNTS.contacts);
    expect(ds.sectors).toHaveLength(TARGET_COUNTS.sectors);
  });

  it("labels every record as synthetic", () => {
    for (const r of [...ds.opportunities, ...ds.buyers, ...ds.companies, ...ds.awards, ...ds.participations, ...ds.suppliers, ...ds.contacts]) {
      expect(r.provenance.synthetic).toBe(true);
      expect(r.provenance.source).toMatch(/Synthetic/);
    }
    expect(ds.meta.disclaimer).toMatch(/SYNTHETIC/);
  });

  it("spans 2023–2026 and uses MAD-scale values", () => {
    const years = new Set(ds.opportunities.map((o) => o.publicationDate?.slice(0, 4)).filter(Boolean));
    expect([...years].sort()).toEqual(["2023", "2024", "2025", "2026"]);
    const vals = ds.opportunities.map((o) => o.estimatedValue).filter((v): v is number => v !== null);
    expect(Math.min(...vals)).toBeGreaterThan(10_000);
  });

  it("passes referential integrity validation", () => {
    const res = validateDataset(ds);
    expect(res.errors).toEqual([]);
  });

  it("links every award to an Awarded opportunity and an existing awardee", () => {
    const companies = new Set(ds.companies.map((c) => c.id));
    for (const a of ds.awards) {
      const o = ds.opportunities.find((x) => x.id === a.opportunityId)!;
      expect(o.status).toBe("Awarded");
      expect(companies.has(a.companyId)).toBe(true);
      if (a.lotId) expect(o.lots.some((l) => l.id === a.lotId)).toBe(true);
    }
  });

  it("does not make every bidder a winner", () => {
    const outcomes = new Set(ds.participations.map((p) => p.outcome));
    expect(outcomes.has("Unsuccessful")).toBe(true);
    const winners = ds.participations.filter((p) => p.outcome === "Awarded");
    expect(winners.length).toBeLessThan(ds.participations.length / 2);
    // whenever a bidder list is disclosed for an awarded tender, the awardee is on it
    for (const oid of new Set(ds.participations.map((p) => p.opportunityId))) {
      const aw = ds.awards.filter((a) => a.opportunityId === oid);
      const bidders = ds.participations.filter((p) => p.opportunityId === oid).map((p) => p.companyId);
      for (const a of aw) expect(bidders).toContain(a.companyId);
    }
  });

  it("keeps opportunity statuses consistent with the reference date", () => {
    for (const o of ds.opportunities) {
      if (o.status === "Open" || o.status === "Closing soon") expect(o.deadline! >= ds.meta.referenceDate).toBe(true);
      if (o.deadline && o.deadline < ds.meta.referenceDate) expect(["Open", "Closing soon"]).not.toContain(o.status);
    }
  });

  it("uses only fictional contact channels", () => {
    for (const s of ds.suppliers) {
      expect(s.email.endsWith(".example")).toBe(true);
      expect(s.website).toMatch(/\.example$/);
    }
    for (const c of ds.contacts) expect(c.email.endsWith(".example")).toBe(true);
  });
});
