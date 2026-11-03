import { afterAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { FR } from "@/lib/i18n/fr";
import { setLang, t, tv } from "@/lib/i18n";
import * as f from "@/lib/format";
import { generateDataset } from "@/lib/data/generate";
import { buildContext } from "@/lib/analytics/context";
import { buildDossier, futureSignals, analyseQuality, buyerProfile, companyProfile } from "@/lib/analytics";
import { buildReport, REPORT_TYPES } from "@/lib/reports/builders";

function walk(d: string): string[] {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(d, e.name)] : []));
}
const sourceKeys = new Set<string>();
for (const file of walk(path.resolve(__dirname, "../src"))) {
  if (file.includes(`${path.sep}i18n${path.sep}`)) continue;
  const s = fs.readFileSync(file, "utf8");
  for (const m of s.matchAll(/\b(?:t|tk|tn)\(\s*("(?:[^"\\]|\\.)*")/g)) sourceKeys.add(JSON.parse(m[1]));
  for (const m of s.matchAll(/<Lbl t="([^"]+)"/g)) sourceKeys.add(m[1]);
}
const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
const EN_MARKERS = /\b(the|with|and|which|from|days|months|awards|records|tenders|suppliers|bidders|opportunities)\b/;

afterAll(() => setLang("en"));

describe("French dictionary", () => {
  it("covers every interface string used in the source code", () => {
    const missing = [...sourceKeys].filter((k) => !(k in FR) && !(k.split("@@")[0] in FR));
    expect(missing).toEqual([]);
  });
  it("keeps placeholders identical in both languages", () => {
    const bad = Object.entries(FR).filter(([k, v]) => ph(k.split("@@")[0]) !== ph(v));
    expect(bad).toEqual([]);
  });
  it("translates every data value used for display", () => {
    const ds = generateDataset();
    setLang("fr");
    const values = new Set<string>([
      ...ds.opportunities.map((o) => o.status), ...ds.suppliers.map((s) => s.status), ...ds.sectors.map((s) => s.name),
      ...ds.sectors.flatMap((s) => s.activities), ...ds.buyers.map((b) => b.type), ...ds.suppliers.map((s) => s.country),
      ...ds.suppliers.flatMap((s) => s.coverage), ...ds.contacts.map((c) => c.role), ...ds.jobs.map((j) => j.title),
      ...ds.jobs.flatMap((j) => j.expertise), ...ds.interactions.map((i) => i.summary), ...ds.meetings.map((m) => m.subject),
      ...ds.opportunities.map((o) => o.provenance.source), ...ds.suppliers.map((s) => s.previousCooperation), ...ds.suppliers.map((s) => s.description),
      ...ds.jobs.map((j) => j.description), ...ds.applications.map((a) => a.status), ds.meta.disclaimer,
    ]);
    const untranslated = [...values].filter((v) => v && tv(v) === v && !["Stable", "Communication", "Côte d'Ivoire", "Portugal", "France", "Europe", "Nigeria", "Mali", "Certification", "Participation", "Signal", "Note"].includes(v));
    setLang("en");
    expect(untranslated).toEqual([]);
  });
});

describe("locale-aware formatting", () => {
  it("formats numbers, currency, percentages and dates per language", () => {
    setLang("en");
    expect(f.mad(4_200_000)).toBe("4.20M MAD");
    expect(f.date("2026-11-03")).toBe("3 Nov 2026");
    expect(f.pct(0.375, 1)).toBe("37.5%");
    setLang("fr");
    expect(f.mad(4_200_000)).toBe("4,20 M MAD");
    expect(f.date("2026-11-03")).toBe("3 nov. 2026");
    expect(f.pct(0.375, 1)).toBe("37,5 %");
    expect(f.quarter("2025-Q3")).toBe("T3 2025");
    expect(t("Context@@x")).toBe("Context");
    setLang("en");
    expect(t("Awarded@@view")).toBe("Awarded");
  });
});

describe("analytical text in French", () => {
  it("produces dossiers, signals, profiles and quality text without English sentences", () => {
    setLang("fr");
    const c = buildContext(generateDataset());
    const offenders: string[] = [];
    const check = (s: string) => { if (EN_MARKERS.test(s)) offenders.push(s); };
    for (const o of c.clean.slice(0, 120)) {
      const d = buildDossier(c, o.id)!;
      d.statements.forEach((s) => check(s.text));
      d.risks.forEach((r) => check(`${r.title} ${r.detail}`));
      d.readiness.components.forEach((x) => check(x.basis));
      check(d.readiness.verdict);
    }
    futureSignals(c).forEach((s) => check(s.explanation));
    c.ds.buyers.forEach((b) => buyerProfile(c, b.id)!.observations.forEach((x) => check(x.text)));
    c.ds.companies.slice(0, 30).forEach((co) => companyProfile(c, co.id)!.observations.forEach((x) => check(x.text)));
    analyseQuality(c).components.forEach((x) => check(x.explanation));
    setLang("en");
    expect(offenders.slice(0, 5)).toEqual([]);
  });
  it("produces every report type in French", () => {
    setLang("fr");
    const c = buildContext(generateDataset());
    const subj: Record<string, string | null> = { opportunity: "OPP-0284", bid: "OPP-0284", buyer: "B003", competitor: "C027", awardee: null, market: null, supplier: null, signals: null };
    const offenders: string[] = [];
    for (const r of REPORT_TYPES) {
      const doc = buildReport(c, r.kind, subj[r.kind])!;
      [doc.title, doc.subtitle, ...doc.summary, ...doc.methodology, ...doc.recommendations, ...doc.limitations, ...doc.findings.map((x) => x.text)].forEach((s) => {
        if (EN_MARKERS.test(s)) offenders.push(`${r.kind}: ${s}`);
      });
    }
    setLang("en");
    expect(offenders.slice(0, 5)).toEqual([]);
  });
});
