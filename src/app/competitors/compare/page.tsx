"use client";
import { t, tk, tv } from "@/lib/i18n";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { X } from "lucide-react";
import { getContext } from "@/lib/services/data-service";
import { companyProfile } from "@/lib/analytics";
import * as f from "@/lib/format";
import { SERIES, StackedBars } from "@/components/charts";
import { ChartNote, Empty, PageHeader, Section } from "@/components/ui";

function Inner() {
  const c = getContext();
  const sp = useSearchParams();
  const router = useRouter();
  const ids = (sp.get("ids") ?? "").split(",").filter((x) => c.company.has(x)).slice(0, 3);
  const ps = useMemo(() => ids.map((id) => companyProfile(c, id)!), [ids.join(","), c]); // eslint-disable-line react-hooks/exhaustive-deps
  const setIds = (n: string[]) => router.replace(`/competitors/compare?ids=${n.join(",")}`);
  const row = (label: string, get: (p: (typeof ps)[number]) => React.ReactNode) => <tr><td className="text-[12.5px] text-ink-600">{t(label)}</td>{ps.map((p) => <td key={p.summary.id} className="tnum text-[13px] font-medium">{get(p)}</td>)}</tr>;
  const years = ["2023", "2024", "2025", "2026"].map((y) => {
    const r: Record<string, string | number> = { year: y };
    ps.forEach((p) => (r[p.summary.id] = p.byYear.find((b) => b.year === y)!.awards));
    return r;
  });
  // shared buyers
  const sharedBuyers = ps.length > 1 ? ps[0].buyerRelationships.filter((b) => ps.slice(1).every((p) => p.buyerRelationships.some((x) => x.id === b.id))) : [];
  return (
    <div>
      <PageHeader eyebrow={t("Competitor intelligence · comparison")} title={t("Compare competitors")}
        actions={<select className="field !h-8 !w-72" value="" disabled={ids.length >= 3} onChange={(e) => e.target.value && setIds([...ids, e.target.value])}>
          <option value="">{ids.length >= 3 ? t("Maximum 3 companies") : t("+ Add company")}</option>
          {c.ds.companies.filter((x) => !ids.includes(x.id)).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>} />
      {!ps.length ? <div className="p-8"><Empty title={t("Select companies to compare")} action={<Link className="btn" href="/competitors">{t("Go to competitors")}</Link>} /></div> : (
        <>
          <Section index="01" title={t("Bids versus awards")} wide>
            <div className="overflow-x-auto"><table className="tbl">
              <thead><tr><th style={{ width: 220 }}>{t("Metric")}</th>{ps.map((p, i) => <th key={p.summary.id}><div className="flex items-start justify-between gap-2 normal-case tracking-normal"><span className="flex items-start gap-1.5"><span className="mt-1 h-2.5 w-2.5 rounded-[2px]" style={{ background: SERIES[i] }} /><Link href={`/competitors/${p.summary.id}`} className="text-[13px] font-semibold text-ink-900">{p.summary.name}</Link></span><button onClick={() => setIds(ids.filter((x) => x !== p.summary.id))} aria-label={t("Remove")}><X size={13} /></button></div></th>)}</tr></thead>
              <tbody>
                {row(tk("Primary sector"), (p) => p.summary.primarySector)}
                {row(tk("Role"), (p) => tv(p.summary.role))}
                {row(tk("Recorded bids"), (p) => p.summary.participations)}
                {row(tk("Win rate (decided bids)"), (p) => (p.summary.winRate === null ? t("n/a") : `${f.pct(p.summary.winRate)} (${p.summary.wins}/${p.summary.decided})`))}
                {row(tk("Verified awards"), (p) => p.summary.awards)}
                {row(tk("Award value"), (p) => f.mad(p.summary.awardValue))}
                {row(tk("Awarding buyers / repeat"), (p) => `${p.summary.buyers} / ${p.summary.repeatBuyers}`)}
                {row(tk("Rank in primary sector"), (p) => (p.positioning.rankInSector ? t("#{rank} of {n}", { rank: p.positioning.rankInSector, n: p.positioning.sectorAwardees }) : "—"))}
                {row(tk("Regions with awards"), (p) => p.summary.regions)}
                {row(tk("Last award"), (p) => f.date(p.summary.lastAward))}
              </tbody>
            </table></div>
          </Section>
          <Section index="02" title={t("Awards per year")}>
            <StackedBars data={years} xKey="year" series={ps.map((p, i) => ({ key: p.summary.id, label: p.summary.name, color: SERIES[i] }))} height={220} />
            <ChartNote n={ps.reduce((a, p) => a + p.awards.length, 0)} unit={t("awards")} period="2023 – 2026" />
          </Section>
          {ps.length > 1 && <Section index="03" title={t("Shared buyers")} kicker={t("Buyers that have awarded contracts to every selected company.")}>
            {sharedBuyers.length ? <ul className="space-y-1">{sharedBuyers.map((b) => <li key={b.id}><Link className="link" href={`/buyers/${b.id}`}>{b.name}</Link></li>)}</ul> : <div className="text-[13px] text-ink-500">{t("No buyer has awarded all selected companies.")}</div>}
          </Section>}
        </>
      )}
    </div>
  );
}
export default function Page() {
  return <Suspense><Inner /></Suspense>;
}
