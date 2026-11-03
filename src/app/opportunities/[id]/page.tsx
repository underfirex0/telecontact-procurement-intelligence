"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowUpRight, ClipboardCheck, FileText, FileStack, AlertTriangle, CircleHelp, Check } from "lucide-react";
import { getContext } from "@/lib/services/data-service";
import { useSuppliers, useWorkspace } from "@/lib/services/workspace";
import { buildDossier, type StatementKind } from "@/lib/analytics/dossier";
import * as f from "@/lib/format";
import type { SavedOpportunity } from "@/lib/types";
import { SaveButton } from "@/components/common";
import { BarList, MiniBars } from "@/components/charts";
import { DataTable } from "@/components/data-table";
import {
  Badge, DefList, Empty, EvidenceLinks, Finding, KIND_META, KindTag, LevelBadge, Meter, Note, RiskBadge, StageBadge, StatusBadge, SubHead, SyntheticTag, clsx, scoreTone,
} from "@/components/ui";

const TOC = [
  ["verdict", "Strategic verdict"], ["details", "01 Opportunity details"], ["buyer", "02 Buyer history"], ["similar", "03 Similar opportunities"],
  ["recurrence", "04 Recurring demand"], ["participants", "05 Competitive field"], ["awardees", "06 Verified awardees"], ["competition", "07 Competition & concentration"],
  ["suppliers", "08 Relevant suppliers"], ["coverage", "09 Supplier coverage"], ["market", "10 Market trends"], ["execution", "11 Execution requirements"],
  ["risks", "12 Commercial risks"], ["missing", "13 Missing information"], ["readiness", "14 Bid readiness"], ["actions", "15 Next actions"], ["ledger", "Evidence ledger"],
] as const;

function DSection({ id, title, kicker, children }: { id: string; title: string; kicker?: React.ReactNode; children: React.ReactNode }) {
  const [num, ...rest] = title.split(" ");
  return (
    <section id={id} className="scroll-mt-28 border-b border-line py-7">
      <div className="mb-4 flex items-baseline gap-2.5">
        <span className="font-mono text-[11px] text-accent">{num}</span>
        <h2 className="text-[16px] font-semibold tracking-[-0.005em] text-ink-900">{rest.join(" ")}</h2>
      </div>
      {kicker && <p className="-mt-2 mb-4 max-w-3xl text-[13px] leading-relaxed text-ink-600">{kicker}</p>}
      {children}
    </section>
  );
}

export default function DossierPage() {
  const { id } = useParams<{ id: string }>();
  const c = getContext();
  const suppliers = useSuppliers();
  const { state, dispatch, hydrated, toast } = useWorkspace();
  const d = useMemo(() => buildDossier(c, id, suppliers), [c, id, suppliers]);
  const [kindFilter, setKindFilter] = useState<StatementKind | "all">("all");
  if (!d) return <div className="p-8"><Empty title="Opportunity not found">No record with id {id} exists in the synthetic dataset.</Empty></div>;
  const o = d.opp;
  const buyer = o.buyerId ? c.buyer.get(o.buyerId) : null;
  const saved = hydrated ? state.saved[o.id] : undefined;
  const assessment = hydrated ? state.assessments[o.id] : undefined;
  const posTone = d.readiness.posture === "Pursue" ? "text-signal-good" : d.readiness.posture === "Pursue with partner" ? "text-accent-700" : d.readiness.posture === "Qualify further" ? "text-signal-warn" : "text-ink-600";
  const stmts = d.statements.filter((s) => kindFilter === "all" || s.kind === kindFilter);

  return (
    <div>
      {/* ---------- Dossier header ---------- */}
      <header className="border-b border-line px-5 pb-0 pt-6 md:px-8">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="eyebrow">Opportunity intelligence dossier</span>
          <span className="font-mono text-accent-700">{o.reference}</span>
          <StatusBadge status={o.status} />
          <SyntheticTag />
          {d.isDuplicateOf && <Badge tone="red">Duplicate of {d.isDuplicateOf}</Badge>}
        </div>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-4xl">
            <h1 className="font-serif text-[27px] font-semibold leading-[1.18] tracking-[-0.01em] text-ink-900">{o.title}</h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-600">
              {buyer ? <Link href={`/buyers/${buyer.id}`} className="font-medium text-ink-800 hover:text-accent-700">{buyer.name}</Link> : <span className="text-signal-bad">Buyer not identified</span>}
              <span>{o.city ?? "City n/a"}{o.regionId ? `, ${c.region.get(o.regionId)?.name}` : ""}</span>
              <span>{o.sectorId ? c.sector.get(o.sectorId)?.name : "Unclassified sector"}</span>
              <span>{o.procedure}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SaveButton id={o.id} />
            {saved && (
              <select className="field !h-8 !w-40" value={saved.tracking} onChange={(e) => { dispatch({ type: "setTracking", opportunityId: o.id, tracking: e.target.value as SavedOpportunity["tracking"] }); toast(`Tracking status: ${e.target.value}`); }} aria-label="Tracking status">
                {["Watching", "Qualifying", "Preparing bid", "Submitted", "Dropped"].map((t) => <option key={t}>{t}</option>)}
              </select>
            )}
            <Link href={`/reports?type=opportunity&subject=${o.id}`} className="btn"><FileText size={14} /> Report</Link>
            <Link href={`/bids/${o.id}`} className="btn-primary"><ClipboardCheck size={14} /> {assessment ? "Open assessment" : "Start bid assessment"}</Link>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 border-t border-line sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Estimated value", o.estimatedValue ? f.mad(o.estimatedValue) : "Not disclosed", d.valuePercentile !== null ? `${Math.round(d.valuePercentile)}th pct. in sector` : "no benchmark"],
            ["Submission deadline", f.date(o.deadline), d.timing.daysToDeadline === null ? "unknown" : d.timing.daysToDeadline >= 0 ? `${d.timing.daysToDeadline} days remaining` : `closed ${-d.timing.daysToDeadline} days ago`],
            ["Published", f.date(o.publicationDate), d.timing.daysSincePublication !== null ? `${d.timing.daysSincePublication} days ago` : ""],
            ["Lots", String(o.lots.length), o.lots.length > 1 ? "separately awardable" : "single lot"],
            ["Contract duration", o.contractDurationMonths ? `${o.contractDurationMonths} months` : "n/a", d.series && d.series.occurrences.length > 1 ? `recurring line · ${d.series.occurrences.length} publications` : "no recurrence found"],
            ["Provisional guarantee", o.provisionalGuarantee ? f.mad(o.provisionalGuarantee) : "None", o.procedure === "Bon de commande" ? "purchase order" : ""],
          ].map(([k, v, s], i) => (
            <div key={k} className={clsx("py-3 pr-3", i > 0 && "sm:border-l sm:pl-4", "border-line")}>
              <div className="text-[11px] text-ink-500">{k}</div>
              <div className="tnum mt-0.5 text-[15px] font-semibold text-ink-900">{v}</div>
              <div className="text-[11px] text-ink-500">{s}</div>
            </div>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[210px_minmax(0,1fr)]">
        {/* ---------- table of contents ---------- */}
        <aside className="no-print hidden border-r border-line lg:block">
          <nav className="sticky top-[84px] max-h-[calc(100vh-100px)] overflow-y-auto px-4 py-6 text-[12.5px]">
            <div className="eyebrow mb-2">Dossier contents</div>
            {TOC.map(([href, label]) => (
              <a key={href} href={`#${href}`} className="block rounded-[4px] px-2 py-1 text-ink-600 hover:bg-canvas hover:text-ink-900">{label}</a>
            ))}
            <div className="mt-4 border-t border-line pt-3">
              <div className="eyebrow mb-2">Statement types</div>
              {(Object.keys(KIND_META) as StatementKind[]).map((k) => (
                <div key={k} className="flex items-center justify-between py-0.5 text-[11.5px] text-ink-600"><span className="flex items-center gap-1.5"><span className={clsx("h-3 border-l-2", KIND_META[k].rule)} />{KIND_META[k].label}</span><span className="tnum">{d.statements.filter((s) => s.kind === k).length}</span></div>
              ))}
            </div>
          </nav>
        </aside>

        <div className="min-w-0 px-5 md:px-8">
          {/* ---------- verdict ---------- */}
          <section id="verdict" className="scroll-mt-28 border-b border-line py-7">
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
              <div>
                <div className="eyebrow mb-2">Strategic verdict · what should our commercial strategy be?</div>
                <div className="flex items-end gap-5">
                  <div>
                    <div className={clsx("font-serif text-[30px] font-semibold leading-none", posTone)}>{d.readiness.posture}</div>
                    <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-700">{d.readiness.verdict}</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  <div>
                    <SubHead>Key risks</SubHead>
                    {d.risks.length === 0 && <div className="text-[13px] text-ink-500">No rule-based risk triggered.</div>}
                    {d.risks.slice(0, 4).map((r) => <div key={r.title} className="flex items-start gap-2 py-1 text-[13px]"><RiskBadge level={r.level} /><span className="text-ink-800">{r.title}</span></div>)}
                  </div>
                  <div>
                    <SubHead>Immediate actions</SubHead>
                    {d.actions.filter((a) => a.priority !== "Later").slice(0, 4).map((a, i) => (
                      <div key={i} className="flex items-start gap-2 py-1 text-[13px] text-ink-800"><Check size={14} className="mt-[3px] shrink-0 text-signal-good" />{a.href ? <Link href={a.href} className="hover:text-accent-700">{a.text}</Link> : a.text}</div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="border-line xl:border-l xl:pl-8">
                <div className="flex items-baseline justify-between">
                  <div className="eyebrow">Bid readiness score</div>
                  <div className="tnum"><span className="text-[34px] font-semibold leading-none tracking-[-0.02em]">{d.readiness.score}</span><span className="text-ink-500">/100</span></div>
                </div>
                <div className="mt-3 space-y-2.5">
                  {d.readiness.components.map((x) => (
                    <div key={x.key}>
                      <div className="flex justify-between text-[12.5px]"><span className="text-ink-800">{x.label} <span className="text-ink-400">· {Math.round(x.weight * 100)}%</span></span><span className="tnum font-medium">{x.score}</span></div>
                      <Meter className="mt-1" value={x.score} tone={scoreTone(x.score)} />
                      <div className="mt-0.5 text-[11px] text-ink-500">{x.basis}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-[11px] text-ink-500">Score = Σ weight × component. Rule definitions: docs/DATA_ANALYSIS_METHODOLOGY.md.</div>
              </div>
            </div>
          </section>

          {/* ---------- 01 ---------- */}
          <DSection id="details" title="01 Opportunity details">
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <div>
                <p className="text-[13.5px] leading-relaxed text-ink-800">{o.description}</p>
                <div className="mt-4"><DefList cols={2} items={[
                  { k: "Reference", v: <span className="font-mono text-[12.5px]">{o.reference}</span> },
                  { k: "Procedure", v: o.procedure },
                  { k: "Region / city", v: o.regionId ? `${c.region.get(o.regionId)?.name} · ${o.city}` : <span className="text-signal-bad">Not specified</span> },
                  { k: "Sector (code)", v: o.sectorId ? `${c.sector.get(o.sectorId)?.name} (${c.sector.get(o.sectorId)?.code})` : <span className="text-signal-bad">Unclassified</span> },
                  { k: "Source", v: o.provenance.source },
                  { k: "Record created", v: `${f.date(o.provenance.createdAt)} · ${o.provenance.generator}` },
                ]} /></div>
              </div>
              <div>
                <SubHead right={`${o.lots.length} lot(s)`}>Lots</SubHead>
                <table className="tbl dense"><tbody>
                  {o.lots.map((l) => (
                    <tr key={l.id}><td className="text-[12.5px]">{l.title}</td><td className="tnum text-right text-[12.5px]">{f.mad(l.estimatedValue)}</td>
                      <td className="text-right text-[11.5px]">{(c.awardsByOpp.get(o.id) ?? []).filter((a) => a.lotId === l.id || (!a.lotId && o.lots.length === 1)).map((a) => <Link key={a.id} href={`/competitors/${a.companyId}`} className="text-signal-good hover:underline">→ {c.company.get(a.companyId)?.name}</Link>)}</td></tr>
                  ))}
                </tbody></table>
                <SubHead right="placeholders · files not included in prototype"><span className="mt-4 inline-block">Tender documents</span></SubHead>
                <ul className="space-y-1">
                  {o.documents.map((doc) => (
                    <li key={doc.id} className="flex items-center gap-2 text-[12.5px] text-ink-700"><FileStack size={13} className="text-ink-400" /><span className="font-mono text-[10.5px] text-ink-500">{doc.kind}</span>{doc.name}<span className="ml-auto text-[11px] text-ink-400">{doc.pages} p.</span></li>
                  ))}
                </ul>
              </div>
            </div>
          </DSection>

          {/* ---------- 02 ---------- */}
          <DSection id="buyer" title="02 Buyer history" kicker={d.buyer ? `What ${d.buyer.summary.acronym} buys, how often, and who it awards to.` : undefined}>
            {d.buyer ? (
              <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                <div>
                  <DefList cols={2} items={[
                    { k: "Recorded opportunities", v: <span className="tnum font-semibold">{d.buyer.summary.opportunities}</span> },
                    { k: "Publication rate", v: `${f.num(d.buyer.publicationFrequency.perYear, 1)} / year` },
                    { k: "Median value", v: f.mad(d.buyer.values.median) },
                    { k: "Awards / distinct awardees", v: `${d.buyer.awardsTotal} / ${d.buyer.awardees.length}` },
                  ]} />
                  <div className="mt-4 flex items-end gap-6">
                    <div><div className="mb-1 text-[11px] text-ink-500">Publications per year</div><MiniBars values={d.buyer.perYear.map((p) => p.count)} labels={d.buyer.perYear.map((p) => String(p.year))} /><div className="mt-1 flex gap-[3px] text-[9px] text-ink-400">{d.buyer.perYear.map((p) => <span key={p.year} className="w-3 text-center">{String(p.year).slice(2)}</span>)}</div></div>
                    <Link href={`/buyers/${d.buyer.summary.id}`} className="btn btn-sm">Full buyer profile <ArrowUpRight size={12} /></Link>
                  </div>
                  <div className="mt-4 space-y-2">{d.buyer.observations.slice(0, 3).map((ob, i) => <Finding key={i} kind="interpretation" evidence={ob.evidence}>{ob.text}</Finding>)}</div>
                </div>
                <div>
                  <SubHead right={`${d.buyerSameSector.length} records`}>Same buyer, same sector</SubHead>
                  <DataTable rows={d.buyerSameSector} rowKey={(x) => x.id} rowHref={(x) => `/opportunities/${x.id}`} pageSize={6} dense initialSort={{ key: "pub", dir: "desc" }}
                    empty="No other opportunity from this buyer in this sector."
                    columns={[
                      { key: "pub", header: "Published", sort: (x) => x.publicationDate, render: (x) => <span className="tnum whitespace-nowrap text-[12px]">{f.shortDate(x.publicationDate)}</span> },
                      { key: "t", header: "Object", render: (x) => <span className="line-clamp-1 text-[12.5px]">{x.title}</span> },
                      { key: "v", header: "Value", align: "right", sort: (x) => x.estimatedValue, render: (x) => f.mad(x.estimatedValue, { unit: false }) },
                      { key: "a", header: "Outcome", render: (x) => { const aw = c.awardsByOpp.get(x.id); return aw ? <span className="text-[12px] text-signal-good">{aw.map((a) => c.company.get(a.companyId)?.name).join(", ")}</span> : <StatusBadge status={x.status} />; } },
                    ]} />
                </div>
              </div>
            ) : <Note tone="warn">The buyer is not identified on this record. Buyer history, incumbents and recurrence cannot be assembled.</Note>}
          </DSection>

          {/* ---------- 03 ---------- */}
          <DSection id="similar" title="03 Similar opportunities" kicker="Ranked by a transparent similarity score: sector 0.45 · same buyer 0.20 · value proximity 0.15 · region 0.10 · object text 0.10. Threshold 0.45.">
            <DataTable rows={d.similar} rowKey={(s) => s.opp.id} rowHref={(s) => `/opportunities/${s.opp.id}`} pageSize={8} dense
              empty="No sufficiently similar opportunity in the dataset."
              columns={[
                { key: "score", header: "Score", sort: (s) => s.score, render: (s) => <span className="tnum font-mono text-[12px] font-semibold">{s.score.toFixed(2)}</span> },
                { key: "o", header: "Opportunity", render: (s) => <div><div className="font-mono text-[11px] text-accent-700">{s.opp.reference}</div><div className="line-clamp-1 text-[12.5px]">{s.opp.title}</div></div> },
                { key: "why", header: "Why similar", hideBelow: "lg", render: (s) => <span className="text-[11.5px] text-ink-500">{s.reasons.join(" · ")}</span> },
                { key: "pub", header: "Published", sort: (s) => s.opp.publicationDate, render: (s) => <span className="tnum text-[12px]">{f.shortDate(s.opp.publicationDate)}</span> },
                { key: "v", header: "Value", align: "right", sort: (s) => s.opp.estimatedValue, render: (s) => f.mad(s.opp.estimatedValue, { unit: false }) },
                { key: "aw", header: "Awarded to", render: (s) => s.awardees.length ? <span className="text-[12px] text-signal-good">{s.awardees.join(", ")}</span> : <StatusBadge status={s.opp.status} /> },
              ]} />
          </DSection>

          {/* ---------- 04 ---------- */}
          <DSection id="recurrence" title="04 Recurring demand">
            {d.series && d.series.occurrences.length >= 2 ? (
              <div>
                <div className="mb-4 flex flex-wrap gap-x-8 gap-y-2 text-[13px]">
                  <span>Publications in line: <b className="tnum">{d.series.occurrences.length}</b></span>
                  <span>Median interval: <b className="tnum">{d.series.medianIntervalDays} days</b></span>
                  <span>Regularity: <b>{d.series.regularity}</b>{d.series.cv !== null && <span className="text-ink-500"> (CV {d.series.cv.toFixed(2)})</span>}</span>
                  {d.positionInSeries && <span>This record: <b>#{d.positionInSeries}</b> in the line</span>}
                </div>
                <SeriesTimeline occurrences={d.series.occurrences.map((x) => ({ id: x.id, date: x.publicationDate!, current: x.id === o.id || x.id === d.isDuplicateOf, awardee: (c.awardsByOpp.get(x.id) ?? [])[0]?.companyId }))} signal={d.signal && d.signal.state !== "Overdue" ? { start: d.signal.windowStart, end: d.signal.windowEnd } : null} />
                {d.signal && (
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-[13px]">
                    <span className="text-ink-600">Next expected cycle:</span>
                    <b className="tnum">{f.date(d.signal.windowStart)} → {f.date(d.signal.windowEnd)}</b>
                    <LevelBadge level={d.signal.level} />
                    <Link href={`/signals?focus=${d.signal.id}`} className="link text-[12.5px]">Signal evidence</Link>
                  </div>
                )}
              </div>
            ) : <Finding kind="interpretation">No recurring purchasing line was detected for this buyer and sector (fewer than two dated publications).</Finding>}
          </DSection>

          {/* ---------- 05 ---------- */}
          <DSection id="participants" title="05 Competitive field" kicker={`Companies recorded as bidders on similar tenders and on this buyer's tenders in the same sector. Bidder lists are disclosed for ${d.participantsSample} of these tenders; a participant is not a winner.`}>
            <DataTable rows={d.participants} rowKey={(p) => p.id} rowHref={(p) => `/competitors/${p.id}`} pageSize={8} dense initialSort={{ key: "bids", dir: "desc" }}
              empty="No bidder lists disclosed for similar tenders."
              columns={[
                { key: "n", header: "Company", sort: (p) => p.name, render: (p) => <span className="font-medium">{p.name}</span> },
                { key: "bids", header: "Recorded bids", align: "right", sort: (p) => p.bids, render: (p) => p.bids },
                { key: "wins", header: "Of which awarded", align: "right", sort: (p) => p.wins, render: (p) => p.wins },
                { key: "o", header: "Outcomes", render: (p) => <div className="flex flex-wrap gap-1">{Object.entries(p.outcomes).map(([k, v]) => <Badge key={k} tone={k === "Awarded" ? "green" : k === "Shortlisted" ? "violet" : k === "Pending" ? "blue" : "neutral"}>{k} {v}</Badge>)}</div> },
              ]} />
          </DSection>

          {/* ---------- 06 ---------- */}
          <DSection id="awardees" title="06 Verified awardees of similar contracts">
            <DataTable rows={d.awardees} rowKey={(a) => a.id} rowHref={(a) => `/competitors/${a.id}`} pageSize={8} dense initialSort={{ key: "aw", dir: "desc" }}
              empty="No recorded awards on similar tenders."
              columns={[
                { key: "n", header: "Awardee", sort: (a) => a.name, render: (a) => <span className="font-medium">{a.name}</span> },
                { key: "aw", header: "Awards", align: "right", sort: (a) => a.awards, render: (a) => a.awards },
                { key: "b", header: "At this buyer", align: "right", sort: (a) => a.atBuyer, render: (a) => a.atBuyer ? <b>{a.atBuyer}</b> : 0 },
                { key: "v", header: "Award value", align: "right", sort: (a) => a.value, render: (a) => f.mad(a.value) },
              ]} />
          </DSection>

          {/* ---------- 07 ---------- */}
          <DSection id="competition" title="07 Competition & market concentration">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="border-l-2 border-ink-900 pl-3">
                <div className="text-[11px] text-ink-500">Incumbent in this purchasing line</div>
                {d.incumbent ? <><Link href={`/competitors/${d.incumbent.id}`} className="mt-1 block text-[15px] font-semibold hover:text-accent-700">{d.incumbent.name}</Link><div className="text-[12px] text-ink-500">{d.incumbent.winsInLine} win(s) in line · last award {f.date(d.incumbent.lastAwardDate)}</div></> : <div className="mt-1 text-[13px] text-ink-500">None recorded</div>}
              </div>
              <div className="border-l-2 border-accent pl-3">
                <div className="text-[11px] text-ink-500">Sector award concentration (HHI, by value)</div>
                {d.sectorConcentration ? <><div className="tnum mt-1 text-[15px] font-semibold">{Math.round(d.sectorConcentration.hhiValue ?? 0)} · {d.sectorConcentration.band}</div><div className="text-[12px] text-ink-500">Top-5 share {f.pct(d.sectorConcentration.top5Share)} · {d.sectorConcentration.awards} awards{d.sectorConcentration.smallSample ? " · small sample" : ""}</div></> : <div className="mt-1 text-[13px] text-ink-500">No sector awards</div>}
              </div>
              <div className="border-l-2 border-accent pl-3">
                <div className="text-[11px] text-ink-500">Average bidders per sector tender</div>
                <div className="tnum mt-1 text-[15px] font-semibold">{d.meanBidders !== null ? d.meanBidders.toFixed(1) : "n/a"}</div>
                <div className="text-[12px] text-ink-500">from disclosed bid-opening minutes</div>
              </div>
            </div>
            <div className="mt-4 space-y-2">{d.statements.filter((s) => s.section === "Competition" && s.kind === "interpretation").map((s, i) => <Finding key={i} kind={s.kind} evidence={s.evidence}>{s.text}</Finding>)}</div>
          </DSection>

          {/* ---------- 08 ---------- */}
          <DSection id="suppliers" title="08 Relevant suppliers & partners" kicker="Network suppliers matched on sector, relationship stage, Moroccan coverage, location and internal capacity score.">
            <DataTable rows={d.suppliers} rowKey={(m) => m.supplier.id} rowHref={(m) => `/suppliers/${m.supplier.id}`} pageSize={8} dense
              empty={<span>No supplier in the network covers this sector. <Link className="link" href="/acquisition">Start provider acquisition</Link>.</span>}
              columns={[
                { key: "s", header: "Fit", sort: (m) => m.score, render: (m) => <span className="tnum font-mono text-[12px] font-semibold">{m.score}</span> },
                { key: "n", header: "Supplier", render: (m) => <div><div className="font-medium">{m.supplier.name}</div><div className="text-[11.5px] text-ink-500">{m.supplier.city}, {m.supplier.country}</div></div> },
                { key: "st", header: "Relationship", render: (m) => <StageBadge stage={m.supplier.status} /> },
                { key: "r", header: "Match basis", hideBelow: "lg", render: (m) => <span className="text-[11.5px] text-ink-500">{m.reasons.join(" · ")}</span> },
              ]} />
          </DSection>

          {/* ---------- 09 ---------- */}
          <DSection id="coverage" title="09 Geographic supplier coverage">
            {d.supplierCoverage.length ? (
              <div className="grid gap-6 md:grid-cols-2">
                <BarList rows={d.supplierCoverage.map((x) => ({ key: x.country, label: x.country, value: x.count, display: `${x.count} supplier(s)` }))} />
                <div className="space-y-2">
                  <Finding kind="metric">{d.suppliers.filter((m) => m.supplier.coverage.includes("Morocco")).length} of {d.suppliers.length} matched suppliers declare coverage of Morocco; {d.suppliers.filter((m) => m.supplier.country === "Morocco").length} are Moroccan-based.</Finding>
                  {o.regionId && <Finding kind="metric">{d.suppliers.filter((m) => m.reasons.some((r) => r.startsWith("based in"))).length} matched supplier(s) are based in the execution region ({c.region.get(o.regionId)?.name}).</Finding>}
                </div>
              </div>
            ) : <Finding kind="unknown">No matching supplier — geographic coverage cannot be established.</Finding>}
          </DSection>

          {/* ---------- 10 ---------- */}
          <DSection id="market" title="10 Market trends">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">{d.statements.filter((s) => s.section === "Market").map((s, i) => <Finding key={i} kind={s.kind} evidence={s.evidence}>{s.text}</Finding>)}</div>
              {o.estimatedValue && d.sectorMedianValue && <ValuePosition c={c} sectorId={o.sectorId} value={o.estimatedValue} />}
            </div>
          </DSection>

          {/* ---------- 11 ---------- */}
          <DSection id="execution" title="11 Potential execution requirements" kicker="Requirements stated on the synthetic notice. Evaluation criteria weighting is not captured in the dataset.">
            <ul className="grid gap-2 md:grid-cols-2">
              {o.requirements.map((r) => <li key={r} className="flex items-start gap-2 border-b border-line-soft pb-2 text-[13px] text-ink-800"><span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-500" />{r}</li>)}
              {o.provisionalGuarantee && <li className="flex items-start gap-2 border-b border-line-soft pb-2 text-[13px] text-ink-800"><span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-500" />Provisional guarantee of {f.madFull(o.provisionalGuarantee)}</li>}
              {o.contractDurationMonths && <li className="flex items-start gap-2 border-b border-line-soft pb-2 text-[13px] text-ink-800"><span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-500" />Delivery capacity for a {o.contractDurationMonths}-month contract{o.city ? ` in ${o.city}` : ""}</li>}
            </ul>
          </DSection>

          {/* ---------- 12 ---------- */}
          <DSection id="risks" title="12 Commercial risks">
            {d.risks.length ? (
              <div className="divide-y divide-line-soft">
                {d.risks.map((r) => (
                  <div key={r.title} className="grid gap-2 py-2.5 md:grid-cols-[90px_200px_1fr]">
                    <div><RiskBadge level={r.level} /></div>
                    <div className="flex items-center gap-1.5 text-[13px] font-medium"><AlertTriangle size={13} className="text-ink-400" />{r.title}</div>
                    <div><div className="text-[13px] text-ink-700">{r.detail}</div>{r.evidence.length > 0 && <EvidenceLinks ids={r.evidence} max={5} />}</div>
                  </div>
                ))}
              </div>
            ) : <div className="text-[13px] text-ink-500">No rule-based risk triggered.</div>}
          </DSection>

          {/* ---------- 13 ---------- */}
          <DSection id="missing" title="13 Missing information">
            <div className="divide-y divide-line-soft">
              {d.missing.map((m) => (
                <div key={m.field} className="grid gap-1 py-2 md:grid-cols-[260px_1fr]">
                  <div className="flex items-center gap-1.5 text-[13px] font-medium"><CircleHelp size={13} className="text-signal-bad" />{m.field}</div>
                  <div className="text-[13px] text-ink-600">{m.impact}</div>
                </div>
              ))}
            </div>
          </DSection>

          {/* ---------- 14 ---------- */}
          <DSection id="readiness" title="14 Bid readiness assessment">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">{d.statements.filter((s) => s.section === "Bid readiness").map((s, i) => <Finding key={i} kind={s.kind}>{s.text}</Finding>)}</div>
              <div className="text-[13px]">
                {assessment ? (
                  <div className="space-y-2">
                    <div>Team assessment: <Badge tone={assessment.decision === "Bid" ? "green" : assessment.decision === "No-bid" ? "red" : "amber"}>{assessment.decision}</Badge> · stage {assessment.stage} · owner {assessment.responsible || "—"}</div>
                    <div className="text-ink-500">Checklist {assessment.checklist.filter((x) => x.done).length}/{assessment.checklist.length} complete · updated {f.date(assessment.updatedAt.slice(0, 10))}</div>
                    <Link href={`/bids/${o.id}`} className="btn btn-sm">Open assessment</Link>
                  </div>
                ) : (
                  <div>
                    <p className="text-ink-600">No team assessment yet. The bid workspace records the team&apos;s own scores, required documents, risks, checklist, owner and follow-up date next to the computed readiness.</p>
                    <Link href={`/bids/${o.id}`} className="btn-primary mt-3"><ClipboardCheck size={14} /> Start bid assessment</Link>
                  </div>
                )}
              </div>
            </div>
          </DSection>

          {/* ---------- 15 ---------- */}
          <DSection id="actions" title="15 Recommended next actions">
            <div className="divide-y divide-line-soft">
              {d.actions.map((a, i) => (
                <div key={i} className="flex items-start gap-3 py-2">
                  <Badge tone={a.priority === "Now" ? "ink" : a.priority === "Next" ? "blue" : "neutral"} className="w-12 justify-center">{a.priority}</Badge>
                  <div className="text-[13.5px] text-ink-800">{a.href ? <Link href={a.href} className="hover:text-accent-700">{a.text} <ArrowUpRight size={12} className="inline" /></Link> : a.text}</div>
                </div>
              ))}
            </div>
          </DSection>

          {/* ---------- Ledger ---------- */}
          <section id="ledger" className="scroll-mt-28 py-7">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[16px] font-semibold">Evidence ledger</h2>
              <div className="flex flex-wrap gap-1.5">
                {(["all", ...Object.keys(KIND_META)] as (StatementKind | "all")[]).map((k) => (
                  <button key={k} onClick={() => setKindFilter(k)} className={clsx("rounded-[4px] border px-2 py-0.5 text-[11.5px]", kindFilter === k ? "border-ink-900 bg-ink-900 text-white" : "border-line-strong text-ink-600 hover:text-ink-900")}>
                    {k === "all" ? "All" : KIND_META[k].label} <span className="tnum opacity-70">{k === "all" ? d.statements.length : d.statements.filter((s) => s.kind === k).length}</span>
                  </button>
                ))}
              </div>
            </div>
            <p className="mb-4 text-[12.5px] text-ink-500">Every statement in this dossier, classified by provenance: facts from records, calculated metrics, rule-based interpretation, recommendations, assumptions and unknowns.</p>
            <table className="tbl dense">
              <thead><tr><th style={{ width: 130 }}>Type</th><th style={{ width: 150 }}>Section</th><th>Statement</th></tr></thead>
              <tbody>{stmts.map((s, i) => (
                <tr key={i}><td><KindTag kind={s.kind} /></td><td className="text-[12px] text-ink-500">{s.section}</td><td><div className="text-[13px]">{s.text}</div>{s.evidence && s.evidence.length > 0 && <EvidenceLinks ids={s.evidence} max={4} />}</td></tr>
              ))}</tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  );
}

function SeriesTimeline({ occurrences, signal }: { occurrences: { id: string; date: string; current: boolean; awardee?: string }[]; signal: { start: string; end: string } | null }) {
  const c = getContext();
  const start = "2023-01-01";
  const end = signal && signal.end > "2027-06-30" ? signal.end : "2027-06-30";
  const t = (d: string) => Math.round(((new Date(d).getTime() - new Date(start).getTime()) / (new Date(end).getTime() - new Date(start).getTime())) * 10000) / 100;
  const years = ["2023", "2024", "2025", "2026", "2027"];
  return (
    <div className="relative h-[92px] select-none">
      <div className="absolute left-0 right-0 top-[44px] h-px bg-line-strong" />
      {years.map((y) => <div key={y} className="absolute top-[52px] text-[10.5px] text-ink-400" style={{ left: `${t(`${y}-01-01`)}%` }}><div className="mb-1 h-2 w-px bg-line-strong" />{y}</div>)}
      <div className="absolute top-[30px] h-[28px] border-l border-dashed border-signal-bad" style={{ left: `${t(c.ref)}%` }}><span className="absolute -top-4 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-signal-bad">today</span></div>
      {signal && <div className="absolute top-[36px] h-4 rounded-[3px] border border-dashed border-accent bg-accent-50" style={{ left: `${t(signal.start)}%`, width: `${Math.max(0.8, t(signal.end) - t(signal.start))}%` }} title={`Expected window ${signal.start} → ${signal.end}`} />}
      {occurrences.map((x) => (
        <Link key={x.id} href={`/opportunities/${x.id}`} className="group absolute top-[38px] -translate-x-1/2" style={{ left: `${t(x.date)}%` }} title={`${x.id} · ${x.date}${x.awardee ? ` · awarded to ${c.company.get(x.awardee)?.name}` : ""}`}>
          <span className={clsx("block h-3 w-3 rounded-full border-2 border-white", x.current ? "bg-[#d0782a] ring-2 ring-[#d0782a]/30" : x.awardee ? "bg-signal-good" : "bg-ink-700")} />
          <span className="absolute -top-5 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink-900 px-1.5 text-[10px] text-white group-hover:block">{f.shortDate(x.date)}</span>
        </Link>
      ))}
      <div className="absolute bottom-0 right-0 flex gap-3 text-[10.5px] text-ink-500">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#d0782a]" />this record</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-signal-good" />awarded</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-ink-700" />no award recorded</span>
        <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-[2px] border border-dashed border-accent bg-accent-50" />expected window</span>
      </div>
    </div>
  );
}

function ValuePosition({ c, sectorId, value }: { c: ReturnType<typeof getContext>; sectorId: string | null; value: number }) {
  const vals = c.clean.filter((x) => x.sectorId === sectorId && x.estimatedValue).map((x) => x.estimatedValue!);
  if (vals.length < 3) return null;
  const lo = Math.log10(Math.min(...vals, value));
  const hi = Math.log10(Math.max(...vals, value));
  const x = (v: number) => Math.round(((Math.log10(v) - lo) / (hi - lo || 1)) * 10000) / 100;
  const sorted = [...vals].sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)];
  return (
    <div>
      <SubHead right={`n = ${vals.length} · log scale`}>Value position within sector</SubHead>
      <div className="relative mt-6 h-12">
        <div className="absolute left-0 right-0 top-4 h-px bg-line-strong" />
        {vals.map((v, i) => <span key={i} className="absolute top-[11px] h-[10px] w-[2px] -translate-x-1/2 bg-ink-300" style={{ left: `${x(v)}%` }} />)}
        <span className="absolute top-[6px] h-[20px] w-[2px] -translate-x-1/2 bg-ink-700" style={{ left: `${x(med)}%` }} title={`median ${f.mad(med)}`} />
        <span className="absolute top-[2px] h-[28px] w-[3px] -translate-x-1/2 rounded bg-[#d0782a]" style={{ left: `${x(value)}%` }} />
        <span className="absolute -top-5 -translate-x-1/2 whitespace-nowrap text-[10.5px] font-medium text-[#A35A17]" style={{ left: `${Math.min(88, Math.max(8, x(value)))}%` }}>this tender · {f.mad(value)}</span>
        <div className="absolute top-8 flex w-full justify-between text-[10.5px] text-ink-400"><span>{f.mad(Math.min(...vals))}</span><span>median {f.mad(med)}</span><span>{f.mad(Math.max(...vals))}</span></div>
      </div>
    </div>
  );
}
