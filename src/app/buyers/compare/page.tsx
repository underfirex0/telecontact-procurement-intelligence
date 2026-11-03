"use client";
import { t, tk, tv } from "@/lib/i18n";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { X } from "lucide-react";
import { getContext } from "@/lib/services/data-service";
import { buyerProfile } from "@/lib/analytics";
import * as f from "@/lib/format";
import { MultiLine, SERIES } from "@/components/charts";
import { ChartNote, Empty, PageHeader, Section } from "@/components/ui";

function CompareInner() {
  const c = getContext();
  const sp = useSearchParams();
  const router = useRouter();
  const ids = (sp.get("ids") ?? "").split(",").filter((x) => c.buyer.has(x)).slice(0, 3);
  const profiles = useMemo(() => ids.map((id) => buyerProfile(c, id)!), [ids.join(","), c]); // eslint-disable-line react-hooks/exhaustive-deps
  const setIds = (next: string[]) => router.replace(`/buyers/compare?ids=${next.join(",")}`);
  const sectors = [...new Set(profiles.flatMap((p) => p.sectorMix.map((s) => s.key)))];
  const years = [2023, 2024, 2025, 2026];
  const trend = years.map((y) => {
    const row: Record<string, number | string> = { year: String(y) };
    profiles.forEach((p) => (row[p.summary.id] = p.perYear.find((x) => x.year === y)!.count));
    return row;
  });
  const metric = (label: string, get: (p: (typeof profiles)[number]) => React.ReactNode) => (
    <tr><td className="text-[12.5px] text-ink-600">{t(label)}</td>{profiles.map((p) => <td key={p.summary.id} className="tnum text-[13px] font-medium">{get(p)}</td>)}</tr>
  );

  return (
    <div>
      <PageHeader eyebrow={t("Buyer intelligence · comparison")} title={t("Compare contracting authorities")} description={t("Side-by-side activity, purchasing mix, value profile and supplier concentration.")}
        actions={<select className="field !h-8 !w-72" value="" disabled={ids.length >= 3} onChange={(e) => e.target.value && setIds([...ids, e.target.value])}>
          <option value="">{ids.length >= 3 ? t("Maximum 3 buyers") : t("+ Add buyer to comparison")}</option>
          {c.ds.buyers.filter((b) => !ids.includes(b.id)).map((b) => <option key={b.id} value={b.id}>{b.acronym} — {b.name}</option>)}
        </select>} />
      {profiles.length === 0 ? <div className="p-8"><Empty title={t("Select buyers to compare")} action={<Link className="btn" href="/buyers">{t("Go to buyers")}</Link>}>{t("Choose up to three buyers from the list or the selector above.")}</Empty></div> : (
        <>
          <Section index="01" title={t("Key metrics")} wide>
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead><tr><th style={{ width: 220 }}>{t("Metric")}</th>{profiles.map((p, i) => (
                  <th key={p.summary.id}><div className="flex items-start justify-between gap-2 normal-case tracking-normal"><span className="flex items-start gap-1.5"><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: SERIES[i] }} /><Link href={`/buyers/${p.summary.id}`} className="text-[13px] font-semibold text-ink-900 hover:text-accent-700">{p.summary.name}</Link></span><button onClick={() => setIds(ids.filter((x) => x !== p.summary.id))} className="text-ink-400 hover:text-ink-900" aria-label={t("Remove")}><X size={13} /></button></div></th>
                ))}</tr></thead>
                <tbody>
                  {metric(tk("Type · city"), (p) => `${tv(p.summary.type)} · ${p.summary.city}`)}
                  {metric(tk("Opportunities (all)"), (p) => p.summary.opportunities)}
                  {metric(tk("Active now"), (p) => p.summary.active)}
                  {metric(tk("Publication rate / year"), (p) => f.num(p.publicationFrequency.perYear, 1))}
                  {metric(tk("Median publication gap"), (p) => (p.publicationFrequency.medianGapDays !== null ? t("{n} days", { n: Math.round(p.publicationFrequency.medianGapDays) }) : "—"))}
                  {metric(tk("Median estimated value"), (p) => f.mad(p.values.median))}
                  {metric(tk("Largest estimated value"), (p) => f.mad(p.values.max))}
                  {metric(tk("Main sector"), (p) => `${p.sectorMix[0]?.label ?? "—"} (${f.pct(p.sectorMix[0]?.share)})`)}
                  {metric(tk("Recurring purchasing lines"), (p) => p.recurring.length)}
                  {metric(tk("Recorded awards / awardees"), (p) => `${p.awardsTotal} / ${p.awardees.length}`)}
                  {metric(tk("Leading awardee share"), (p) => (p.awardees[0] ? `${f.pct(p.awardees[0].share)} · ${p.awardees[0].name}` : "—"))}
                  {metric(tk("Cancelled / unsuccessful rate"), (p) => (p.cancellationRate === null ? "n/a (<3 decided)" : f.pct(p.cancellationRate)))}
                </tbody>
              </table>
            </div>
          </Section>
          <Section index="02" title={t("Publication volume by year")} kicker={t("Number of opportunities published per calendar year (2026 to 2 Nov).")}>
            <MultiLine data={trend} xKey="year" series={profiles.map((p, i) => ({ key: p.summary.id, label: p.summary.acronym, color: SERIES[i] }))} height={220} />
            <ChartNote n={profiles.reduce((a, p) => a + p.opportunities.length, 0)} period="2023 – 2026" />
          </Section>
          <Section index="03" title={t("Purchasing mix")} kicker={t("Share of each buyer's opportunities by sector. Overlap indicates buyers purchasing similar services.")}>
            <table className="tbl dense">
              <thead><tr><th>{t("Sector")}</th>{profiles.map((p) => <th key={p.summary.id} className="!text-right">{p.summary.acronym}</th>)}</tr></thead>
              <tbody>{sectors.map((s) => (
                <tr key={s}><td>{s === "unclassified" ? "Unclassified" : c.sector.get(s)?.name}</td>{profiles.map((p, i) => {
                  const m = p.sectorMix.find((x) => x.key === s);
                  return <td key={p.summary.id} className="text-right"><div className="flex items-center justify-end gap-2"><span className="tnum text-[12px]">{m ? `${m.count} · ${f.pct(m.share)}` : "—"}</span><span className="inline-block h-1.5 w-16 rounded-full bg-canvas-sunken"><span className="block h-full rounded-full" style={{ width: `${(m?.share ?? 0) * 100}%`, background: SERIES[i] }} /></span></div></td>;
                })}</tr>
              ))}</tbody>
            </table>
          </Section>
        </>
      )}
    </div>
  );
}

export default function ComparePage() {
  return <Suspense><CompareInner /></Suspense>;
}
