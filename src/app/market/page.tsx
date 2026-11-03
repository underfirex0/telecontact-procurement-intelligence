"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { getContext } from "@/lib/services/data-service";
import {
  buyerDependence, buyerSectorMatrix, byBuyer, byBuyerType, byProcedure, byRegion, bySector, competitionIntensity, concentrationBySector,
  demandConcentration, filterOpps, growthSignals, overallConcentration, sectorRecurrence, seasonality, timeSeries, valueDistribution, pctChange,
} from "@/lib/analytics";
import * as f from "@/lib/format";
import { MarketFilterBar, PERIODS, periodRange, useMarketFilter, DOMAIN_COLORS } from "@/components/common";
import { BarList, Heatmap, Legend, MUTED, SERIES, ShareBar, StackedBars, TrendBars } from "@/components/charts";
import { DataTable } from "@/components/data-table";
import { Badge, ChartNote, Finding, Section, SelectFilter, SubHead, Tabs, PageHeader } from "@/components/ui";

type Tab = "trends" | "sectors" | "regions" | "buyers" | "values" | "competition" | "recurrence" | "compare";

function MarketInner() {
  const c = getContext();
  const sp = useSearchParams();
  const mf = useMarketFilter({ sector: sp.get("sector") ?? "" });
  const [tab, setTab] = useState<Tab>((sp.get("tab") as Tab) ?? "trends");
  const fl = mf.filter;
  const rows = useMemo(() => filterOpps(c, fl), [c, fl]);

  return (
    <div>
      <PageHeader eyebrow="Module 06 · Market intelligence" title="Market intelligence workspace"
        description="Sector, regional, buyer, value, competition and recurrence analysis on de-duplicated records. Filters apply to every view; each chart states its sample and period."
        meta={<><span>{rows.length} opportunities in selection</span><span>{mf.periodLabel}</span></>}
        actions={<Link href="/reports?type=market" className="btn"><FileText size={14} /> Market report</Link>}>
        <Tabs value={tab} onChange={setTab} tabs={[
          { id: "trends", label: "Trends" }, { id: "sectors", label: "Sectors" }, { id: "regions", label: "Regions" }, { id: "buyers", label: "Buyer demand" },
          { id: "values", label: "Value distribution" }, { id: "competition", label: "Competition & concentration" }, { id: "recurrence", label: "Recurrence & seasonality" }, { id: "compare", label: "Period comparison" },
        ]} />
      </PageHeader>
      <MarketFilterBar mf={mf} />
      {tab === "trends" && <Trends fl={fl} label={mf.periodLabel} />}
      {tab === "sectors" && <Sectors fl={fl} label={mf.periodLabel} />}
      {tab === "regions" && <Regions fl={fl} label={mf.periodLabel} />}
      {tab === "buyers" && <Buyers fl={fl} label={mf.periodLabel} />}
      {tab === "values" && <Values fl={fl} label={mf.periodLabel} />}
      {tab === "competition" && <Competition fl={fl} label={mf.periodLabel} />}
      {tab === "recurrence" && <Recurrence fl={fl} label={mf.periodLabel} />}
      {tab === "compare" && <Compare fl={fl} />}
    </div>
  );
}

const MAIN = ["Built environment", "Digital", "Facility services", "Advisory", "Energy"];

type P = { fl: ReturnType<typeof useMarketFilter>["filter"]; label: string };

function Trends({ fl, label }: P) {
  const c = getContext();
  const m = useMemo(() => timeSeries(c, fl, "month"), [c, fl]);
  const q = useMemo(() => timeSeries(c, fl, "quarter", true), [c, fl]);
  const domains = [...new Set(c.ds.sectors.map((s) => s.domain))];
  const stacked = q.points.map((p) => {
    const r: Record<string, string | number> = { period: p.period };
    for (const d of MAIN) r[d] = c.ds.sectors.filter((s) => s.domain === d).reduce((a, s) => a + (Number(p[s.id]) || 0), 0);
    r.Other = c.ds.sectors.filter((s) => !MAIN.includes(s.domain)).reduce((a, s) => a + (Number(p[s.id]) || 0), 0) + (Number(p.unclassified) || 0);
    return r;
  });
  const growth = useMemo(() => growthSignals(c, "sector", fl), [c, fl]);
  const rising = growth.filter((g) => g.trend === "Rising");
  const declining = growth.filter((g) => g.trend === "Declining");
  const yearly = ["2023", "2024", "2025"].map((y) => m.points.filter((p) => p.period.startsWith(y)).reduce((a, p) => a + p.count, 0));
  return (
    <>
      <Section index="01" title="Procurement demand over time" kicker={<>Full years: 2023 <b>{yearly[0]}</b> → 2024 <b>{yearly[1]}</b> → 2025 <b>{yearly[2]}</b> publications ({f.signedPct(pctChange(yearly[2], yearly[0]))} over two years).</>}
        meta={<div>Monthly publications · dashed line = period average</div>}>
        <TrendBars data={m.points} xKey="period" yKey="count" avgLine xFormat={f.monthLabel} height={240} yLabel="Opportunities" />
        <ChartNote n={m.n} period={label} note={m.excluded ? `${m.excluded} undated excluded` : undefined} />
      </Section>
      <Section index="02" title="Demand composition by domain" kicker="Quarterly publications stacked by sector domain. Operations, Health, Supplies and unclassified records are grouped as “Other”.">
        <StackedBars data={stacked} xKey="period" xFormat={(v) => v.replace("-", " ")} height={260}
          series={[...MAIN.map((d) => ({ key: d, label: d, color: DOMAIN_COLORS[d] })), { key: "Other", label: `Other (${domains.filter((d) => !MAIN.includes(d)).join(", ")}, unclassified)`, color: MUTED }]} />
        <ChartNote n={q.n} period={label} />
      </Section>
      <Section index="03" title="Growth and decline signals" kicker="Trailing 12 months vs prior 12 months per sector. ±20% change thresholds; at least 6 records across both windows.">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            {rising.map((g) => <Finding key={g.key} kind="metric" evidence={g.ids}><b>{g.label}</b> rising: {g.current} vs {g.previous} publications ({f.signedPct(g.change)}); estimated value {f.mad(g.valueCurrent)} vs {f.mad(g.valuePrevious)}.</Finding>)}
            {!rising.length && <div className="text-[13px] text-ink-500">No rising sector in this selection.</div>}
          </div>
          <div className="space-y-2">
            {declining.map((g) => <Finding key={g.key} kind="metric" evidence={g.ids}><b>{g.label}</b> declining: {g.current} vs {g.previous} ({f.signedPct(g.change)}).</Finding>)}
            {growth.filter((g) => g.trend === "Emerging").map((g) => <Finding key={g.key} kind="interpretation" evidence={g.ids}><b>{g.label}</b> emerging from a low base: {g.current} vs {g.previous} publications — too few prior records for a meaningful % change.</Finding>)}
            {growth.filter((g) => g.trend === "Insufficient data").length > 0 && <Finding kind="unknown">Insufficient data for a trend reading: {growth.filter((g) => g.trend === "Insufficient data").map((g) => g.label).join(", ")}.</Finding>}
          </div>
        </div>
      </Section>
    </>
  );
}

function Sectors({ fl, label }: P) {
  const c = getContext();
  const rows = useMemo(() => bySector(c, fl), [c, fl]);
  const growth = useMemo(() => growthSignals(c, "sector", fl), [c, fl]);
  const total = rows.reduce((a, r) => a + r.count, 0);
  const totalVal = rows.reduce((a, r) => a + r.totalValue, 0);
  return (
    <>
      <Section index="01" title="Sector activity and value" kicker={rows[0] ? `${rows[0].label} is the most active sector (${f.pct(rows[0].share)} of opportunities). Value share differs from count share when budgets are large.` : ""}>
        <div className="grid gap-8 lg:grid-cols-2">
          <div><SubHead right="count · share">By number of opportunities</SubHead><BarList rows={rows.map((r) => ({ key: r.key, label: r.label, value: r.count, display: `${r.count} · ${f.pct(r.share)}` }))} /></div>
          <div><SubHead right="known estimates">By estimated value</SubHead><BarList rows={[...rows].sort((a, b) => b.totalValue - a.totalValue).map((r) => ({ key: r.key, label: r.label, value: r.totalValue, display: f.mad(r.totalValue), sub: `${r.valueN}/${r.count} with budget` }))} /></div>
        </div>
        <ChartNote n={total} period={label} note={`total known value ${f.mad(totalVal)}`} />
      </Section>
      <Section index="02" title="Sector table" kicker="Full metrics per sector. Click a sector to open its opportunities.">
        <DataTable rows={rows} rowKey={(r) => r.key} rowHref={(r) => `/opportunities?sector=${r.key === "__none" ? "none" : r.key}`} dense pageSize={20} initialSort={{ key: "n", dir: "desc" }}
          columns={[
            { key: "l", header: "Sector", sort: (r) => r.label, render: (r) => <span className="font-medium">{r.label}</span> },
            { key: "n", header: "Opps.", align: "right", sort: (r) => r.count, render: (r) => r.count },
            { key: "s", header: "Share", align: "right", sort: (r) => r.share, render: (r) => f.pct(r.share, 1) },
            { key: "v", header: "Known value", align: "right", sort: (r) => r.totalValue, render: (r) => f.mad(r.totalValue, { unit: false }) },
            { key: "m", header: "Median value", align: "right", sort: (r) => r.medianValue, render: (r) => f.mad(r.medianValue, { unit: false }) },
            { key: "g", header: "12m vs prior", align: "right", sort: (r) => growth.find((g) => g.key === r.key)?.change, render: (r) => { const g = growth.find((x) => x.key === r.key); return g ? <span>{g.current} vs {g.previous} <span className="text-ink-500">({f.signedPct(g.change)})</span></span> : "—"; } },
            { key: "t", header: "Trend", render: (r) => { const g = growth.find((x) => x.key === r.key); return g ? <Badge tone={g.trend === "Rising" ? "green" : g.trend === "Emerging" ? "blue" : g.trend === "Declining" ? "red" : "neutral"}>{g.trend}</Badge> : null; } },
          ]} />
      </Section>
    </>
  );
}

function Regions({ fl, label }: P) {
  const c = getContext();
  const rows = useMemo(() => byRegion(c, fl), [c, fl]);
  const growth = useMemo(() => growthSignals(c, "region", fl), [c, fl]);
  const opps = useMemo(() => filterOpps(c, fl).filter((o) => o.regionId && o.sectorId), [c, fl]);
  const sectors = [...new Set(opps.map((o) => o.sectorId!))];
  const cells: Record<string, Record<string, number>> = {};
  opps.forEach((o) => { cells[o.regionId!] = cells[o.regionId!] ?? {}; cells[o.regionId!][o.sectorId!] = (cells[o.regionId!][o.sectorId!] ?? 0) + 1; });
  const max = Math.max(1, ...Object.values(cells).flatMap((r) => Object.values(r)));
  return (
    <>
      <Section index="01" title="Regional demand" kicker={rows[0] ? `${rows[0].label} concentrates ${f.pct(rows[0].share)} of opportunities. Medians show the typical tender size per region.` : ""}>
        <div className="grid gap-8 lg:grid-cols-2">
          <div><SubHead>Opportunities by region</SubHead><BarList rows={rows.map((r) => ({ key: r.key, label: r.label, value: r.count, sub: `median ${f.mad(r.medianValue)}`, display: `${r.count} · ${f.pct(r.share)}` }))} /></div>
          <div><SubHead right="last 12m vs prior 12m">Regional momentum</SubHead><BarList rows={[...growth].sort((a, b) => b.current - a.current).map((g) => ({ key: g.key, label: g.label, value: g.current, secondary: g.previous, display: <span>{g.current} <span className="text-[11px] font-normal text-ink-500">{g.trend === "Insufficient data" ? "n/a" : f.signedPct(g.change)}</span></span> }))} /></div>
        </div>
        <ChartNote n={rows.reduce((a, r) => a + r.count, 0)} period={label} />
      </Section>
      <Section index="02" title="Region × sector matrix" kicker="Where each type of need is purchased. Read rows to see a region's demand profile.">
        <Heatmap rows={Object.keys(cells).sort((a, b) => Object.values(cells[b]).reduce((x, y) => x + y, 0) - Object.values(cells[a]).reduce((x, y) => x + y, 0))} cols={sectors} max={max}
          value={(r, s) => cells[r]?.[s] ?? 0} rowHeader={(r) => c.region.get(r)?.name} colHeader={(s) => c.sector.get(s)?.name} cellTitle={(r, s, v) => `${c.region.get(r)?.name} · ${c.sector.get(s)?.name}: ${v}`} />
        <ChartNote n={opps.length} period={label} note="records with region and sector" />
      </Section>
    </>
  );
}

function Buyers({ fl, label }: P) {
  const c = getContext();
  const rows = useMemo(() => byBuyer(c, fl), [c, fl]);
  const types = useMemo(() => byBuyerType(c, fl), [c, fl]);
  const matrix = useMemo(() => buyerSectorMatrix(c, fl), [c, fl]);
  const dc = useMemo(() => demandConcentration(c, fl), [c, fl]);
  return (
    <>
      <Section index="01" title="Which buyers publish the most" kicker={`The five most active buyers account for ${f.pct(dc.top5BuyerShare)} of opportunities in this selection (buyer HHI ${Math.round(dc.buyerHHI ?? 0)}).`}>
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <BarList showRank rows={rows.slice(0, 15).map((r) => ({ key: r.key, label: r.label, value: r.count, href: r.key !== "__none" ? `/buyers/${r.key}` : undefined, sub: `median ${f.mad(r.medianValue)}`, display: r.count }))} />
          <div><SubHead>By buyer type</SubHead><ShareBar parts={types.map((t, i) => ({ label: t.label, value: t.count, color: SERIES[i] ?? MUTED }))} /></div>
        </div>
        <ChartNote n={rows.reduce((a, r) => a + r.count, 0)} period={label} />
      </Section>
      <Section index="02" title="Buyer × sector matrix" kicker="Which buyers purchase similar services. Columns shared by several buyers indicate a broad market for that service.">
        <Heatmap rows={matrix.buyers} cols={matrix.sectors} max={matrix.max} value={(b, s) => matrix.cells[b]?.[s] ?? 0}
          rowHeader={(b) => `${c.buyer.get(b)?.acronym} — ${c.buyer.get(b)?.name}`} colHeader={(s) => c.sector.get(s)?.name} rowHref={(b) => `/buyers/${b}`}
          cellTitle={(b, s, v) => `${c.buyer.get(b)?.acronym} · ${c.sector.get(s)?.name}: ${v}`} />
        <ChartNote n={matrix.n} period={label} note="top 14 buyers by activity" />
      </Section>
    </>
  );
}

function Values({ fl, label }: P) {
  const c = getContext();
  const v = useMemo(() => valueDistribution(c, fl), [c, fl]);
  const procs = useMemo(() => byProcedure(c, fl), [c, fl]);
  return (
    <>
      <Section index="01" title="Procurement value distribution" kicker={<>Median estimate <b>{f.mad(v.median)}</b>, mean <b>{f.mad(v.mean)}</b>: the gap shows a long tail of large infrastructure and construction tenders. 90th percentile: {f.mad(v.p90)}.</>}
        meta={<div>{v.missing} records without a disclosed estimate excluded</div>}>
        <div className="grid gap-8 lg:grid-cols-2">
          <div><SubHead right="number of tenders">Count by value band</SubHead><BarList rows={v.bands.map((b) => ({ key: b.label, label: `${b.label} MAD`, value: b.count, display: b.count }))} /></div>
          <div><SubHead right="share of total value">Value by band</SubHead><BarList rows={v.bands.map((b) => ({ key: b.label, label: `${b.label} MAD`, value: b.value, display: `${f.mad(b.value)} · ${f.pct(b.value / (v.total || 1))}` }))} /></div>
        </div>
        <ChartNote n={v.n} period={label} />
      </Section>
      <Section index="02" title="Procurement procedures" kicker="Open tenders dominate; purchase orders (bons de commande) cover small needs below 500k MAD.">
        <DataTable rows={procs} rowKey={(r) => r.key} dense pageSize={10} columns={[
          { key: "l", header: "Procedure", render: (r) => r.label },
          { key: "n", header: "Opps.", align: "right", sort: (r) => r.count, render: (r) => r.count },
          { key: "s", header: "Share", align: "right", sort: (r) => r.share, render: (r) => f.pct(r.share, 1) },
          { key: "m", header: "Median value", align: "right", sort: (r) => r.medianValue, render: (r) => f.mad(r.medianValue) },
          { key: "v", header: "Known value", align: "right", sort: (r) => r.totalValue, render: (r) => f.mad(r.totalValue) },
        ]} />
      </Section>
    </>
  );
}

function Competition({ fl, label }: P) {
  const c = getContext();
  const overall = useMemo(() => overallConcentration(c, fl), [c, fl]);
  const sectors = useMemo(() => concentrationBySector(c, fl), [c, fl]);
  const dep = useMemo(() => buyerDependence(c, fl), [c, fl]);
  const ci = useMemo(() => competitionIntensity(c, fl), [c, fl]);
  return (
    <>
      <Section index="01" title="Award concentration" kicker={<>Across {overall.awards} awards, the market is <b>{overall.band.toLowerCase()}</b> (HHI {Math.round(overall.hhiValue ?? 0)}); the top five awardees hold {f.pct(overall.top5Share)} of award value. Sector markets are far more concentrated than the aggregate.</>}
        meta={<><div>HHI = Σ (awardee value share × 100)²</div><div>&lt;1,500 unconcentrated · 1,500–2,500 moderate · &gt;2,500 high</div></>}>
        <BarList rows={sectors.map((s) => ({ key: s.key, label: s.label, value: s.hhiValue ?? 0, sub: `${s.awards} awards · ${s.awardees} awardees${s.smallSample ? " · small n" : ""}`, display: Math.round(s.hhiValue ?? 0), color: (s.hhiValue ?? 0) > 2500 ? "#c4476b" : (s.hhiValue ?? 0) > 1500 ? "#d0782a" : "#17917a" }))} max={10000} />
        <Legend className="mt-3" items={[{ label: "Unconcentrated", color: "#17917a" }, { label: "Moderate", color: "#d0782a" }, { label: "High", color: "#c4476b" }]} />
        <ChartNote n={overall.awards} unit="awards" period={label} />
      </Section>
      <Section index="02" title="Buyer dependence on repeated suppliers" kicker={`${dep.filter((d) => d.dependent).length} buyers award at least half of their contracts (min. 3) to a single supplier.`}>
        <DataTable rows={dep} rowKey={(d) => d.buyerId} rowHref={(d) => `/buyers/${d.buyerId}`} dense pageSize={10} initialSort={{ key: "s", dir: "desc" }} columns={[
          { key: "b", header: "Buyer", render: (d) => <span className="font-medium">{d.buyerName}</span> },
          { key: "a", header: "Awards", align: "right", sort: (d) => d.awards, render: (d) => d.awards },
          { key: "n", header: "Awardees", align: "right", sort: (d) => d.awardees, render: (d) => d.awardees },
          { key: "t", header: "Main supplier", render: (d) => <Link href={`/competitors/${d.topSupplierId}`} className="hover:text-accent-700">{d.topSupplierName}</Link> },
          { key: "s", header: "Share", align: "right", sort: (d) => d.share, render: (d) => f.pct(d.share) },
          { key: "f", header: "", render: (d) => (d.dependent ? <Badge tone="amber">Dependent</Badge> : null) },
        ]} />
      </Section>
      <Section index="03" title="Competition intensity" kicker={`Disclosed bidder lists exist for ${ci.tenders} tenders, averaging ${ci.meanBidders?.toFixed(1) ?? "—"} bidders. Small samples — indicative only.`}>
        <BarList rows={ci.bySector.map((s) => ({ key: s.key, label: s.label, value: s.meanBidders, display: `${s.meanBidders.toFixed(1)} bidders`, sub: `${s.tenders} tender(s)` }))} />
        <ChartNote n={ci.tenders} unit="tenders with bidder lists" period={label} />
      </Section>
    </>
  );
}

function Recurrence({ fl, label }: P) {
  const c = getContext();
  const s = useMemo(() => seasonality(c, fl), [c, fl]);
  const rec = useMemo(() => sectorRecurrence(c).filter((r) => !fl.sectorIds?.length || fl.sectorIds.includes(r.sectorId)), [c, fl]);
  const peak = [...s.months].sort((a, b) => b.index - a.index)[0];
  const low = [...s.months].sort((a, b) => a.index - b.index)[0];
  return (
    <>
      <Section index="01" title="Recurring procurement categories" kicker="Share of each sector's opportunities that belong to recurring purchasing lines (same buyer re-procuring the same category).">
        <DataTable rows={rec} rowKey={(r) => r.sectorId} dense pageSize={20} initialSort={{ key: "sh", dir: "desc" }} columns={[
          { key: "s", header: "Sector", render: (r) => <span className="font-medium">{r.sectorName}</span> },
          { key: "n", header: "Opps.", align: "right", sort: (r) => r.opportunities, render: (r) => r.opportunities },
          { key: "l", header: "Recurring lines", align: "right", sort: (r) => r.recurringLines, render: (r) => r.recurringLines },
          { key: "sh", header: "Recurring share", sort: (r) => r.recurringShare, render: (r) => <div className="flex items-center gap-2"><div className="h-1.5 w-28 rounded-full bg-canvas-sunken"><div className="h-full rounded-full bg-accent" style={{ width: `${r.recurringShare * 100}%` }} /></div><span className="tnum text-[12px]">{f.pct(r.recurringShare)}</span></div> },
          { key: "c", header: "Median cycle", align: "right", sort: (r) => r.medianCycleDays, render: (r) => (r.medianCycleDays ? `${r.medianCycleDays} d (~${Math.round(r.medianCycleDays / 30.4)} m)` : "—") },
        ]} />
        <div className="mt-3"><Link href="/signals" className="link text-[12.5px]">See forward signals derived from these lines →</Link></div>
      </Section>
      <Section index="02" title="Seasonal tendencies" kicker={`Publication index by calendar month (1.0 = average). Peak: ${peak.month} (${peak.index.toFixed(2)}); trough: ${low.month} (${low.index.toFixed(2)}).`}>
        <TrendBars data={s.months.map((m) => ({ month: m.month, index: Math.round(m.index * 100) / 100 }))} xKey="month" yKey="index" format={(v) => v.toFixed(1)} height={200} yLabel="Index" />
        <ChartNote n={s.n} period={label} />
      </Section>
    </>
  );
}

function Compare({ fl }: { fl: P["fl"] }) {
  const c = getContext();
  const [a, setA] = useState("2024");
  const [b, setB] = useState("2025");
  const [dim, setDim] = useState<"sector" | "region">("sector");
  const ra = periodRange(a);
  const rb = periodRange(b);
  const rows = useMemo(() => {
    const A = dim === "sector" ? bySector(c, { ...fl, from: ra.from, to: ra.to }) : byRegion(c, { ...fl, from: ra.from, to: ra.to });
    const B = dim === "sector" ? bySector(c, { ...fl, from: rb.from, to: rb.to }) : byRegion(c, { ...fl, from: rb.from, to: rb.to });
    const keys = [...new Set([...A.map((x) => x.key), ...B.map((x) => x.key)])];
    return keys.map((k) => {
      const x = A.find((r) => r.key === k);
      const y = B.find((r) => r.key === k);
      return { key: k, label: x?.label ?? y?.label ?? k, a: x?.count ?? 0, b: y?.count ?? 0, va: x?.totalValue ?? 0, vb: y?.totalValue ?? 0, change: pctChange(y?.count ?? 0, x?.count ?? 0) };
    }).sort((p, q) => q.b - p.b);
  }, [c, fl, dim, ra.from, ra.to, rb.from, rb.to]);
  const opts = PERIODS.filter((p) => p.value !== "all");
  return (
    <Section index="01" title="Compare two periods" kicker="Opportunity counts and known value per sector or region in two periods. Note: 2026 covers January to 2 November only." wide
      actions={<div className="flex flex-wrap gap-2">
        <SelectFilter label="Period A" value={a} onChange={setA} options={opts} width="w-40" />
        <SelectFilter label="Period B" value={b} onChange={setB} options={opts} width="w-40" />
        <SelectFilter label="Dimension" value={dim} onChange={(v) => setDim(v as "sector" | "region")} options={[{ value: "sector", label: "Sector" }, { value: "region", label: "Region" }]} width="w-32" />
      </div>}>
      <BarList rows={rows.map((r) => ({ key: r.key, label: r.label, value: r.b, secondary: r.a, display: <span>{r.a} → {r.b} <span className="text-[11px] font-normal text-ink-500">{f.signedPct(r.change)}</span></span> }))} />
      <Legend className="mt-3" items={[{ label: `B: ${rb.label}`, color: "#2563a8" }, { label: `A: ${ra.label}`, color: "#8A9BB4", dashed: true }]} />
      <ChartNote n={rows.reduce((x, r) => x + r.a + r.b, 0)} period={`${ra.label} vs ${rb.label}`} />
    </Section>
  );
}

export default function MarketPage() {
  return <Suspense><MarketInner /></Suspense>;
}
