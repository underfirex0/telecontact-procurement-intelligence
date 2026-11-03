"use client";
import { t, tv } from "@/lib/i18n";
import { tn } from "@/lib/i18n/react";
import Link from "next/link";
import { Download, RotateCcw } from "lucide-react";
import { getContext } from "@/lib/services/data-service";
import { useWorkspace } from "@/lib/services/workspace";
import { TARGET_COUNTS } from "@/lib/data/generate";
import { validateDataset } from "@/lib/data/validate";
import { downloadFile, DISCLAIMER } from "@/lib/reports/export";
import * as f from "@/lib/format";
import { DefList, Note, PageHeader, Section } from "@/components/ui";

export default function SettingsPage() {
  const c = getContext();
  const { state, dispatch, toast, hydrated } = useWorkspace();
  const v = validateDataset(c.ds);
  const m = c.ds.meta;
  const counts: [string, number, number | null][] = [
    [t("Opportunities"), c.ds.opportunities.length, TARGET_COUNTS.opportunities], [t("Lots"), c.ds.opportunities.reduce((a, o) => a + o.lots.length, 0), null],
    [t("Contracting authorities"), c.ds.buyers.length, TARGET_COUNTS.buyers], [t("Companies"), c.ds.companies.length, TARGET_COUNTS.companies],
    [t("Bidder participation records"), c.ds.participations.length, TARGET_COUNTS.participations], [t("Award records"), c.ds.awards.length, TARGET_COUNTS.awards],
    [t("Suppliers & service providers"), c.ds.suppliers.length, TARGET_COUNTS.suppliers], [t("Individual contacts"), c.ds.contacts.length, TARGET_COUNTS.contacts],
    [t("Sectors"), c.ds.sectors.length, TARGET_COUNTS.sectors], [t("Regions"), c.ds.regions.length, null], [t("Interactions"), c.ds.interactions.length, null],
    [t("Meetings"), c.ds.meetings.length, null], [t("Job opportunities"), c.ds.jobs.length, null], [t("Talent profiles"), c.ds.talents.length, null], [t("Applications"), c.ds.applications.length, null],
  ];
  const ws = hydrated ? [
    [t("Saved opportunities"), Object.keys(state.saved).length], [t("Bid assessments"), Object.keys(state.assessments).length], [t("New suppliers"), state.newSuppliers.length],
    [t("Edited suppliers"), Object.keys(state.supplierEdits).length], [t("New contacts"), state.newContacts.length], [t("Logged interactions"), state.interactions.length],
    [t("Scheduled meetings"), state.meetings.length], [t("Provider registrations"), state.registrations.length], [t("Talent applications"), state.applications.length], [t("Reports generated"), state.reports.length],
  ] : [];
  return (
    <div>
      <PageHeader eyebrow={t("Module 13 · Settings")} title={t("Workspace and dataset settings")} description={t("Dataset provenance, validation status and the local demo workspace.")} />
      <Section index="01" title={t("Synthetic dataset")} kicker={t("Generated deterministically from a single seed; identical on every run.")}>
        <DefList cols={3} items={[
          { k: t("Dataset"), v: m.name }, { k: t("Generator"), v: <span className="font-mono text-[12.5px]">{m.generator}</span> }, { k: t("Seed"), v: <span className="font-mono">{m.seed}</span> },
          { k: t("Reference date (fixed “today”)"), v: f.date(m.referenceDate) }, { k: t("Publication period"), v: `${f.date(m.periodStart)} – ${f.date(m.periodEnd)}` }, { k: t("Currency"), v: "Moroccan dirham (MAD), excl. tax" },
          { k: t("Validation"), v: v.errors.length ? <span className="text-signal-bad">{t("{n} integrity errors", { n: v.errors.length })}</span> : <span className="text-signal-good">{t("All referential checks pass ({n} tolerated data-quality warnings)", { n: v.warnings.length })}</span> },
        ]} />
        <table className="tbl dense mt-5 max-w-2xl"><thead><tr><th>{t("Entity")}</th><th className="!text-right">{t("Records")}</th><th className="!text-right">{t("Specified")}</th></tr></thead>
          <tbody>{counts.map(([k, n, t]) => <tr key={k}><td>{k}</td><td className="tnum text-right">{n}</td><td className="tnum text-right text-ink-500">{t ?? "—"}</td></tr>)}</tbody></table>
        <div className="mt-4"><Note tone="warn">{tv(m.disclaimer)}</Note></div>
      </Section>
      <Section index="02" title={t("Demo workspace")} kicker={t("Your saved opportunities, assessments, supplier edits, meetings and registrations — stored only in this browser (localStorage).")}>
        <table className="tbl dense max-w-xl"><tbody>{ws.map(([k, n]) => <tr key={String(k)}><td>{k}</td><td className="tnum text-right">{n}</td></tr>)}</tbody></table>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn" onClick={() => downloadFile(`telecontact-workspace-${c.ref}.json`, JSON.stringify({ disclaimer: DISCLAIMER, exportedAt: new Date().toISOString(), workspace: state }, null, 2), "application/json")}><Download size={14} /> {t("Export workspace JSON")}</button>
          <button className="btn" onClick={() => { if (confirm(t("Reset all demo workspace changes?"))) { dispatch({ type: "reset" }); toast(t("Demo workspace reset")); } }}><RotateCcw size={14} /> {t("Reset workspace")}</button>
        </div>
      </Section>
      <Section index="03" title={t("About this prototype")}>
        <div className="max-w-3xl space-y-2 text-[13px] leading-relaxed text-ink-700">
          <p><b>{t("Telecontact Intelligence — Procurement Intelligence")}</b> {t("is a functional prototype demonstrating the product vision. It is not an officially launched or approved Telecontact product.")}</p>
          <p>{t("No production system, VPS, external API, live website or real procurement data is used. Every organisation, person, tender, bid, award and supplier is fictional.")}</p>
          <p>{tn("Methodology and limitations are documented in the repository ({docs}). See also the {link}.", { docs: <span className="font-mono text-[12px]">docs/</span>, link: <Link className="link" href="/quality">{t("data quality workspace")}</Link> })}</p>
        </div>
      </Section>
    </div>
  );
}
