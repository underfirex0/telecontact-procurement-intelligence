"use client";
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
    ["Opportunities", c.ds.opportunities.length, TARGET_COUNTS.opportunities], ["Lots", c.ds.opportunities.reduce((a, o) => a + o.lots.length, 0), null],
    ["Contracting authorities", c.ds.buyers.length, TARGET_COUNTS.buyers], ["Companies", c.ds.companies.length, TARGET_COUNTS.companies],
    ["Bidder participation records", c.ds.participations.length, TARGET_COUNTS.participations], ["Award records", c.ds.awards.length, TARGET_COUNTS.awards],
    ["Suppliers & service providers", c.ds.suppliers.length, TARGET_COUNTS.suppliers], ["Individual contacts", c.ds.contacts.length, TARGET_COUNTS.contacts],
    ["Sectors", c.ds.sectors.length, TARGET_COUNTS.sectors], ["Regions", c.ds.regions.length, null], ["Interactions", c.ds.interactions.length, null],
    ["Meetings", c.ds.meetings.length, null], ["Job opportunities", c.ds.jobs.length, null], ["Talent profiles", c.ds.talents.length, null], ["Applications", c.ds.applications.length, null],
  ];
  const ws = hydrated ? [
    ["Saved opportunities", Object.keys(state.saved).length], ["Bid assessments", Object.keys(state.assessments).length], ["New suppliers", state.newSuppliers.length],
    ["Edited suppliers", Object.keys(state.supplierEdits).length], ["New contacts", state.newContacts.length], ["Logged interactions", state.interactions.length],
    ["Scheduled meetings", state.meetings.length], ["Provider registrations", state.registrations.length], ["Talent applications", state.applications.length], ["Reports generated", state.reports.length],
  ] : [];
  return (
    <div>
      <PageHeader eyebrow="Module 13 · Settings" title="Workspace and dataset settings" description="Dataset provenance, validation status and the local demo workspace." />
      <Section index="01" title="Synthetic dataset" kicker="Generated deterministically from a single seed; identical on every run.">
        <DefList cols={3} items={[
          { k: "Dataset", v: m.name }, { k: "Generator", v: <span className="font-mono text-[12.5px]">{m.generator}</span> }, { k: "Seed", v: <span className="font-mono">{m.seed}</span> },
          { k: "Reference date (fixed “today”)", v: f.date(m.referenceDate) }, { k: "Publication period", v: `${f.date(m.periodStart)} – ${f.date(m.periodEnd)}` }, { k: "Currency", v: "Moroccan dirham (MAD), excl. tax" },
          { k: "Validation", v: v.errors.length ? <span className="text-signal-bad">{v.errors.length} integrity errors</span> : <span className="text-signal-good">All referential checks pass ({v.warnings.length} tolerated data-quality warnings)</span> },
        ]} />
        <table className="tbl dense mt-5 max-w-2xl"><thead><tr><th>Entity</th><th className="!text-right">Records</th><th className="!text-right">Specified</th></tr></thead>
          <tbody>{counts.map(([k, n, t]) => <tr key={k}><td>{k}</td><td className="tnum text-right">{n}</td><td className="tnum text-right text-ink-500">{t ?? "—"}</td></tr>)}</tbody></table>
        <div className="mt-4"><Note tone="warn">{m.disclaimer}</Note></div>
      </Section>
      <Section index="02" title="Demo workspace" kicker="Your saved opportunities, assessments, supplier edits, meetings and registrations — stored only in this browser (localStorage).">
        <table className="tbl dense max-w-xl"><tbody>{ws.map(([k, n]) => <tr key={String(k)}><td>{k}</td><td className="tnum text-right">{n}</td></tr>)}</tbody></table>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn" onClick={() => downloadFile(`telecontact-workspace-${c.ref}.json`, JSON.stringify({ disclaimer: DISCLAIMER, exportedAt: new Date().toISOString(), workspace: state }, null, 2), "application/json")}><Download size={14} /> Export workspace JSON</button>
          <button className="btn" onClick={() => { if (confirm("Reset all demo workspace changes?")) { dispatch({ type: "reset" }); toast("Demo workspace reset"); } }}><RotateCcw size={14} /> Reset workspace</button>
        </div>
      </Section>
      <Section index="03" title="About this prototype">
        <div className="max-w-3xl space-y-2 text-[13px] leading-relaxed text-ink-700">
          <p><b>Telecontact Intelligence — Procurement Intelligence</b> is a functional prototype demonstrating the product vision. It is not an officially launched or approved Telecontact product.</p>
          <p>No production system, VPS, external API, live website or real procurement data is used. Every organisation, person, tender, bid, award and supplier is fictional.</p>
          <p>Methodology and limitations are documented in the repository (<span className="font-mono text-[12px]">docs/</span>). See also the <Link className="link" href="/quality">data quality workspace</Link>.</p>
        </div>
      </Section>
    </div>
  );
}
