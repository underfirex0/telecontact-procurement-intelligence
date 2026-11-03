"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, FileText } from "lucide-react";
import { getContext } from "@/lib/services/data-service";
import { useSuppliers } from "@/lib/services/workspace";
import { analyseQuality, buildDossier, futureSignals, growthSignals, overallConcentration, overviewKpis, sectorLeaders, timeSeries, byRegion, filterOpps } from "@/lib/analytics";
import { addDays, diffDays } from "@/lib/dates";
import * as f from "@/lib/format";
import { MarketFilterBar, useMarketFilter } from "@/components/common";
import { BarList, Legend, TrendBars } from "@/components/charts";
import { DataTable } from "@/components/data-table";
import { Badge, ChartNote, FigureStrip, LevelBadge, Meter, PageHeader, Section, StatusBadge, SubHead, Tabs, scoreTone } from "@/components/ui";

export default function OverviewPage() {
  const c = getContext();
  const suppliers = useSuppliers();
  const mf = useMarketFilter();
  const [metric, setMetric] = useState<"count" | "value">("count");
  const live = { ...mf.filter, from: undefined, to: undefined };

  const data = useMemo(() => {
    const k = overviewKpis(c, live);
    const ts = timeSeries(c, mf.filter, "quarter");
    const growth = growthSignals(c, "sector", live);
    const regions = byRegion(c, mf.filter);
    const rows = filterOpps(c, mf.filter);
    const active = filterOpps(c, live).filter((o) => o.status === "Open" || o.status === "Closing soon");
    const pipeline = active.map((o) => ({ o, d: buildDossier(c, o.id, suppliers)! })).sort((a, b) => b.d.readiness.score - a.d.readiness.score);
    const signals = futureSignals(c).filter((s) => s.state !== "Overdue" && (!mf.state.sector || s.sectorId === mf.state.sector)).filter((s) => !mf.state.region || c.buyer.get(s.buyerId)?.regionId === mf.state.region);
    const leaders = sectorLeaders(c, mf.state.sector || null).slice(0, 8);
    const conc = overallConcentration(c, mf.filter);
    const q = analyseQuality(c);
    const totalGrowth = growth.reduce((a, g) => ({ cur: a.cur + g.current, prev: a.prev + g.previous }), { cur: 0, prev: 0 });
    // recent developments feed
    const ref = c.ref;
    const feed: { date: string; kind: string; text: React.ReactNode; href: string }[] = [];
    const okIds = new Set(rows.map((o) => o.id));
    for (const a of c.ds.awards.filter((x) => okIds.has(x.opportunityId) && diffDays(ref, x.awardDate) <= 150)) {
      const o = c.opp.get(a.opportunityId)!;
      feed.push({ date: a.awardDate, kind: "Award", href: `/opportunities/${o.id}`, text: <><b className="font-medium">{c.company.get(a.companyId)?.name}</b> awarded {f.mad(a.amount)} by {c.buyer.get(o.buyerId ?? "")?.acronym ?? "—"} — {o.title}</> });
    }
    for (const o of filterOpps(c, live).filter((x) => x.publicationDate && diffDays(ref, x.publicationDate) <= 12)) feed.push({ date: o.publicationDate!, kind: "Published", href: `/opportunities/${o.id}`, text: <>{c.buyer.get(o.buyerId ?? "")?.acronym ?? "Unidentified buyer"} published <b className="font-medium">{o.title}</b>{o.estimatedValue ? ` (${f.mad(o.estimatedValue)})` : ""}</> });
    for (const s of signals.filter((x) => x.state === "Within window").slice(0, 4)) feed.push({ date: s.windowStart, kind: "Signal", href: `/signals?focus=${s.id}`, text: <>Expected re-procurement window opened: <b className="font-medium">{s.buyerName}</b> · {s.sectorName}</> });
    feed.sort((a, b) => b.date.localeCompare(a.date));
    return { k, ts, growth, regions, pipeline, signals, leaders, conc, q, totalGrowth, feed: feed.slice(0, 12), rows };
  }, [c, mf.filter, suppliers]); // eslint-disable-line react-hooks/exhaustive-deps

  const { k, ts, growth, regions, pipeline, signals, leaders, conc, q, totalGrowth, feed } = data;
  const lastQ = ts.points.slice(-4).map((p) => p.period)[0];
  const ch = totalGrowth.prev ? (totalGrowth.cur - totalGrowth.prev) / totalGrowth.prev : null;
  const topSector = [...growth].filter((g) => g.trend !== "Insufficient data" && g.trend !== "Emerging").sort((a, b) => b.current - a.current)[0];
  const fastest = growth.filter((g) => g.trend === "Rising").sort((a, b) => (b.change ?? 0) - (a.change ?? 0))[0];
  const activeSuppliers = suppliers.filter((s) => s.status === "Active partner").length;

  return (
    <div>
      <PageHeader
        eyebrow={<>Intelligence command centre · as of {f.date(c.ref)}</>}
        title="Moroccan public procurement — market brief"
        description="What is being bought, by whom, who wins, and where the next commercial openings are. Every figure below is computed from the synthetic record set and links to its evidence."
        actions={<>
          <Link href="/reports?type=market" className="btn"><FileText size={14} /> Market report</Link>
          <Link href="/opportunities?status=active" className="btn-primary">Open pipeline <ArrowRight size={14} /></Link>
        </>}
      />
      <MarketFilterBar mf={mf} />

      <div className="px-5 pt-5 md:px-8">
        <FigureStrip items={[
          { label: "Active opportunities", value: k.active, sub: <>{f.mad(k.activeValue)} estimated · {k.activeValueKnown}/{k.active} with budget</>, href: "/opportunities?status=active", tone: "accent" },
          { label: "Deadlines ≤ 14 days", value: k.upcoming14, sub: "Submission windows closing", href: "/opportunities?status=closing", tone: k.upcoming14 ? "warn" : "default" },
          { label: "New in last 30 days", value: k.newLast30, sub: `Published since ${f.shortDate(addDays(c.ref, -30))}`, href: "/opportunities?status=new" },
          { label: "Publishing buyers", value: k.buyers, sub: `of ${c.ds.buyers.length} contracting authorities`, href: "/buyers" },
          { label: "Verified awardees", value: k.awardees, sub: `${k.awards} awards · ${f.mad(k.awardValue)}`, href: "/awardees" },
          { label: "Supplier network", value: suppliers.length, sub: `${activeSuppliers} active partners · ${new Set(suppliers.map((s) => s.country)).size} countries`, href: "/suppliers" },
        ]} />
      </div>

      <Section index="01" title="Market activity"
        kicker={<>{ts.n} publications in the selected period. Over the last 12 months the market published <b className="text-ink-900">{totalGrowth.cur}</b> opportunities vs {totalGrowth.prev} in the prior 12 ({f.signedPct(ch)}).</>}
        meta={<><div>Grain: calendar quarter · darker bars = last 4 quarters</div>{ts.excluded > 0 && <div>{ts.excluded} records without publication date excluded</div>}</>}
        actions={<Link href="/market" className="btn btn-sm">Market workspace</Link>}>
        <Tabs className="mb-3" value={metric} onChange={setMetric} tabs={[{ id: "count", label: "Opportunities published" }, { id: "value", label: "Estimated value published" }]} />
        <TrendBars data={ts.points} xKey="period" yKey={metric} highlightFrom={lastQ} height={230}
          format={metric === "value" ? (v) => f.mad(v, { unit: false }) : (v) => String(Math.round(v))} yLabel={metric === "value" ? "MAD" : "Opportunities"} xFormat={(v) => v.replace("-", " ")} />
        <ChartNote n={ts.n} period={mf.periodLabel} note={metric === "value" ? "value sums known estimates only" : undefined} />
      </Section>

      <Section index="02" title="Where demand concentrates"
        kicker={<>{topSector ? <><b className="text-ink-900">{topSector.label}</b> leads trailing-12-month activity with {topSector.current} publications.</> : null} {fastest ? <>Fastest growth: <b className="text-ink-900">{fastest.label}</b> ({f.signedPct(fastest.change)}).</> : null}</>}
        meta={<><div>Sector bars: last 12 months (solid) vs prior 12 months (dashed outline)</div><div>Trend label needs ≥6 records across both windows</div></>}>
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <SubHead right={<Legend items={[{ label: "Last 12m", color: "#2563a8" }, { label: "Prior 12m", color: "#8A9BB4", dashed: true }]} />}>Sectors · 12-month momentum</SubHead>
            <BarList rows={[...growth].sort((a, b) => b.current - a.current).map((g) => ({
              key: g.key, label: g.label, value: g.current, secondary: g.previous, href: `/market?sector=${g.key}`,
              display: <span>{g.current} <span className="text-[11px] font-normal text-ink-500">{g.trend === "Insufficient data" ? "n/a" : g.trend === "Emerging" ? "new" : f.signedPct(g.change)}</span></span>,
              title: `${g.label}: ${g.current} vs ${g.previous} (${g.trend})`,
            }))} />
            <ChartNote n={growth.reduce((a, g) => a + g.current + g.previous, 0)} period={growth[0] ? `${f.shortDate(growth[0].window.previousFrom)} – ${f.shortDate(growth[0].window.currentTo)}` : undefined} />
          </div>
          <div>
            <SubHead right="share of opportunities">Regions · {mf.periodLabel}</SubHead>
            <BarList rows={regions.slice(0, 12).map((r) => ({ key: r.key, label: r.label, value: r.count, sub: `median ${f.mad(r.medianValue)}`, display: <span>{r.count} <span className="text-[11px] font-normal text-ink-500">{f.pct(r.share)}</span></span> }))} />
            <ChartNote n={data.rows.length} period={mf.periodLabel} />
          </div>
        </div>
      </Section>

      <Section index="03" title="Live pipeline — what deserves attention"
        kicker="Active opportunities ranked by bid-readiness score from each opportunity's intelligence dossier (commercial attractiveness, competitive openness, buyer reliability, partner availability, time, information)."
        meta={<div>{pipeline.length} active opportunities · scores are decision aids, not predictions</div>}
        actions={<Link href="/bids" className="btn btn-sm">Bid workspace</Link>}>
        <DataTable rows={pipeline} rowKey={(r) => r.o.id} rowHref={(r) => `/opportunities/${r.o.id}`} pageSize={8} dense initialSort={{ key: "score", dir: "desc" }}
          columns={[
            { key: "obj", header: "Opportunity", width: "40%", sort: (r) => r.o.reference, render: (r) => <div><div className="font-mono text-[11px] text-accent-700">{r.o.reference}</div><div className="line-clamp-1 text-[13px] text-ink-900">{r.o.title}</div><div className="text-[11.5px] text-ink-500">{c.buyer.get(r.o.buyerId ?? "")?.acronym ?? "Unidentified"} · {c.sector.get(r.o.sectorId ?? "")?.name ?? "Unclassified"}</div></div> },
            { key: "deadline", header: "Deadline", sort: (r) => r.o.deadline, render: (r) => <div className="tnum whitespace-nowrap text-[12.5px]">{f.shortDate(r.o.deadline)}<div className="text-[11px] text-ink-500">{r.d.timing.daysToDeadline} days</div></div> },
            { key: "value", header: "Est. value", align: "right", sort: (r) => r.o.estimatedValue, render: (r) => f.mad(r.o.estimatedValue, { unit: false }) },
            { key: "status", header: "Status", hideBelow: "lg", render: (r) => <StatusBadge status={r.o.status} /> },
            { key: "score", header: "Readiness", sort: (r) => r.d.readiness.score, width: "150px", render: (r) => <div className="w-[130px]"><div className="tnum mb-1 flex justify-between text-[12px]"><span className="font-semibold">{r.d.readiness.score}</span><span className="text-ink-500">/100</span></div><Meter value={r.d.readiness.score} tone={scoreTone(r.d.readiness.score)} /></div> },
            { key: "posture", header: "Posture", sort: (r) => r.d.readiness.posture, render: (r) => <Badge tone={r.d.readiness.posture === "Pursue" ? "green" : r.d.readiness.posture === "Pursue with partner" ? "blue" : r.d.readiness.posture === "Qualify further" ? "amber" : "neutral"}>{r.d.readiness.posture}</Badge> },
          ]} />
      </Section>

      <div className="grid xl:grid-cols-2">
        <Section index="04" title="Next procurement signals" wide className="xl:border-r"
          kicker="Recurring purchasing lines whose statistical cycle points to a publication soon. Expectations, not announcements."
          actions={<Link href="/signals" className="btn btn-sm">All signals</Link>}>
          <div className="divide-y divide-line-soft">
            {signals.slice(0, 7).map((s) => (
              <Link key={s.id} href={`/signals?focus=${s.id}`} className="flex items-start justify-between gap-3 py-2.5 hover:bg-canvas/60">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-ink-900">{s.buyerName}</div>
                  <div className="text-[12px] text-ink-500">{s.sectorName} · {s.historical.length} past publications · every ~{Math.round(s.medianIntervalDays / 30.4)} months</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="tnum text-[12px] text-ink-800">{f.shortDate(s.windowStart)} – {f.shortDate(s.windowEnd)}</div>
                  <div className="mt-0.5 flex justify-end gap-1">{s.state === "Within window" && <Badge tone="blue">Window open</Badge>}<LevelBadge level={s.level} /></div>
                </div>
              </Link>
            ))}
            {signals.length === 0 && <div className="py-6 text-sm text-ink-500">No signals for this filter.</div>}
          </div>
        </Section>
        <Section index="05" title="Recent market developments" wide
          kicker="Latest awards (150 days), new publications (12 days) and opening signal windows, generated from records.">
          <ol className="relative border-l border-line pl-4">
            {feed.map((e, i) => (
              <li key={i} className="relative pb-3 last:pb-0">
                <span className={`absolute -left-[21px] top-1.5 h-2 w-2 rounded-full ring-2 ring-white ${e.kind === "Award" ? "bg-signal-good" : e.kind === "Signal" ? "bg-[#7c5cc4]" : "bg-accent"}`} />
                <Link href={e.href} className="block hover:text-accent-700">
                  <div className="flex items-center gap-2 text-[11px] text-ink-500"><span className="tnum">{f.date(e.date)}</span><span className="font-semibold uppercase tracking-[0.08em]">{e.kind}</span></div>
                  <div className="line-clamp-2 text-[13px] leading-snug text-ink-800">{e.text}</div>
                </Link>
              </li>
            ))}
            {feed.length === 0 && <li className="text-sm text-ink-500">No recent developments for this filter.</li>}
          </ol>
        </Section>
      </div>

      <div className="grid xl:grid-cols-2">
        <Section index="06" title="Who wins" wide className="xl:border-r"
          kicker={<>Award concentration across the selection: HHI <b className="text-ink-900">{conc.hhiValue ? Math.round(conc.hhiValue) : "—"}</b> ({conc.band.toLowerCase()}), top-5 awardees hold {f.pct(conc.top5Share)} of award value over {conc.awards} awards.</>}
          actions={<Link href="/awardees" className="btn btn-sm">Awardee intelligence</Link>}>
          <BarList showRank rows={leaders.map((l) => ({ key: l.id, label: l.name, value: l.awards, href: `/competitors/${l.id}`, sub: `${l.buyers} buyer(s) · ${f.mad(l.value)}`, display: `${l.awards} awards` }))} />
          <ChartNote n={leaders.reduce((a, l) => a + l.awards, 0)} unit="awards (top 8 shown)" period="All award history" />
        </Section>
        <Section index="07" title="Data confidence" wide
          kicker={<>Overall data-quality score <b className="text-ink-900">{q.score}</b>/100. Interpret award-based metrics with care: only {f.pct(q.coverage.awardCoverage)} of award-eligible tenders have a recorded outcome.</>}
          actions={<Link href="/quality" className="btn btn-sm">Quality workspace</Link>}>
          <div className="space-y-2.5">
            {q.components.map((x) => (
              <div key={x.key} className="grid grid-cols-[150px_1fr_48px] items-center gap-3 text-[12.5px]">
                <span className="text-ink-700">{x.label} <span className="text-ink-400">×{x.weight}</span></span>
                <Meter value={x.value * 100} tone={scoreTone(x.value * 100)} />
                <span className="tnum text-right font-medium">{f.pct(x.value)}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
