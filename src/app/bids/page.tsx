"use client";
import { t, tv } from "@/lib/i18n";
import Link from "next/link";
import { useMemo } from "react";
import { getContext } from "@/lib/services/data-service";
import { useSuppliers, useWorkspace } from "@/lib/services/workspace";
import { buildDossier } from "@/lib/analytics";
import { diffDays } from "@/lib/dates";
import * as f from "@/lib/format";
import { DataTable } from "@/components/data-table";
import { SaveButton } from "@/components/common";
import { Badge, Empty, FigureStrip, Meter, PageHeader, Section, StatusBadge, scoreTone } from "@/components/ui";

export default function BidsPage() {
  const c = getContext();
  const suppliers = useSuppliers();
  const { state, hydrated } = useWorkspace();
  const rows = useMemo(() => {
    if (!hydrated) return [];
    const ids = [...new Set([...Object.keys(state.saved), ...Object.keys(state.assessments)])];
    return ids.map((id) => {
      const o = c.opp.get(id)!;
      return { o, saved: state.saved[id], a: state.assessments[id], d: buildDossier(c, id, suppliers)! };
    }).filter((r) => r.o);
  }, [c, state.saved, state.assessments, hydrated, suppliers]);
  const suggestions = useMemo(() => c.clean.filter((o) => (o.status === "Open" || o.status === "Closing soon") && !(hydrated && (state.saved[o.id] || state.assessments[o.id])))
    .map((o) => ({ o, d: buildDossier(c, o.id, suppliers)! })).filter((x) => x.d.readiness.posture === "Pursue" || x.d.readiness.posture === "Pursue with partner")
    .sort((a, b) => b.d.readiness.score - a.d.readiness.score).slice(0, 6), [c, state.saved, state.assessments, hydrated, suppliers]);
  const decided = rows.filter((r) => r.a?.decision === "Bid" || r.a?.decision === "No-bid");

  return (
    <div>
      <PageHeader eyebrow={t("Module 11 · Bid intelligence workspace")} title={t("Bid workspace")}
        description={t("Saved opportunities under internal evaluation: team assessment, bid / no-bid decision, owners, checklists and follow-up dates — alongside the computed dossier readiness.")} />
      <div className="px-5 pt-5 md:px-8">
        <FigureStrip items={[
          { label: t("In workspace"), value: rows.length, sub: t("saved or assessed") },
          { label: t("Under assessment"), value: rows.filter((r) => r.a && r.a.stage !== "Decided").length, sub: t("screening → review") },
          { label: t("Decided: bid"), value: rows.filter((r) => r.a?.decision === "Bid").length, sub: t("{v0} no-bid", { v0: rows.filter((r) => r.a?.decision === "No-bid").length }) },
          { label: t("Deadlines ≤ 14 days"), value: rows.filter((r) => r.o.deadline && diffDays(r.o.deadline, c.ref) >= 0 && diffDays(r.o.deadline, c.ref) <= 14).length, sub: t("in workspace"), tone: "warn" },
          { label: t("Follow-ups due"), value: rows.filter((r) => r.a?.followUpDate && r.a.followUpDate <= c.ref).length, sub: t("assessment follow-ups") },
        ]} />
      </div>
      <Section index="01" title={t("Opportunities in evaluation")} wide>
        {rows.length === 0 ? (
          <Empty title={t("No opportunity in the workspace yet")} action={<Link className="btn-primary" href="/opportunities?status=active">{t("Browse active opportunities")}</Link>}>{t("Save an opportunity or start a bid assessment from any dossier. Suggestions below come from the dossier engine.")}</Empty>
        ) : (
          <DataTable rows={rows} rowKey={(r) => r.o.id} rowHref={(r) => `/bids/${r.o.id}`} pageSize={15} initialSort={{ key: "dl", dir: "asc" }}
            columns={[
              { key: "o", header: t("Opportunity"), width: "34%", render: (r) => <div><div className="font-mono text-[11px] text-accent-700">{r.o.reference}</div><div className="line-clamp-1 text-[13px]">{r.o.title}</div><div className="text-[11.5px] text-ink-500">{c.buyer.get(r.o.buyerId ?? "")?.acronym ?? "—"} · {f.mad(r.o.estimatedValue)}</div></div> },
              { key: "dl", header: t("Deadline"), sort: (r) => r.o.deadline, render: (r) => <div className="tnum text-[12.5px]">{f.shortDate(r.o.deadline)}<div className="text-[11px] text-ink-500">{r.d.timing.daysToDeadline !== null ? (r.d.timing.daysToDeadline >= 0 ? `${r.d.timing.daysToDeadline} d left` : "closed") : ""}</div></div> },
              { key: "st", header: t("Status"), render: (r) => <StatusBadge status={r.o.status} /> },
              { key: "tr", header: t("Tracking"), sort: (r) => r.saved?.tracking, render: (r) => <span className="text-[12.5px]">{r.saved?.tracking ?? "—"}</span> },
              { key: "stage", header: t("Assessment"), sort: (r) => r.a?.stage, render: (r) => (r.a ? <span className="text-[12.5px]">{tv(r.a.stage)} · {r.a.checklist.filter((x) => x.done).length}/{r.a.checklist.length}</span> : <span className="text-[12px] text-ink-400">{t("Not started")}</span>) },
              { key: "dec", header: t("Decision"), sort: (r) => r.a?.decision, render: (r) => r.a ? <Badge tone={r.a.decision === "Bid" ? "green" : r.a.decision === "No-bid" ? "red" : r.a.decision === "Watch" ? "violet" : "amber"}>{tv(r.a.decision)}</Badge> : null },
              { key: "own", header: t("Owner"), hideBelow: "lg", render: (r) => <span className="text-[12px]">{r.a?.responsible || "—"}</span> },
              { key: "rd", header: t("Readiness"), sort: (r) => r.d.readiness.score, render: (r) => <div className="w-24"><div className="tnum text-[12px] font-semibold">{r.d.readiness.score}</div><Meter value={r.d.readiness.score} tone={scoreTone(r.d.readiness.score)} /></div> },
              { key: "sv", header: "", render: (r) => <SaveButton id={r.o.id} compact /> },
            ]} />
        )}
        {decided.length > 0 && <div className="mt-3 text-[12px] text-ink-500">{t("{n} decision(s) recorded.", { n: decided.length })}</div>}
      </Section>
      <Section index="02" title={t("Suggested for evaluation")} kicker={t("Active opportunities the dossier engine rates “Pursue” or “Pursue with partner” that are not yet in the workspace.")}>
        <div className="divide-y divide-line-soft">
          {suggestions.map(({ o, d }) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <Link href={`/opportunities/${o.id}`} className="min-w-0 flex-1 hover:text-accent-700"><div className="font-mono text-[11px] text-accent-700">{o.reference}</div><div className="truncate text-[13px]">{o.title}</div></Link>
              <div className="flex items-center gap-3"><span className="tnum text-[12px] text-ink-500">{t("closes")} {f.shortDate(o.deadline)}</span><Badge tone={d.readiness.posture === "Pursue" ? "green" : "blue"}>{tv(d.readiness.posture)} · {d.readiness.score}</Badge><Link className="btn btn-sm" href={`/bids/${o.id}`}>{t("Assess")}</Link></div>
            </div>
          ))}
          {suggestions.length === 0 && <div className="py-4 text-[13px] text-ink-500">{t("No further suggestions.")}</div>}
        </div>
      </Section>
    </div>
  );
}
