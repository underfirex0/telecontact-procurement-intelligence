"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { getContext } from "@/lib/services/data-service";
import { concentrationBySector, filterAwards, groupBy, sum } from "@/lib/analytics";
import * as f from "@/lib/format";
import { toCSV, downloadFile } from "@/lib/reports/export";
import { MarketFilterBar, useMarketFilter } from "@/components/common";
import { BarList } from "@/components/charts";
import { DataTable } from "@/components/data-table";
import { Badge, ChartNote, FigureStrip, PageHeader, Section, SelectFilter, Tabs } from "@/components/ui";

export default function AwardeesPage() {
  const c = getContext();
  const mf = useMarketFilter();
  const [buyer, setBuyer] = useState("");
  const [rank, setRank] = useState<"awards" | "value">("awards");
  const awards = useMemo(() => filterAwards(c, mf.filter).filter((a) => !buyer || c.opp.get(a.opportunityId)?.buyerId === buyer), [c, mf.filter, buyer]);
  const awardees = useMemo(() => {
    const by = groupBy(awards, (a) => a.companyId);
    return [...by.entries()].map(([id, l]) => {
      const buyers = groupBy(l, (a) => c.opp.get(a.opportunityId)?.buyerId ?? null);
      const dates = l.map((a) => a.awardDate).sort();
      return {
        id, name: c.company.get(id)?.name ?? id, sector: c.sector.get(c.company.get(id)?.sectorIds[0] ?? "")?.name ?? "—",
        awards: l.length, value: sum(l.map((a) => a.amount ?? 0)), share: l.length / awards.length,
        buyers: buyers.size, repeat: [...buyers.values()].filter((x) => x.length >= 2).length,
        regions: new Set(l.map((a) => c.opp.get(a.opportunityId)?.regionId).filter(Boolean)).size,
        first: dates[0], last: dates[dates.length - 1], avg: sum(l.map((a) => a.amount ?? 0)) / Math.max(1, l.filter((a) => a.amount).length),
      };
    });
  }, [awards, c]);
  const sectors = useMemo(() => concentrationBySector(c, mf.filter), [c, mf.filter]);
  const totalValue = sum(awards.map((a) => a.amount ?? 0));
  const ranked = [...awardees].sort((a, b) => (rank === "awards" ? b.awards - a.awards || b.value - a.value : b.value - a.value)).slice(0, 15);
  const exportCsv = () => downloadFile(`telecontact-awards-${c.ref}.csv`, toCSV(awards.map((a) => {
    const o = c.opp.get(a.opportunityId)!;
    return { award_id: a.id, award_date: a.awardDate, awardee: c.company.get(a.companyId)?.name, amount_mad: a.amount ?? "", reference: o.reference, object: o.title, buyer: c.buyer.get(o.buyerId ?? "")?.name ?? "", sector: c.sector.get(o.sectorId ?? "")?.name ?? "", region: c.region.get(o.regionId ?? "")?.name ?? "", source: a.provenance.source, data_status: "SYNTHETIC DEMO DATA" };
  })), "text/csv");

  return (
    <div>
      <PageHeader eyebrow="Module 05 · Awardee intelligence" title="Who receives the contracts"
        description="Companies with verified (synthetic) awards — organised by sector, buyer, region, volume and value. Explore which companies dominate each segment."
        actions={<button className="btn" onClick={exportCsv}><Download size={14} /> Export awards CSV</button>} />
      <MarketFilterBar mf={mf} right={<SelectFilter label="Awarding buyer" value={buyer} onChange={setBuyer} width="w-56" options={[{ value: "", label: "All buyers" }, ...c.ds.buyers.map((b) => ({ value: b.id, label: `${b.acronym} — ${b.name}` }))]} />} />
      <div className="px-5 pt-5 md:px-8">
        <FigureStrip items={[
          { label: "Awards in selection", value: awards.length, sub: `${awards.filter((a) => a.amount === null).length} without published amount` },
          { label: "Distinct awardees", value: awardees.length, sub: `${awardees.filter((a) => a.awards >= 2).length} with 2+ awards` },
          { label: "Total award value", value: f.mad(totalValue), sub: `median ${f.mad([...awards.map((a) => a.amount ?? 0)].sort((a, b) => a - b)[Math.floor(awards.length / 2)])}` },
          { label: "Repeat relationships", value: awardees.reduce((a, x) => a + x.repeat, 0), sub: "awardee × buyer pairs with ≥2 awards" },
        ]} />
      </div>
      <Section index="01" title="Leading awardees" kicker="Ranking by number of awards or by total award value. Value excludes awards whose amount was not published."
        actions={<Tabs value={rank} onChange={setRank} tabs={[{ id: "awards", label: "By awards" }, { id: "value", label: "By value" }]} />}>
        <BarList showRank labelWidth="w-[38%]" rows={ranked.map((a) => ({ key: a.id, label: a.name, href: `/competitors/${a.id}`, sub: `${a.sector} · ${a.buyers} buyer(s)${a.repeat ? ` · ${a.repeat} repeat` : ""}`, value: rank === "awards" ? a.awards : a.value, display: rank === "awards" ? `${a.awards} · ${f.pct(a.share)}` : f.mad(a.value) }))} />
        <ChartNote n={awards.length} unit="awards" period={mf.periodLabel} note="period filters on tender publication date" />
      </Section>
      <Section index="02" title="Sector dominance" kicker="For each sector: the leading awardee by award value, its share, top-5 share and HHI. Small samples (<8 awards) are flagged.">
        <DataTable rows={sectors} rowKey={(r) => r.key} dense pageSize={20} initialSort={{ key: "aw", dir: "desc" }}
          columns={[
            { key: "s", header: "Sector", sort: (r) => r.label, render: (r) => <Link href={`/market?sector=${r.key}`} className="font-medium hover:text-accent-700">{r.label}</Link> },
            { key: "aw", header: "Awards", align: "right", sort: (r) => r.awards, render: (r) => r.awards },
            { key: "n", header: "Awardees", align: "right", sort: (r) => r.awardees, render: (r) => r.awardees },
            { key: "t", header: "Leading awardee", render: (r) => r.top1 ? <Link href={`/competitors/${r.top1.id}`} className="hover:text-accent-700">{r.top1.name}</Link> : "—" },
            { key: "ts", header: "Lead share", align: "right", sort: (r) => r.top1?.share, render: (r) => f.pct(r.top1?.share) },
            { key: "t5", header: "Top-5 share", align: "right", hideBelow: "md", sort: (r) => r.top5Share, render: (r) => f.pct(r.top5Share) },
            { key: "h", header: "HHI", align: "right", sort: (r) => r.hhiValue, render: (r) => Math.round(r.hhiValue ?? 0) },
            { key: "b", header: "Reading", render: (r) => <span className="flex gap-1"><Badge tone={r.band === "Highly concentrated" ? "red" : r.band === "Moderately concentrated" ? "amber" : "green"}>{r.band}</Badge>{r.smallSample && <Badge>small n</Badge>}</span> },
          ]} />
      </Section>
      <Section index="03" title="Awardee directory" kicker="All companies with at least one award in the selection.">
        <DataTable rows={awardees} rowKey={(a) => a.id} rowHref={(a) => `/competitors/${a.id}`} pageSize={15} dense initialSort={{ key: "aw", dir: "desc" }}
          columns={[
            { key: "n", header: "Awardee", sort: (a) => a.name, render: (a) => <div><div className="font-medium">{a.name}</div><div className="text-[11.5px] text-ink-500">{a.sector}</div></div> },
            { key: "aw", header: "Awards", align: "right", sort: (a) => a.awards, render: (a) => a.awards },
            { key: "v", header: "Total value", align: "right", sort: (a) => a.value, render: (a) => f.mad(a.value, { unit: false }) },
            { key: "avg", header: "Avg. award", align: "right", hideBelow: "lg", sort: (a) => a.avg, render: (a) => f.mad(a.avg, { unit: false }) },
            { key: "b", header: "Buyers", align: "right", sort: (a) => a.buyers, render: (a) => a.buyers },
            { key: "r", header: "Repeat buyers", align: "right", sort: (a) => a.repeat, render: (a) => a.repeat },
            { key: "g", header: "Regions", align: "right", hideBelow: "md", sort: (a) => a.regions, render: (a) => a.regions },
            { key: "p", header: "Active period", hideBelow: "xl", sort: (a) => a.last, render: (a) => <span className="tnum text-[11.5px] text-ink-500">{f.shortDate(a.first)} → {f.shortDate(a.last)}</span> },
          ]} />
      </Section>
    </div>
  );
}
