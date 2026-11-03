import { describe, expect, it } from "vitest";
import { generateDataset } from "@/lib/data/generate";
import {
  analyseQuality, buildContext, buildDossier, buyerProfile, companySummaries, concentrationBySector, futureSignals,
  growthSignals, hhi, median, overallConcentration, overviewKpis, quantile, recurringSeries, similarity, timeSeries, topNShare,
} from "@/lib/analytics";

const ds = generateDataset();
const c = buildContext(ds);

describe("statistics primitives", () => {
  it("computes median / quantile", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(quantile([], 0.5)).toBeNull();
  });
  it("computes HHI and top-N share", () => {
    expect(hhi([1])).toBe(10000);
    expect(hhi([1, 1, 1, 1])).toBe(2500);
    expect(topNShare([5, 3, 2], 1)).toBe(0.5);
  });
});

describe("duplicate detection", () => {
  it("detects exactly the injected duplicates without reading ground truth", () => {
    const truth = ds.opportunities.filter((o) => o.duplicateOf).map((o) => o.id).sort();
    expect(c.duplicates.map((d) => d.id).sort()).toEqual(truth);
    expect(c.clean.length).toBe(ds.opportunities.length - truth.length);
  });
});

describe("data quality", () => {
  const q = analyseQuality(c);
  it("produces a score from its documented components", () => {
    const recomputed = q.components.reduce((a, x) => a + x.weight * x.value, 0) * 100;
    expect(q.score).toBeCloseTo(recomputed, 0);
    expect(q.score).toBeGreaterThan(50);
    expect(q.score).toBeLessThan(100);
  });
  it("finds missing budgets, duplicate entities and inconsistent classifications", () => {
    expect(q.fields.find((f) => f.field === "estimatedValue")!.rate).toBeLessThan(0.95);
    expect(q.duplicateEntities.length).toBe(2);
    expect(q.inconsistent.length).toBeGreaterThanOrEqual(4);
  });
});

describe("market analysis", () => {
  it("time series sums to the number of dated clean records", () => {
    const ts = timeSeries(c);
    expect(ts.points.reduce((a, p) => a + p.count, 0)).toBe(ts.n);
    expect(ts.n + ts.excluded).toBe(c.clean.length);
  });
  it("kpis are consistent with records", () => {
    const k = overviewKpis(c);
    expect(k.total).toBe(c.clean.length);
    expect(k.active).toBe(c.clean.filter((o) => o.status === "Open" || o.status === "Closing soon").length);
    expect(k.awards).toBeLessThanOrEqual(ds.awards.length);
  });
  it("growth windows compare equal-length periods", () => {
    for (const g of growthSignals(c)) expect(g.current + g.previous).toBeLessThanOrEqual(c.clean.length);
  });
});

describe("concentration", () => {
  it("overall HHI is within bounds and sector rows sum to all awards", () => {
    const o = overallConcentration(c);
    expect(o.hhiValue!).toBeGreaterThan(0);
    expect(o.hhiValue!).toBeLessThanOrEqual(10000);
    expect(concentrationBySector(c).reduce((a, r) => a + r.awards, 0)).toBe(ds.awards.length);
  });
});

describe("competitors", () => {
  it("never confuses participations with awards", () => {
    const rows = companySummaries(c);
    expect(rows.reduce((a, r) => a + r.awards, 0)).toBe(ds.awards.length);
    expect(rows.reduce((a, r) => a + r.participations, 0)).toBe(ds.participations.length);
    for (const r of rows) {
      if (r.winRate !== null) expect(r.winRate).toBeLessThanOrEqual(1);
      expect(r.wins).toBeLessThanOrEqual(r.participations);
    }
    expect(rows.some((r) => r.participations > 0 && r.awards === 0)).toBe(true);
  });
});

describe("buyers", () => {
  it("profiles every buyer and links observations to evidence", () => {
    for (const b of ds.buyers) {
      const p = buyerProfile(c, b.id)!;
      expect(p.summary.opportunities).toBe(c.oppsByBuyer.get(b.id)?.length ?? 0);
      for (const ob of p.observations) for (const id of ob.evidence) expect(c.opp.has(id)).toBe(true);
    }
  });
});

describe("recurrence & signals", () => {
  it("detects recurring purchasing lines", () => {
    const rec = recurringSeries(c).filter((s) => s.occurrences.length >= 3);
    expect(rec.length).toBeGreaterThan(10);
  });
  it("produces explainable signals with bounded confidence", () => {
    const sigs = futureSignals(c);
    expect(sigs.length).toBeGreaterThan(10);
    for (const s of sigs) {
      expect(s.confidence).toBeGreaterThanOrEqual(0);
      expect(s.confidence).toBeLessThanOrEqual(1);
      expect(s.historical.length).toBeGreaterThanOrEqual(2);
      expect(s.windowStart <= s.windowEnd).toBe(true);
      expect(s.explanation.length).toBeGreaterThan(50);
      const sum = s.components.reduce((a, x) => a + x.value, 0);
      expect(Math.max(0, Math.min(1, sum))).toBeCloseTo(s.confidence, 5);
    }
  });
});

describe("dossier", () => {
  it("assembles a dossier for every opportunity", () => {
    for (const o of ds.opportunities) {
      const d = buildDossier(c, o.id)!;
      expect(d.readiness.score).toBeGreaterThanOrEqual(0);
      expect(d.readiness.score).toBeLessThanOrEqual(100);
      expect(d.statements.some((s) => s.kind === "fact")).toBe(true);
      expect(d.statements.some((s) => s.kind === "unknown")).toBe(true);
      if (d.timing.state === "Closed") expect(d.readiness.posture).toBe("Historical — intelligence only");
    }
  });
  it("similarity is symmetric and bounded", () => {
    const [a, b] = c.clean;
    expect(similarity(a, b).score).toBe(similarity(b, a).score);
    expect(similarity(a, a).score).toBeLessThanOrEqual(1);
  });
});

import { query } from "@/lib/query";
describe("query utility", () => {
  const rows = [{ n: "Échafaudage", v: 3 }, { n: "beta", v: null as number | null }, { n: "alpha", v: 1 }];
  it("searches accent-insensitively, sorts nulls last and paginates", () => {
    expect(query(rows, { search: "echaf", searchFields: [(r) => r.n] }).total).toBe(1);
    const asc = query(rows, { sort: { value: (r) => r.v, dir: "asc" } }).rows.map((r) => r.v);
    expect(asc).toEqual([1, 3, null]);
    const desc = query(rows, { sort: { value: (r) => r.v, dir: "desc" } }).rows.map((r) => r.v);
    expect(desc).toEqual([3, 1, null]);
    const p = query(rows, { page: 2, pageSize: 2 });
    expect(p.rows).toHaveLength(1);
    expect(p.pages).toBe(2);
  });
});

import { buildReport, REPORT_TYPES } from "@/lib/reports/builders";
import { toCSV, toExcelXML } from "@/lib/reports/export";
describe("report engine", () => {
  it("builds every report type with all mandatory sections and synthetic labelling", () => {
    const subjects: Record<string, string | null> = {
      opportunity: c.clean.find((o) => o.status === "Open")!.id, bid: c.clean.find((o) => o.status === "Open")!.id, buyer: ds.buyers[0].id,
      competitor: ds.awards[0].companyId, awardee: null, market: null, supplier: ds.suppliers[0].id, signals: null,
    };
    for (const t of REPORT_TYPES) {
      const r = buildReport(c, t.kind, subjects[t.kind])!;
      expect(r).not.toBeNull();
      expect(r.summary.length).toBeGreaterThan(0);
      expect(r.methodology.length).toBeGreaterThan(0);
      expect(r.limitations.some((l) => l.includes("SYNTHETIC"))).toBe(true);
      expect(r.sources.length).toBeGreaterThan(0);
      expect(r.generatedAt).toMatch(/^\d{4}-/);
    }
    expect(buildReport(c, "supplier", null)!.title).toMatch(/Network/);
  });
  it("exports carry the synthetic disclaimer and escape values", () => {
    const csv = toCSV([{ a: 'x,"y"', b: 2 }]);
    expect(csv.split("\n")[0]).toMatch(/SYNTHETIC DEMO DATA/);
    expect(csv).toContain('"x,""y"""');
    const xml = toExcelXML([{ name: "S", rows: [{ a: "<b>", n: 3 }] }]);
    expect(xml).toContain("&lt;b&gt;");
    expect(xml).toContain('ss:Type="Number"');
    expect(xml).toContain("SYNTHETIC DEMO DATA");
  });
});
