"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { FileText, GitCompare } from "lucide-react";
import { getContext } from "@/lib/services/data-service";
import { buyerProfile, futureSignals } from "@/lib/analytics";
import { quartersBetween, quarterKey } from "@/lib/dates";
import * as f from "@/lib/format";
import { OppTable } from "@/components/common";
import { BarList, Heatmap, ShareBar, SERIES, MUTED } from "@/components/charts";
import { DataTable } from "@/components/data-table";
import { ChartNote, DefList, Empty, Finding, LevelBadge, Section, SyntheticTag, Badge } from "@/components/ui";

export default function BuyerPage() {
  const { id } = useParams<{ id: string }>();
  const c = getContext();
  const p = useMemo(() => buyerProfile(c, id), [c, id]);
  const signals = useMemo(() => futureSignals(c).filter((s) => s.buyerId === id), [c, id]);
  if (!p) return <div className="p-8"><Empty title="Buyer not found" /></div>;
  const b = c.buyer.get(id)!;
  const quarters = quartersBetween(c.ds.meta.periodStart, c.ds.meta.periodEnd);
  const sectorsInCal = p.sectorMix.map((s) => s.key);
  const cal: Record<string, Record<string, number>> = {};
  for (const o of p.opportunities) {
    if (!o.publicationDate) continue;
    const s = o.sectorId ?? "unclassified";
    cal[s] = cal[s] ?? {};
    const q = quarterKey(o.publicationDate);
    cal[s][q] = (cal[s][q] ?? 0) + 1;
  }
  const calMax = Math.max(1, ...Object.values(cal).flatMap((r) => Object.values(r)));
  const active = p.opportunities.filter((o) => o.status === "Open" || o.status === "Closing soon");

  return (
    <div>
      {/* Institutional identity header */}
      <header className="border-b border-line px-5 pb-6 pt-6 md:px-8">
        <div className="flex flex-wrap items-center gap-2"><span className="eyebrow">Buyer intelligence profile</span><SyntheticTag /></div>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-6">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[6px] border border-line-strong bg-canvas font-mono text-[12px] font-semibold text-ink-700">{b.acronym.slice(0, 5)}</div>
            <div className="min-w-0">
              <h1 className="font-serif text-[26px] font-semibold leading-tight text-ink-900">{b.name}</h1>
              <div className="mt-1 text-[13px] text-ink-600">{b.type} · {b.city}, {c.region.get(b.regionId)?.name} · est. {b.established}</div>
              <p className="mt-2 max-w-2xl text-[13px] text-ink-500">{b.description}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/buyers/compare?ids=${id}`} className="btn"><GitCompare size={14} /> Compare</Link>
            <Link href={`/reports?type=buyer&subject=${id}`} className="btn-primary"><FileText size={14} /> Buyer report</Link>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-y-4 border-t border-line pt-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Opportunities", p.summary.opportunities, `${p.summary.active} active now`],
            ["Publication rate", `${f.num(p.publicationFrequency.perYear, 1)}/yr`, `median gap ${p.publicationFrequency.medianGapDays !== null ? Math.round(p.publicationFrequency.medianGapDays) + " days" : "n/a"}`],
            ["Median value", f.mad(p.values.median), `${p.values.known}/${p.summary.opportunities} with budget`],
            ["Recorded awards", p.awardsTotal, f.mad(p.awardValue)],
            ["Distinct awardees", p.awardees.length, p.awardees[0] ? `lead: ${Math.round(p.awardees[0].share * 100)}% of awards` : "—"],
            ["Recurring lines", p.recurring.length, `${signals.filter((s) => s.state !== "Overdue").length} forward signals`],
          ].map(([k, v, s]) => (
            <div key={String(k)} className="pr-4">
              <div className="text-[11px] text-ink-500">{k}</div>
              <div className="tnum mt-0.5 text-[20px] font-semibold tracking-[-0.01em]">{v}</div>
              <div className="text-[11px] text-ink-500">{s}</div>
            </div>
          ))}
        </div>
      </header>

      <Section index="01" title="Analytical observations" kicker="Rule-based findings derived from this buyer's records; each links to its supporting evidence.">
        <div className="space-y-2.5">
          {p.observations.map((o, i) => <Finding key={i} kind={o.evidence.length ? "interpretation" : "unknown"} evidence={o.evidence}>{o.text}</Finding>)}
        </div>
      </Section>

      <Section index="02" title="Purchasing calendar" kicker="Publications by sector and quarter. Repeated cells along a row reveal procurement cycles."
        meta={<div>Darker = more publications · Σ = row total</div>}>
        <Heatmap rows={sectorsInCal} cols={quarters} max={calMax}
          value={(r, q) => cal[r]?.[q] ?? 0}
          rowHeader={(r) => (r === "unclassified" ? "Unclassified" : c.sector.get(r)?.name ?? r)}
          colHeader={(q) => q.replace("-", " ")}
          cellTitle={(r, q, v) => `${c.sector.get(r)?.name ?? r} · ${q}: ${v}`} />
        <ChartNote n={p.opportunities.filter((o) => o.publicationDate).length} period={`${quarters[0]} – ${quarters[quarters.length - 1]}`} />
      </Section>

      <Section index="03" title="What this buyer purchases" kicker={p.sectorMix[0] ? `${p.sectorMix[0].label} is the leading category (${f.pct(p.sectorMix[0].share)} of opportunities).` : undefined}>
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <BarList rows={p.sectorMix.map((s) => ({ key: s.key, label: s.label, value: s.count, sub: `${f.mad(s.value)} estimated`, display: `${s.count} · ${f.pct(s.share)}` }))} />
            <ChartNote n={p.opportunities.length} period="2023–2026" />
          </div>
          <div className="space-y-5">
            <div>
              <div className="mb-2 text-[12px] font-medium text-ink-600">Procedures used</div>
              <ShareBar parts={p.procedures.map((x, i) => ({ label: x.label, value: x.count, color: SERIES[i] ?? MUTED }))} />
            </div>
            <div>
              <div className="mb-2 text-[12px] font-medium text-ink-600">Execution geography</div>
              <BarList rows={p.regions.map((r) => ({ key: r.key, label: r.label, value: r.count, display: r.count }))} />
            </div>
            <DefList cols={3} items={p.perYear.map((y) => ({ k: `Published ${y.year}`, v: <span className="tnum">{y.count} · {f.mad(y.value)}</span> }))} />
          </div>
        </div>
      </Section>

      <Section index="04" title="Awardee relationships" kicker="Companies holding recorded awards from this buyer. A high single-supplier share indicates dependence on an incumbent.">
        <DataTable rows={p.awardees} rowKey={(a) => a.id} rowHref={(a) => `/competitors/${a.id}`} dense pageSize={10} initialSort={{ key: "aw", dir: "desc" }}
          empty="No recorded awards for this buyer — outcome data not published in the synthetic sources."
          columns={[
            { key: "n", header: "Awardee", sort: (a) => a.name, render: (a) => <span className="font-medium">{a.name}</span> },
            { key: "aw", header: "Awards", align: "right", sort: (a) => a.awards, render: (a) => a.awards },
            { key: "sh", header: "Share of buyer awards", sort: (a) => a.share, render: (a) => <div className="flex items-center gap-2"><div className="h-1.5 w-24 rounded-full bg-canvas-sunken"><div className="h-full rounded-full bg-accent" style={{ width: `${a.share * 100}%` }} /></div><span className="tnum text-[12px]">{f.pct(a.share)}</span></div> },
            { key: "v", header: "Award value", align: "right", sort: (a) => a.value, render: (a) => f.mad(a.value) },
            { key: "s", header: "Sectors", hideBelow: "md", render: (a) => <span className="text-[12px] text-ink-500">{a.sectors.join(", ")}</span> },
          ]} />
      </Section>

      <Section index="05" title="Recurring purchasing behaviour" kicker="Purchasing lines (same buyer, same sector) with two or more dated publications.">
        {p.recurring.length ? (
          <table className="tbl dense">
            <thead><tr><th>Sector</th><th className="!text-right">Publications</th><th className="!text-right">Median interval</th><th>Regularity</th><th>Publication dates</th><th>Next window</th></tr></thead>
            <tbody>{p.recurring.map((r) => {
              const sig = signals.find((s) => s.sectorId === r.sectorId);
              return (
                <tr key={r.key}>
                  <td className="font-medium">{r.sectorName}</td>
                  <td className="tnum text-right">{r.occurrences.length}</td>
                  <td className="tnum text-right">{r.medianIntervalDays} d</td>
                  <td><Badge tone={r.regularity === "Regular cycle" ? "green" : "neutral"}>{r.regularity}</Badge>{r.cv !== null && <span className="ml-1 text-[11px] text-ink-500">CV {r.cv.toFixed(2)}</span>}</td>
                  <td className="text-[11.5px]">{r.occurrences.map((o) => <Link key={o.id} href={`/opportunities/${o.id}`} className="mr-2 whitespace-nowrap text-accent-700 hover:underline">{f.shortDate(o.publicationDate)}</Link>)}</td>
                  <td>{sig ? <Link href={`/signals?focus=${sig.id}`} className="text-[12px] hover:text-accent-700"><span className="tnum">{f.shortDate(sig.windowStart)} – {f.shortDate(sig.windowEnd)}</span> <LevelBadge level={sig.level} /></Link> : <span className="text-ink-400">—</span>}</td>
                </tr>
              );
            })}</tbody>
          </table>
        ) : <Finding kind="interpretation">No recurring purchasing line detected for this buyer.</Finding>}
      </Section>

      <Section index="06" title="Latest opportunities" kicker={`${active.length} currently active · ${p.opportunities.length} in total`}>
        <OppTable rows={p.opportunities} showBuyer={false} pageSize={10} />
      </Section>
    </div>
  );
}
