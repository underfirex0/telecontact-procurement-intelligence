"use client";
import { t, tv } from "@/lib/i18n";
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
      <PageHeader eyebrow={t("Module 05 · Awardee intelligence")} title={t("Who receives the contracts")}
        description={t("Companies with verified (synthetic) awards — organised by sector, buyer, region, volume and value. Explore which companies dominate each segment.")}
        actions={<button className="btn" onClick={exportCsv}><Download size={14} /> {t("Export awards CSV")}</button>} />
      <MarketFilterBar mf={mf} right={<SelectFilter label={t("Awarding buyer")} value={buyer} onChange={setBuyer} width="w-56" options={[{ value: "", label: t("All buyers") }, ...c.ds.buyers.map((b) => ({ value: b.id, label: `${b.acronym} — ${b.name}` }))]} />} />
      <div className="px-5 pt-5 md:px-8">
        <FigureStrip items={[
          { label: t("Awards in selection"), value: awards.length, sub: t("{v0} without published amount", { v0: awards.filter((a) => a.amount === null).length }) },
          { label: t("Distinct awardees"), value: awardees.length, sub: t("{v0} with 2+ awards", { v0: awardees.filter((a) => a.awards >= 2).length }) },
          { label: t("Total award value"), value: f.mad(totalValue), sub: t("median {v0}", { v0: f.mad([...awards.map((a) => a.amount ?? 0)].sort((a, b) => a - b)[Math.floor(awards.length / 2)]) }) },
          { label: t("Repeat relationships"), value: awardees.reduce((a, x) => a + x.repeat, 0), sub: t("awardee × buyer pairs with ≥2 awards") },
        ]} />
      </div>
      <Section index="01" title={t("Leading awardees")} kicker={t("Ranking by number of awards or by total award value. Value excludes awards whose amount was not published.")}
        actions={<Tabs value={rank} onChange={setRank} tabs={[{ id: "awards", label: t("By awards") }, { id: "value", label: t("By value") }]} />}>
        <BarList showRank labelWidth="w-[38%]" rows={ranked.map((a) => ({ key: a.id, label: a.name, href: `/competitors/${a.id}`, sub: a.repeat ? t("{sector} · {n} buyer(s) · {r} repeat", { sector: a.sector, n: a.buyers, r: a.repeat }) : t("{sector} · {n} buyer(s)", { sector: a.sector, n: a.buyers }), value: rank === "awards" ? a.awards : a.value, display: rank === "awards" ? `${a.awards} · ${f.pct(a.share)}` : f.mad(a.value) }))} />
        <ChartNote n={awards.length} unit={t("awards")} period={mf.periodLabel} note={t("period filters on tender publication date")} />
      </Section>
      <Section index="02" title={t("Sector dominance")} kicker={t("For each sector: the leading awardee by award value, its share, top-5 share and HHI. Small samples (<8 awards) are flagged.")}>
        <DataTable rows={sectors} rowKey={(r) => r.key} dense pageSize={20} initialSort={{ key: "aw", dir: "desc" }}
          columns={[
            { key: "s", header: t("Sector"), sort: (r) => r.label, render: (r) => <Link href={`/market?sector=${r.key}`} className="font-medium hover:text-accent-700">{r.label}</Link> },
            { key: "aw", header: t("Awards"), align: "right", sort: (r) => r.awards, render: (r) => r.awards },
            { key: "n", header: t("Awardees"), align: "right", sort: (r) => r.awardees, render: (r) => r.awardees },
            { key: "t", header: t("Leading awardee"), render: (r) => r.top1 ? <Link href={`/competitors/${r.top1.id}`} className="hover:text-accent-700">{r.top1.name}</Link> : "—" },
            { key: "ts", header: t("Lead share"), align: "right", sort: (r) => r.top1?.share, render: (r) => f.pct(r.top1?.share) },
            { key: "t5", header: t("Top-5 share"), align: "right", hideBelow: "md", sort: (r) => r.top5Share, render: (r) => f.pct(r.top5Share) },
            { key: "h", header: t("HHI"), align: "right", sort: (r) => r.hhiValue, render: (r) => Math.round(r.hhiValue ?? 0) },
            { key: "b", header: t("Reading"), render: (r) => <span className="flex gap-1"><Badge tone={r.band === "Highly concentrated" ? "red" : r.band === "Moderately concentrated" ? "amber" : "green"}>{tv(r.band)}</Badge>{r.smallSample && <Badge>{t("small n")}</Badge>}</span> },
          ]} />
      </Section>
      <Section index="03" title={t("Awardee directory")} kicker={t("All companies with at least one award in the selection.")}>
        <DataTable rows={awardees} rowKey={(a) => a.id} rowHref={(a) => `/competitors/${a.id}`} pageSize={15} dense initialSort={{ key: "aw", dir: "desc" }}
          columns={[
            { key: "n", header: t("Awardee"), sort: (a) => a.name, render: (a) => <div><div className="font-medium">{a.name}</div><div className="text-[11.5px] text-ink-500">{a.sector}</div></div> },
            { key: "aw", header: t("Awards"), align: "right", sort: (a) => a.awards, render: (a) => a.awards },
            { key: "v", header: t("Total value"), align: "right", sort: (a) => a.value, render: (a) => f.mad(a.value, { unit: false }) },
            { key: "avg", header: t("Avg. award"), align: "right", hideBelow: "lg", sort: (a) => a.avg, render: (a) => f.mad(a.avg, { unit: false }) },
            { key: "b", header: t("Buyers"), align: "right", sort: (a) => a.buyers, render: (a) => a.buyers },
            { key: "r", header: t("Repeat buyers"), align: "right", sort: (a) => a.repeat, render: (a) => a.repeat },
            { key: "g", header: t("Regions"), align: "right", hideBelow: "md", sort: (a) => a.regions, render: (a) => a.regions },
            { key: "p", header: t("Active period"), hideBelow: "xl", sort: (a) => a.last, render: (a) => <span className="tnum text-[11.5px] text-ink-500">{f.shortDate(a.first)} → {f.shortDate(a.last)}</span> },
          ]} />
      </Section>
    </div>
  );
}
