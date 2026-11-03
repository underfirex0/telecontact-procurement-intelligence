"use client";
import { t, tv } from "@/lib/i18n";
import { tn } from "@/lib/i18n/react";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { getContext } from "@/lib/services/data-service";
import { analyseQuality, type QualityIssue } from "@/lib/analytics";
import * as f from "@/lib/format";
import { toCSV, downloadFile } from "@/lib/reports/export";
import { DataTable } from "@/components/data-table";
import { Badge, Chip, EvidenceLinks, FigureStrip, Meter, PageHeader, Section, SubHead, recordHref, scoreTone } from "@/components/ui";
import Link from "next/link";

export default function QualityPage() {
  const c = getContext();
  const q = useMemo(() => analyseQuality(c), [c]);
  const [kind, setKind] = useState<QualityIssue["kind"] | "">("");
  const issues = q.issues.filter((i) => !kind || i.kind === kind);
  const kinds = [...new Set(q.issues.map((i) => i.kind))];

  return (
    <div>
      <PageHeader eyebrow={t("Governance · Data quality workspace")} title={t("Data quality analysis")}
        description={t("How complete, unique, consistent and well-linked the record set is — and therefore how far each analytical result can be trusted.")}
        actions={<button className="btn" onClick={() => downloadFile(`telecontact-data-quality-${c.ref}.csv`, toCSV(q.issues.map((i) => ({ kind: i.kind, severity: i.severity, record_type: i.recordType, record_id: i.recordId, detail: i.detail }))), "text/csv")}><Download size={14} /> {t("Export issue log")}</button>} />
      <div className="px-5 pt-5 md:px-8">
        <FigureStrip items={[
          { label: t("Quality score"), value: f.fixed(q.score), sub: t("out of 100 · formula below"), tone: "accent" },
          { label: t("Opportunity records"), value: q.totals.opportunities, sub: t("{v0} unique references", { v0: q.totals.uniqueReferences }) },
          { label: t("Duplicate records"), value: q.totals.duplicates, sub: t("detected & excluded from analytics"), tone: q.totals.duplicates ? "warn" : "default" },
          { label: t("Award coverage"), value: f.pct(q.coverage.awardCoverage), sub: t("{a}/{n} eligible tenders", { a: q.coverage.awardCovered, n: q.coverage.awardEligible }) },
          { label: t("Bidder list coverage"), value: f.pct(q.coverage.bidderCoverage), sub: t("{a}/{n} awarded tenders", { a: q.coverage.awardedWithBidders, n: q.coverage.awardedTotal }) },
          { label: t("Issues logged"), value: q.issues.length, sub: t("{v0} high severity", { v0: q.issues.filter((i) => i.severity === "High").length }) },
        ]} />
      </div>
      <Section index="01" title={t("Overall score")} kicker={t("Transparent weighted formula. Each component is a rate between 0 and 1.")}
        meta={<div className="font-mono">{t("score = Σ weight × component × 100")}</div>}>
        <table className="tbl">
          <thead><tr><th>{t("Component")}</th><th className="!text-right">{t("Weight")}</th><th style={{ width: 220 }}>{t("Value")}</th><th className="!text-right">{t("Contribution")}</th><th>{t("How it is measured")}</th></tr></thead>
          <tbody>
            {q.components.map((x) => (
              <tr key={x.key}><td className="font-medium">{t(x.label)}</td><td className="tnum text-right">{f.fixed(x.weight, 2)}</td><td><div className="flex items-center gap-2"><Meter value={x.value * 100} tone={scoreTone(x.value * 100)} /><span className="tnum w-12 text-right text-[12px]">{f.pct(x.value, 1)}</span></div></td><td className="tnum text-right">{(x.weight * x.value * 100).toFixed(1)}</td><td className="text-[12px] text-ink-600">{x.explanation}</td></tr>
            ))}
            <tr><td className="font-semibold">{t("Total")}</td><td className="tnum text-right">{f.fixed(1, 2)}</td><td /><td className="tnum text-right font-semibold">{f.fixed(q.score)}</td><td className="text-[12px] text-ink-500">{t("Outcome coverage is the weakest dimension: awards are published for a minority of closed tenders.")}</td></tr>
          </tbody>
        </table>
      </Section>
      <Section index="02" title={t("Field completeness")} kicker={t("Fields causing the biggest gaps: {v0}.", { v0: q.worstFields.slice(0, 3).map((x) => `${t(x.label)} (${f.pct(x.rate, 1)})`).join(", ") })}>
        <div className="grid gap-x-10 gap-y-2 md:grid-cols-2">
          {q.fields.map((x) => (
            <div key={x.field} className="grid grid-cols-[170px_1fr_90px] items-center gap-3 py-1 text-[12.5px]">
              <span>{t(x.label)}{!x.critical && <span className="text-ink-400"> {t("(info)")}</span>}</span>
              <Meter value={x.rate * 100} tone={scoreTone(x.rate * 100 - 20)} />
              <span className="tnum text-right">{x.present}/{x.total} · {f.pct(x.rate)}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-6 md:grid-cols-3 text-[12.5px]">
          <div><SubHead>{t("Publication date coverage")}</SubHead>{q.coverage.publicationRange ? `${f.date(q.coverage.publicationRange[0])} → ${f.date(q.coverage.publicationRange[1])}` : "—"}</div>
          <div><SubHead>{t("Deadline coverage")}</SubHead>{q.coverage.deadlineRange ? `${f.date(q.coverage.deadlineRange[0])} → ${f.date(q.coverage.deadlineRange[1])}` : "—"}</div>
          <div><SubHead>{t("Awards")}</SubHead>{t("{a}/{n} with identified awardee · {b}/{n} with amount", { a: q.coverage.awardeeIdentified, b: q.coverage.awardAmountKnown, n: q.totals.awards })}</div>
        </div>
      </Section>
      <Section index="03" title={t("Duplicates and entity resolution")}>
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <SubHead right={`${c.duplicates.length}`}>{t("Duplicate opportunity records")}</SubHead>
            {c.duplicates.map((d) => <div key={d.id} className="flex items-center gap-2 border-b border-line-soft py-1.5 text-[12.5px]"><Link className="font-mono text-accent-700 hover:underline" href={`/opportunities/${d.id}`}>{d.id}</Link><span className="text-ink-500">{t("duplicates")}</span><Link className="font-mono text-accent-700 hover:underline" href={`/opportunities/${d.keptId}`}>{d.keptId}</Link><span className="truncate text-ink-500">· {c.opp.get(d.id)?.reference}</span></div>)}
            <p className="mt-2 text-[11.5px] text-ink-500">{t("Rule: same normalised reference + buyer + object. Earliest publication kept.")}</p>
          </div>
          <div>
            <SubHead right={`${q.duplicateEntities.length}`}>{t("Duplicate company entities")}</SubHead>
            {q.duplicateEntities.map((d) => <div key={d.ids.join()} className="border-b border-line-soft py-1.5 text-[12.5px]"><div>{d.ids.map((id, i) => <span key={id}>{i > 0 && " / "}<Link className="text-accent-700 hover:underline" href={`/competitors/${id}`}>{d.names[i]}</Link></span>)}</div><div className="text-[11.5px] text-ink-500">{d.reason} {t("— award counts split across entities")}</div></div>)}
          </div>
        </div>
      </Section>
      <Section index="04" title={t("Inconsistent classifications and unreliable records")}>
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <SubHead right={`${q.inconsistent.length}`}>{t("Object text contradicts sector code")}</SubHead>
            {q.inconsistent.map((x) => <div key={x.id} className="border-b border-line-soft py-1.5 text-[12.5px]"><Link className="font-mono text-accent-700 hover:underline" href={`/opportunities/${x.id}`}>{x.id}</Link> {tn("coded {coded}, text suggests {suggested}", { coded: <b>{c.sector.get(x.coded)?.name}</b>, suggested: <b>{c.sector.get(x.textSuggests)?.name}</b> })}<div className="truncate text-[11.5px] text-ink-500">{c.opp.get(x.id)?.title}</div></div>)}
          </div>
          <div>
            <SubHead right={`${q.unreliable.length}`}>{t("Records missing ≥2 critical fields")}</SubHead>
            {q.unreliable.map((x) => <div key={x.id} className="border-b border-line-soft py-1.5 text-[12.5px]"><Link className="font-mono text-accent-700 hover:underline" href={`/opportunities/${x.id}`}>{x.id}</Link> <span className="text-ink-600">— {x.missing.map((m) => t(m)).join(", ")}</span></div>)}
            {q.unreliable.length === 0 && <div className="text-[12.5px] text-ink-500">{t("None.")}</div>}
          </div>
        </div>
      </Section>
      <Section index="05" title={t("Issue log")} kicker={t("Every detected issue, with the record it concerns.")} actions={<div className="flex flex-wrap gap-1"><Chip active={!kind} onClick={() => setKind("")}>{t("All · {n}", { n: q.issues.length })}</Chip>{kinds.map((k) => <Chip key={k} active={kind === k} onClick={() => setKind(k)}>{tv(k)} · {q.issues.filter((i) => i.kind === k).length}</Chip>)}</div>}>
        <DataTable rows={issues} rowKey={(i) => `${tv(i.kind)}-${i.recordId}-${i.detail}`} dense pageSize={15} initialSort={{ key: "sev", dir: "asc" }}
          columns={[
            { key: "sev", header: t("Severity"), sort: (i) => ["High", "Medium", "Low"].indexOf(i.severity), render: (i) => <Badge tone={i.severity === "High" ? "red" : i.severity === "Medium" ? "amber" : "neutral"}>{tv(i.severity)}</Badge> },
            { key: "k", header: t("Issue"), sort: (i) => i.kind, render: (i) => <span className="text-[12.5px]">{tv(i.kind)}</span> },
            { key: "r", header: t("Record"), render: (i) => recordHref(i.recordId) ? <EvidenceLinks ids={[i.recordId]} label={i.recordType} /> : <span className="font-mono text-[11px]">{i.recordType} {i.recordId}</span> },
            { key: "d", header: t("Detail"), render: (i) => <span className="text-[12.5px] text-ink-700">{i.detail}</span> },
          ]} />
      </Section>
    </div>
  );
}
