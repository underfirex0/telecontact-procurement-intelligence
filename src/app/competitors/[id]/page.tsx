"use client";
import { t, tv } from "@/lib/i18n";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { FileText } from "lucide-react";
import { getContext } from "@/lib/services/data-service";
import { companyProfile, analyseQuality } from "@/lib/analytics";
import * as f from "@/lib/format";
import { BarList, MiniBars } from "@/components/charts";
import { DataTable } from "@/components/data-table";
import { Badge, ChartNote, DefList, Empty, Finding, Note, Section, SubHead, SyntheticTag } from "@/components/ui";

export default function CompetitorPage() {
  const { id } = useParams<{ id: string }>();
  const c = getContext();
  const p = useMemo(() => companyProfile(c, id), [c, id]);
  const dupEntity = useMemo(() => analyseQuality(c).duplicateEntities.find((d) => d.ids.includes(id)), [c, id]);
  if (!p) return <div className="p-8"><Empty title={t("Company not found")} /></div>;
  const co = c.company.get(id)!;
  const s = p.summary;

  return (
    <div>
      <header className="border-b border-line px-5 pb-6 pt-6 md:px-8">
        <div className="flex flex-wrap items-center gap-2"><span className="eyebrow">{t("Competitor intelligence profile")}</span><SyntheticTag /><Badge tone={s.role === "Verified awardee" ? "green" : s.role === "Participant" ? "blue" : s.role === "Shortlisted participant" ? "violet" : "neutral"}>{tv(s.role)}</Badge></div>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-[26px] font-semibold leading-tight">{co.name}</h1>
            <div className="mt-1 text-[13px] text-ink-600">{tv(s.primarySector)} · {co.city}, {s.region} · {tv(co.size)} · {t("founded {year}", { year: co.founded })}</div>
            <div className="mt-1 font-mono text-[11.5px] text-ink-500">ICE {co.ice} · {co.rc} <span className="font-sans">{t("(fictional identifiers)")}</span></div>
          </div>
          <Link href={`/reports?type=competitor&subject=${id}`} className="btn-primary"><FileText size={14} /> {t("Competitor report")}</Link>
        </div>
        {dupEntity && <div className="mt-4"><Note tone="warn">{t("Possible duplicate entity: {names} ({reason}). Award counts may be split between these records.", { names: dupEntity.names.join(" / "), reason: dupEntity.reason })}</Note></div>}
        {/* Participation vs award ledger — intentionally separated */}
        <div className="mt-5 grid gap-px overflow-hidden rounded-[6px] border border-line bg-line md:grid-cols-2">
          <div className="bg-white p-4">
            <div className="eyebrow mb-2">{t("Recorded participation")}</div>
            <div className="flex flex-wrap gap-x-8 gap-y-2">
              <div><div className="tnum text-[22px] font-semibold">{s.participations}</div><div className="text-[11.5px] text-ink-500">{t("bids recorded")}</div></div>
              <div><div className="tnum text-[22px] font-semibold">{s.decided}</div><div className="text-[11.5px] text-ink-500">{t("with decided outcome")}</div></div>
              <div><div className="tnum text-[22px] font-semibold">{s.winRate === null ? t("n/a") : f.pct(s.winRate)}</div><div className="text-[11.5px] text-ink-500">{t("win rate ({wins}/{decided})", { wins: s.wins, decided: s.decided })}</div></div>
              <div><div className="tnum text-[22px] font-semibold">{s.shortlisted}</div><div className="text-[11.5px] text-ink-500">{t("shortlisted")}</div></div>
            </div>
          </div>
          <div className="bg-white p-4">
            <div className="eyebrow mb-2">{t("Verified awards")}</div>
            <div className="flex flex-wrap gap-x-8 gap-y-2">
              <div><div className="tnum text-[22px] font-semibold">{s.awards}</div><div className="text-[11.5px] text-ink-500">{t("awards")}</div></div>
              <div><div className="tnum text-[22px] font-semibold">{f.mad(s.awardValue)}</div><div className="text-[11.5px] text-ink-500">{t("award value")}</div></div>
              <div><div className="tnum text-[22px] font-semibold">{s.buyers}</div><div className="text-[11.5px] text-ink-500">{t("awarding buyers · {n} repeat", { n: s.repeatBuyers })}</div></div>
              <div><div className="tnum text-[22px] font-semibold">{p.positioning.rankInSector ? `#${p.positioning.rankInSector}` : "—"}</div><div className="text-[11.5px] text-ink-500">{t("rank in {sector}", { sector: p.positioning.sectorLabel })}</div></div>
            </div>
          </div>
        </div>
      </header>

      <Section index="01" title={t("Competitive positioning")} kicker={t("Rule-based findings from awards, bids and head-to-head encounters.")}>
        <div className="space-y-2.5">{p.observations.map((o, i) => <Finding key={i} kind={o.evidence.length ? "metric" : "unknown"} evidence={o.evidence}>{o.text}</Finding>)}</div>
        <div className="mt-5"><DefList cols={4} items={[
          { k: t("Declared sectors"), v: co.sectorIds.map((x) => c.sector.get(x)?.name).join(", ") },
          { k: t("Services"), v: co.services.join(", ") },
          { k: t("Geographic coverage"), v: co.regionIds.map((r) => c.region.get(r)?.name).join(", ") },
          { k: t("Source"), v: tv(co.provenance.source) },
        ]} /></div>
      </Section>

      <Section index="02" title={t("Award history")} kicker={t("{v0} verified awards, most recent first.", { v0: p.awards.length })}>
        <div className="mb-4 flex items-end gap-8">
          <div><div className="mb-1 text-[11px] text-ink-500">{t("Awards per year")}</div><MiniBars values={p.byYear.map((y) => y.awards)} labels={p.byYear.map((y) => y.year)} height={40} /><div className="mt-1 flex gap-[3px] text-[9px] text-ink-400">{p.byYear.map((y) => <span key={y.year} className="w-3 text-center">{y.year.slice(2)}</span>)}</div></div>
          <div className="text-[12px] text-ink-500">{p.byYear.map((y) => `${y.year}: ${y.awards} (${f.mad(y.value)})`).join(" · ")}</div>
        </div>
        <DataTable rows={p.awards} rowKey={(a) => a.id} rowHref={(a) => `/opportunities/${a.opportunityId}`} dense pageSize={10} initialSort={{ key: "d", dir: "desc" }}
          empty={t("No recorded award. This company appears only as a participant.")}
          columns={[
            { key: "d", header: t("Award date"), sort: (a) => a.awardDate, render: (a) => <span className="tnum whitespace-nowrap text-[12px]">{f.shortDate(a.awardDate)}</span> },
            { key: "o", header: t("Tender"), render: (a) => <div><div className="font-mono text-[11px] text-accent-700">{a.reference}</div><div className="line-clamp-1 text-[12.5px]">{a.title}</div></div> },
            { key: "b", header: t("Buyer"), sort: (a) => a.buyer, render: (a) => <Link href={`/buyers/${a.buyerId}`} className="text-[12.5px] hover:text-accent-700">{a.buyer}</Link> },
            { key: "s", header: t("Sector"), hideBelow: "lg", render: (a) => <span className="text-[12px]">{a.sector}</span> },
            { key: "v", header: t("Amount"), align: "right", sort: (a) => a.amount, render: (a) => a.amount ? f.mad(a.amount, { unit: false }) : <span className="text-ink-400">{t("n/p")}</span> },
            { key: "du", header: t("Duration"), align: "right", hideBelow: "md", render: (a) => (a.durationMonths ? t("{n} m", { n: a.durationMonths }) : "—") },
          ]} />
      </Section>

      <div className="grid xl:grid-cols-2">
        <Section index="03" title={t("Buyer relationships")} wide className="xl:border-r">
          <DataTable rows={p.buyerRelationships} rowKey={(b) => b.id} rowHref={(b) => `/buyers/${b.id}`} dense pageSize={8}
            empty={t("No awarding buyers.")}
            columns={[
              { key: "n", header: t("Buyer"), render: (b) => <span className="text-[12.5px] font-medium">{b.name}</span> },
              { key: "a", header: t("Awards"), align: "right", sort: (b) => b.awards, render: (b) => b.awards },
              { key: "r", header: "", render: (b) => (b.repeat ? <Badge tone="green">{t("Repeat")}</Badge> : null) },
              { key: "p", header: t("Period"), hideBelow: "md", render: (b) => <span className="tnum text-[11.5px] text-ink-500">{f.shortDate(b.first)}{b.first !== b.last ? ` → ${f.shortDate(b.last)}` : ""}</span> },
            ]} />
        </Section>
        <Section index="04" title={t("Sector presence & regional activity")} wide>
          <SubHead>{t("Share of each sector's recorded awards")}</SubHead>
          <BarList rows={p.sectorPresence.map((x) => ({ key: x.key, label: x.label, value: x.shareOfSector * 100, display: `${x.awards}/${x.sectorAwards} · ${f.pct(x.shareOfSector)}`, sub: f.mad(x.value) }))} max={100} />
          <div className="mt-4"><SubHead>{t("Regions of awarded contracts")}</SubHead>
            <BarList rows={p.regionActivity.map((r) => ({ key: r.key, label: r.label, value: r.awards, display: r.awards }))} />
          </div>
          <ChartNote n={p.awards.length} unit={t("awards")} />
        </Section>
      </div>

      <Section index="05" title={t("Head-to-head")} kicker={t("Competitors met in the same disclosed bidder lists, and who won those encounters.")}>
        <DataTable rows={p.headToHead} rowKey={(h) => h.id} rowHref={(h) => `/competitors/${h.id}`} dense pageSize={10} initialSort={{ key: "m", dir: "desc" }}
          empty={t("No disclosed bidder list includes this company.")}
          columns={[
            { key: "n", header: t("Competitor"), render: (h) => <span className="font-medium">{h.name}</span> },
            { key: "m", header: t("Encounters"), align: "right", sort: (h) => h.meetings, render: (h) => h.meetings },
            { key: "w", header: t("We won"), align: "right", sort: (h) => h.weWon, render: (h) => h.weWon },
            { key: "t", header: t("They won"), align: "right", sort: (h) => h.theyWon, render: (h) => h.theyWon },
          ]} />
      </Section>

      <Section index="06" title={t("Participation record")} kicker={t("All recorded bids with outcome. Withdrawn and pending bids do not enter the win rate.")}>
        <DataTable rows={p.participations} rowKey={(x) => x.id} rowHref={(x) => `/opportunities/${x.opportunityId}`} dense pageSize={10}
          empty={t("No recorded participation (awards come from tenders without disclosed bidder lists).")}
          columns={[
            { key: "d", header: t("Submitted@@date"), sort: (x) => x.submittedOn, render: (x) => <span className="tnum text-[12px]">{f.shortDate(x.submittedOn)}</span> },
            { key: "o", header: t("Tender"), render: (x) => <div><div className="font-mono text-[11px] text-accent-700">{x.reference}</div><div className="line-clamp-1 text-[12.5px]">{x.title}</div></div> },
            { key: "b", header: t("Buyer"), hideBelow: "lg", render: (x) => <span className="text-[12px]">{x.buyer}</span> },
            { key: "a", header: t("Bid@@amount"), align: "right", sort: (x) => x.bidAmount, render: (x) => f.mad(x.bidAmount, { unit: false }) },
            { key: "out", header: t("Outcome"), sort: (x) => x.outcome, render: (x) => <Badge tone={x.outcome === "Awarded" ? "green" : x.outcome === "Shortlisted" ? "violet" : x.outcome === "Pending" ? "blue" : "neutral"}>{tv(x.outcome)}</Badge> },
            { key: "w", header: t("Awarded to"), hideBelow: "md", render: (x) => <span className="text-[12px] text-ink-600">{x.awardedTo.join(", ") || "—"}</span> },
          ]} />
      </Section>
    </div>
  );
}
