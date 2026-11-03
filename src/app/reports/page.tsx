"use client";
import { t, tv } from "@/lib/i18n";
import { tn } from "@/lib/i18n/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { FileDown, FileSpreadsheet, Printer, FileJson } from "lucide-react";
import { getContext } from "@/lib/services/data-service";
import { useInteractions, useMeetings, useSuppliers, useWorkspace } from "@/lib/services/workspace";
import { buildReport, REPORT_TYPES, type ReportDoc } from "@/lib/reports/builders";
import { toCSV, toExcelXML, downloadFile, DISCLAIMER } from "@/lib/reports/export";
import type { ReportKind } from "@/lib/types";
import * as f from "@/lib/format";
import { BarList } from "@/components/charts";
import { BrandMark } from "@/components/shell";
import { EvidenceLinks, KindTag, Note, clsx } from "@/components/ui";

function ReportsInner() {
  const c = getContext();
  const sp = useSearchParams();
  const router = useRouter();
  const suppliers = useSuppliers();
  const interactions = useInteractions();
  const meetings = useMeetings();
  const { state, dispatch, toast, hydrated } = useWorkspace();
  const [kind, setKind] = useState<ReportKind>((sp.get("type") as ReportKind) ?? "market");
  const [subject, setSubject] = useState(sp.get("subject") ?? "");
  const [doc, setDoc] = useState<ReportDoc | null>(null);
  const meta = REPORT_TYPES.find((tx) => tx.kind === kind)!;

  const subjects = useMemo(() => {
    switch (meta.subject) {
      case "opportunity": return c.clean.slice().sort((a, b) => (b.publicationDate ?? "").localeCompare(a.publicationDate ?? "")).map((o) => ({ value: o.id, label: `${o.reference} — ${o.title}` }));
      case "bid": {
        const ids = hydrated ? [...new Set([...Object.keys(state.assessments), ...Object.keys(state.saved)])] : [];
        const act = c.clean.filter((o) => o.status === "Open" || o.status === "Closing soon").map((o) => o.id);
        return [...new Set([...ids, ...act])].map((id) => c.opp.get(id)!).map((o) => ({ value: o.id, label: `${state.assessments[o.id] ? "● " : ""}${o.reference} — ${o.title}` }));
      }
      case "buyer": return c.ds.buyers.map((b) => ({ value: b.id, label: `${b.acronym} — ${b.name}` }));
      case "company": return c.ds.companies.map((x) => ({ value: x.id, label: x.name }));
      case "sector": return [{ value: "", label: t("All sectors") }, ...c.ds.sectors.map((s) => ({ value: s.id, label: s.name }))];
      case "supplier": return [{ value: "", label: t("Whole network") }, ...suppliers.map((s) => ({ value: s.id, label: `${s.name} (${tv(s.country)})` }))];
      default: return [];
    }
  }, [meta.subject, c, suppliers, state.assessments, state.saved, hydrated]);

  const generate = (k = kind, s = subject, log = true) => {
    const needs = ["opportunity", "bid", "buyer", "company"].includes(REPORT_TYPES.find((tx) => tx.kind === k)!.subject);
    if (needs && !s) { setDoc(null); return; }
    const r = buildReport(c, k, s || null, { suppliers, assessment: s ? state.assessments[s] : undefined, interactions, meetings });
    setDoc(r);
    if (r && log) {
      dispatch({ type: "logReport", report: { id: `RPT-${Date.now()}`, kind: k, subjectId: s || null, title: r.title, generatedAt: r.generatedAt } });
      router.replace(`/reports?type=${k}${s ? `&subject=${s}` : ""}`, { scroll: false });
    }
  };
  // auto-generate when arriving with a type/subject
  useEffect(() => { if (hydrated) generate(kind, subject, false); }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const slug = doc ? doc.title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : "report";
  const exportExcel = () => {
    if (!doc) return;
    const summary = [{ field: t("Title"), value: doc.title }, { field: t("Subtitle"), value: doc.subtitle }, { field: t("Generated"), value: doc.generatedAt }, { field: t("Reference date"), value: doc.referenceDate }, ...doc.summary.map((s, i) => ({ field: t("Summary {n}", { n: i + 1 }), value: s })), ...doc.findings.map((x, i) => ({ field: t("Finding {n} ({kind})", { n: i + 1, kind: t(x.kind.charAt(0).toUpperCase() + x.kind.slice(1)) }), value: x.text })), ...doc.limitations.map((x, i) => ({ field: t("Limitation {n}", { n: i + 1 }), value: x }))];
    downloadFile(`${slug}.xls`, toExcelXML([{ name: t("Summary"), rows: summary }, ...doc.tables.map((tx) => ({ name: tx.title, rows: tx.rows })), ...doc.charts.map((ch) => ({ name: `${t("Chart")} - ${ch.title}`.slice(0, 31), rows: ch.rows.map((r) => ({ label: r.label, value: r.value })) }))]), "application/vnd.ms-excel");
    toast(t("Excel workbook exported"));
  };

  return (
    <div>
      <div className="no-print border-b border-line px-5 pb-4 pt-6 md:px-8">
        <div className="eyebrow mb-2">{t("Module 12 · Reports & intelligence dossiers")}</div>
        <h1 className="text-[22px] font-semibold">{t("Report generation")}</h1>
        <p className="mt-1 text-sm text-ink-600">{t("Generate a traceable intelligence document, then export it as PDF (print), Excel workbook, CSV tables or JSON. Every export carries the synthetic-data notice.")}</p>
      </div>
      <div className="grid lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="no-print border-line px-5 py-5 lg:border-r">
          <div className="eyebrow mb-2">{t("Report type")}</div>
          <div className="space-y-1">
            {REPORT_TYPES.map((tx, i) => (
              <button key={tx.kind} onClick={() => { setKind(tx.kind); setSubject(""); setDoc(null); }} className={clsx("w-full rounded-[5px] border px-3 py-2 text-left", kind === tx.kind ? "border-ink-900 bg-white shadow-hair" : "border-transparent hover:bg-canvas")}>
                <div className="flex items-baseline gap-2"><span className="font-mono text-[10px] text-accent">{String(i + 1).padStart(2, "0")}</span><span className="text-[13px] font-medium">{t(tx.label)}</span></div>
                <div className="pl-6 text-[11.5px] leading-snug text-ink-500">{t(tx.description)}</div>
              </button>
            ))}
          </div>
          {subjects.length > 0 && (
            <label className="mt-4 block"><span className="label">{t("Subject")}</span>
              <select className="field" value={subject} onChange={(e) => setSubject(e.target.value)}>
                {!["sector", "supplier"].includes(meta.subject) && <option value="">{t("Select…")}</option>}
                {subjects.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
          )}
          <button className="btn-primary mt-4 w-full justify-center" onClick={() => generate()} disabled={["opportunity", "bid", "buyer", "company"].includes(meta.subject) && !subject}>{t("Generate report")}</button>
          <div className="mt-6">
            <div className="eyebrow mb-2">{t("Recently generated")}</div>
            {hydrated && state.reports.length === 0 && <div className="text-[12px] text-ink-500">{t("None yet.")}</div>}
            {hydrated && state.reports.slice(0, 8).map((r) => (
              <button key={r.id} onClick={() => { setKind(r.kind); setSubject(r.subjectId ?? ""); generate(r.kind, r.subjectId ?? "", false); }} className="block w-full border-b border-line-soft py-1.5 text-left hover:text-accent-700">
                <div className="truncate text-[12.5px]">{r.title}</div><div className="text-[11px] text-ink-500">{new Date(r.generatedAt).toLocaleString("en-GB")}</div>
              </button>
            ))}
          </div>
        </aside>
        <div className="min-w-0 bg-canvas px-4 py-6 md:px-8">
          {!doc ? (
            <div className="mx-auto max-w-[880px] rounded-md border border-dashed border-line-strong bg-white px-8 py-16 text-center text-sm text-ink-500">{["opportunity", "bid", "buyer", "company"].includes(meta.subject) ? t("Choose a report type and a subject, then generate.") : t("Choose a report type, then generate.")}</div>
          ) : (
            <>
              <div className="no-print mx-auto mb-3 flex max-w-[880px] flex-wrap justify-end gap-2">
                <button className="btn" onClick={() => window.print()}><Printer size={14} /> {t("PDF / Print")}</button>
                <button className="btn" onClick={exportExcel}><FileSpreadsheet size={14} /> {t("Excel")}</button>
                <button className="btn" onClick={() => { downloadFile(`${slug}.json`, JSON.stringify({ disclaimer: DISCLAIMER, ...doc }, null, 2), "application/json"); toast(t("JSON exported")); }}><FileJson size={14} /> JSON</button>
              </div>
              <ReportSheet doc={doc} onCsv={(i) => { downloadFile(`${slug}-${i + 1}.csv`, toCSV(doc.tables[i].rows), "text/csv"); toast(t("CSV exported")); }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportSheet({ doc, onCsv }: { doc: ReportDoc; onCsv: (i: number) => void }) {
  const H = ({ n, children }: { n: string; children: React.ReactNode }) => <h2 className="mb-3 mt-8 flex items-baseline gap-2 border-b border-ink-900 pb-1.5 font-serif text-[18px] font-semibold"><span className="font-mono text-[11px] font-normal text-accent">{n}</span>{children}</h2>;
  return (
    <article className="report-sheet mx-auto max-w-[880px] rounded-[4px] bg-white px-10 py-10 shadow-hair">
      <div className="flex items-start justify-between gap-6 border-b-2 border-ink-900 pb-4">
        <div className="flex items-center gap-2.5"><BrandMark className="h-9 w-9" /><div className="leading-none"><div className="text-[13px] font-bold tracking-[0.16em]">{t("TELECONTACT")}</div><div className="mt-1 text-[9.5px] font-semibold tracking-[0.2em] text-accent">{t("INTELLIGENCE · PROCUREMENT")}</div></div></div>
        <div className="text-right text-[11px] text-ink-500"><div>{t("Generated {date}", { date: f.dateTime(doc.generatedAt) })}</div><div>{t("Data reference date {date}", { date: f.date(doc.referenceDate) })}</div><div className="mt-1 font-semibold tracking-[0.08em] text-signal-warn">{t("SYNTHETIC DEMO DATA")}</div></div>
      </div>
      <div className="mt-6">
        <div className="eyebrow">{t(REPORT_TYPES.find((tx) => tx.kind === doc.kind)?.label ?? "")}</div>
        <h1 className="mt-1 font-serif text-[28px] font-semibold leading-tight">{doc.title}</h1>
        <div className="mt-1 text-[14px] text-ink-600">{doc.subtitle}</div>
      </div>
      <div className="mt-5 rounded-[4px] border border-[#F0DDB8] bg-[#FDF9F0] px-3 py-2 text-[11.5px] text-[#7A4D05]">{t(DISCLAIMER)} {t("Prototype — not an officially launched or approved Telecontact product.")}</div>

      <H n="1">{t("Executive summary")}</H>
      <ul className="space-y-1.5">{doc.summary.map((s, i) => <li key={i} className="flex gap-2 text-[13.5px] leading-relaxed"><span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-ink-900" />{s}</li>)}</ul>

      <H n="2">{t("Scope and methodology")}</H>
      <p className="text-[13px] text-ink-700">{doc.scope}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-[12.5px] text-ink-600">{doc.methodology.map((m, i) => <li key={i}>{m}</li>)}</ul>

      <H n="3">{t("Key findings")}</H>
      <table className="w-full text-[12.5px]"><tbody>
        {doc.findings.map((x, i) => (
          <tr key={i} className="border-b border-line-soft align-top"><td className="w-[120px] py-1.5"><KindTag kind={x.kind} /></td><td className="py-1.5">{x.text}{x.evidence && x.evidence.length > 0 && <div className="no-print"><EvidenceLinks ids={x.evidence} max={5} /></div>}{x.evidence && x.evidence.length > 0 && <div className="print-only text-[10px] text-ink-500">{t("Evidence:")} {[...new Set(x.evidence)].slice(0, 10).join(", ")}{x.evidence.length > 10 ? "…" : ""}</div>}</td></tr>
        ))}
        {doc.findings.length === 0 && <tr><td className="py-2 text-ink-500">{t("No finding generated for this subject.")}</td></tr>}
      </tbody></table>

      {doc.charts.length > 0 && <H n="4">{t("Charts")}</H>}
      <div className="grid gap-6 md:grid-cols-2">
        {doc.charts.map((ch) => (
          <figure key={ch.title} className="break-inside-avoid">
            <figcaption className="mb-1 text-[12.5px] font-semibold">{ch.title}</figcaption>
            <BarList rows={ch.rows.map((r) => ({ key: r.label, label: r.label, value: r.value, display: r.display }))} labelWidth="w-[46%]" />
            <div className="mt-1 text-[10.5px] text-ink-500">{ch.note} {t("· synthetic data")}</div>
          </figure>
        ))}
      </div>

      <H n="5">{t("Relevant data")}</H>
      {doc.tables.map((tx, i) => (
        <section key={tx.title} className="mb-6">
          <div className="mb-1 flex items-center justify-between"><div className="text-[12.5px] font-semibold">{tx.title} <span className="font-normal text-ink-500">({t("{n} rows", { n: tx.rows.length })})</span></div><button className="no-print btn-ghost btn-sm" onClick={() => onCsv(i)}><FileDown size={12} /> CSV</button></div>
          {tx.rows.length === 0 ? <div className="text-[12px] text-ink-500">{t("No rows.")}</div> : (
            <div className="overflow-x-auto"><table className="tbl dense text-[11.5px]">
              <thead><tr>{Object.keys(tx.rows[0]).map((k) => <th key={k} className="!px-2 !text-[9.5px]">{t(k.replace(/_/g, " "))}</th>)}</tr></thead>
              <tbody>{tx.rows.slice(0, 25).map((r, j) => <tr key={j}>{Object.keys(tx.rows[0]).map((k) => <td key={k} className="!px-2 !text-[11.5px]">{typeof r[k] === "number" && /mad|value|amount/.test(k) ? f.mad(r[k] as number, { unit: false }) : tv(String(r[k] ?? ""))}</td>)}</tr>)}</tbody>
            </table></div>
          )}
          {tx.rows.length > 25 && <div className="mt-1 text-[11px] text-ink-500">{t("Showing 25 of {n} rows — full table in Excel/CSV export.", { n: tx.rows.length })}</div>}
        </section>
      ))}

      <H n="6">{t("Recommendations")}</H>
      <ol className="list-decimal space-y-1 pl-5 text-[13px]">{doc.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ol>

      <H n="7">{t("Limitations")}</H>
      <ul className="list-disc space-y-1 pl-5 text-[12.5px] text-ink-600">{doc.limitations.map((r, i) => <li key={i}>{r}</li>)}</ul>

      <H n="8">{t("Sources and data provenance")}</H>
      <ul className="list-disc space-y-1 pl-5 text-[12px] text-ink-600">{doc.sources.map((r, i) => <li key={i}>{r}</li>)}</ul>

      <div className="mt-10 flex justify-between border-t border-line pt-3 text-[10.5px] text-ink-500"><span>{t("Telecontact Intelligence · Procurement Intelligence prototype")}</span><span>{t("SYNTHETIC DEMO DATA ·")} {f.date(doc.generatedAt.slice(0, 10))}</span></div>
      <div className="no-print mt-4"><Note>{tn("Evidence identifiers link to the underlying records. The {link} explains coverage limits.", { link: <Link href="/quality" className="underline">{t("data quality workspace")}</Link> })}</Note></div>
    </article>
  );
}

export default function ReportsPage() {
  return <Suspense><ReportsInner /></Suspense>;
}
