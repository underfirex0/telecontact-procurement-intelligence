"use client";
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
      <PageHeader eyebrow="Governance · Data quality workspace" title="Data quality analysis"
        description="How complete, unique, consistent and well-linked the record set is — and therefore how far each analytical result can be trusted."
        actions={<button className="btn" onClick={() => downloadFile(`telecontact-data-quality-${c.ref}.csv`, toCSV(q.issues.map((i) => ({ kind: i.kind, severity: i.severity, record_type: i.recordType, record_id: i.recordId, detail: i.detail }))), "text/csv")}><Download size={14} /> Export issue log</button>} />
      <div className="px-5 pt-5 md:px-8">
        <FigureStrip items={[
          { label: "Quality score", value: `${q.score}`, sub: "out of 100 · formula below", tone: "accent" },
          { label: "Opportunity records", value: q.totals.opportunities, sub: `${q.totals.uniqueReferences} unique references` },
          { label: "Duplicate records", value: q.totals.duplicates, sub: "detected & excluded from analytics", tone: q.totals.duplicates ? "warn" : "default" },
          { label: "Award coverage", value: f.pct(q.coverage.awardCoverage), sub: `${q.coverage.awardCovered}/${q.coverage.awardEligible} eligible tenders` },
          { label: "Bidder list coverage", value: f.pct(q.coverage.bidderCoverage), sub: `${q.coverage.awardedWithBidders}/${q.coverage.awardedTotal} awarded tenders` },
          { label: "Issues logged", value: q.issues.length, sub: `${q.issues.filter((i) => i.severity === "High").length} high severity` },
        ]} />
      </div>
      <Section index="01" title="Overall score" kicker="Transparent weighted formula. Each component is a rate between 0 and 1."
        meta={<div className="font-mono">score = Σ weight × component × 100</div>}>
        <table className="tbl">
          <thead><tr><th>Component</th><th className="!text-right">Weight</th><th style={{ width: 220 }}>Value</th><th className="!text-right">Contribution</th><th>How it is measured</th></tr></thead>
          <tbody>
            {q.components.map((x) => (
              <tr key={x.key}><td className="font-medium">{x.label}</td><td className="tnum text-right">{x.weight.toFixed(2)}</td><td><div className="flex items-center gap-2"><Meter value={x.value * 100} tone={scoreTone(x.value * 100)} /><span className="tnum w-12 text-right text-[12px]">{f.pct(x.value, 1)}</span></div></td><td className="tnum text-right">{(x.weight * x.value * 100).toFixed(1)}</td><td className="text-[12px] text-ink-600">{x.explanation}</td></tr>
            ))}
            <tr><td className="font-semibold">Total</td><td className="tnum text-right">1.00</td><td /><td className="tnum text-right font-semibold">{q.score}</td><td className="text-[12px] text-ink-500">Outcome coverage is the weakest dimension: awards are published for a minority of closed tenders.</td></tr>
          </tbody>
        </table>
      </Section>
      <Section index="02" title="Field completeness" kicker={`Fields causing the biggest gaps: ${q.worstFields.slice(0, 3).map((x) => `${x.label} (${f.pct(x.rate, 1)})`).join(", ")}.`}>
        <div className="grid gap-x-10 gap-y-2 md:grid-cols-2">
          {q.fields.map((x) => (
            <div key={x.field} className="grid grid-cols-[170px_1fr_90px] items-center gap-3 py-1 text-[12.5px]">
              <span>{x.label}{!x.critical && <span className="text-ink-400"> (info)</span>}</span>
              <Meter value={x.rate * 100} tone={scoreTone(x.rate * 100 - 20)} />
              <span className="tnum text-right">{x.present}/{x.total} · {f.pct(x.rate)}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-6 md:grid-cols-3 text-[12.5px]">
          <div><SubHead>Publication date coverage</SubHead>{q.coverage.publicationRange ? `${f.date(q.coverage.publicationRange[0])} → ${f.date(q.coverage.publicationRange[1])}` : "—"}</div>
          <div><SubHead>Deadline coverage</SubHead>{q.coverage.deadlineRange ? `${f.date(q.coverage.deadlineRange[0])} → ${f.date(q.coverage.deadlineRange[1])}` : "—"}</div>
          <div><SubHead>Awards</SubHead>{q.coverage.awardeeIdentified}/{q.totals.awards} with identified awardee · {q.coverage.awardAmountKnown}/{q.totals.awards} with amount</div>
        </div>
      </Section>
      <Section index="03" title="Duplicates and entity resolution">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <SubHead right={`${c.duplicates.length}`}>Duplicate opportunity records</SubHead>
            {c.duplicates.map((d) => <div key={d.id} className="flex items-center gap-2 border-b border-line-soft py-1.5 text-[12.5px]"><Link className="font-mono text-accent-700 hover:underline" href={`/opportunities/${d.id}`}>{d.id}</Link><span className="text-ink-500">duplicates</span><Link className="font-mono text-accent-700 hover:underline" href={`/opportunities/${d.keptId}`}>{d.keptId}</Link><span className="truncate text-ink-500">· {c.opp.get(d.id)?.reference}</span></div>)}
            <p className="mt-2 text-[11.5px] text-ink-500">Rule: same normalised reference + buyer + object. Earliest publication kept.</p>
          </div>
          <div>
            <SubHead right={`${q.duplicateEntities.length}`}>Duplicate company entities</SubHead>
            {q.duplicateEntities.map((d) => <div key={d.ids.join()} className="border-b border-line-soft py-1.5 text-[12.5px]"><div>{d.ids.map((id, i) => <span key={id}>{i > 0 && " / "}<Link className="text-accent-700 hover:underline" href={`/competitors/${id}`}>{d.names[i]}</Link></span>)}</div><div className="text-[11.5px] text-ink-500">{d.reason} — award counts split across entities</div></div>)}
          </div>
        </div>
      </Section>
      <Section index="04" title="Inconsistent classifications and unreliable records">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <SubHead right={`${q.inconsistent.length}`}>Object text contradicts sector code</SubHead>
            {q.inconsistent.map((x) => <div key={x.id} className="border-b border-line-soft py-1.5 text-[12.5px]"><Link className="font-mono text-accent-700 hover:underline" href={`/opportunities/${x.id}`}>{x.id}</Link> coded <b>{c.sector.get(x.coded)?.name}</b>, text suggests <b>{c.sector.get(x.textSuggests)?.name}</b><div className="truncate text-[11.5px] text-ink-500">{c.opp.get(x.id)?.title}</div></div>)}
          </div>
          <div>
            <SubHead right={`${q.unreliable.length}`}>Records missing ≥2 critical fields</SubHead>
            {q.unreliable.map((x) => <div key={x.id} className="border-b border-line-soft py-1.5 text-[12.5px]"><Link className="font-mono text-accent-700 hover:underline" href={`/opportunities/${x.id}`}>{x.id}</Link> <span className="text-ink-600">— {x.missing.join(", ")}</span></div>)}
            {q.unreliable.length === 0 && <div className="text-[12.5px] text-ink-500">None.</div>}
          </div>
        </div>
      </Section>
      <Section index="05" title="Issue log" kicker="Every detected issue, with the record it concerns." actions={<div className="flex flex-wrap gap-1"><Chip active={!kind} onClick={() => setKind("")}>All · {q.issues.length}</Chip>{kinds.map((k) => <Chip key={k} active={kind === k} onClick={() => setKind(k)}>{k} · {q.issues.filter((i) => i.kind === k).length}</Chip>)}</div>}>
        <DataTable rows={issues} rowKey={(i) => `${i.kind}-${i.recordId}-${i.detail}`} dense pageSize={15} initialSort={{ key: "sev", dir: "asc" }}
          columns={[
            { key: "sev", header: "Severity", sort: (i) => ["High", "Medium", "Low"].indexOf(i.severity), render: (i) => <Badge tone={i.severity === "High" ? "red" : i.severity === "Medium" ? "amber" : "neutral"}>{i.severity}</Badge> },
            { key: "k", header: "Issue", sort: (i) => i.kind, render: (i) => <span className="text-[12.5px]">{i.kind}</span> },
            { key: "r", header: "Record", render: (i) => recordHref(i.recordId) ? <EvidenceLinks ids={[i.recordId]} label={i.recordType} /> : <span className="font-mono text-[11px]">{i.recordType} {i.recordId}</span> },
            { key: "d", header: "Detail", render: (i) => <span className="text-[12.5px] text-ink-700">{i.detail}</span> },
          ]} />
      </Section>
    </div>
  );
}
