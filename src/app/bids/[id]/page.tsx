"use client";
import { t, tk, tv } from "@/lib/i18n";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, FileText, Plus, Save, Trash2 } from "lucide-react";
import { getContext } from "@/lib/services/data-service";
import { CURRENT_USER, useSuppliers, useWorkspace } from "@/lib/services/workspace";
import { buildDossier } from "@/lib/analytics";
import { addDays } from "@/lib/dates";
import { TEAM } from "@/lib/data/reference";
import type { BidAssessment, BidDecision } from "@/lib/types";
import * as f from "@/lib/format";
import { Badge, Empty, Meter, RiskBadge, StatusBadge, SubHead, clsx, scoreTone } from "@/components/ui";

const SCORE_LABELS: { key: keyof BidAssessment["scores"]; label: string; hint: string; map: string }[] = [
  { key: "commercial", label: tk("Commercial attractiveness"), hint: tk("Value, margin potential, strategic fit"), map: "commercial" },
  { key: "sectorRelevance", label: tk("Sector relevance"), hint: tk("How core this sector is for us"), map: "" },
  { key: "buyer", label: tk("Buyer assessment"), hint: tk("Relationship, payment and procedure reliability"), map: "buyer" },
  { key: "competition", label: tk("Competitor assessment"), hint: tk("Incumbent strength, field size (5 = favourable)"), map: "openness" },
  { key: "supplierAvailability", label: tk("Supplier availability"), hint: tk("Partners able to execute"), map: "suppliers" },
  { key: "technicalFit", label: tk("Technical requirements fit"), hint: tk("Ability to meet qualifications and specs"), map: "" },
];
const STAGES: BidAssessment["stage"][] = ["Screening", "Assessment", "Review", "Decided"];
const STD_DOCS = ["Dossier administratif (déclaration sur l'honneur)", "Attestation fiscale", "Attestation CNSS", "Registre de commerce", "Caution provisoire", "Références techniques", "Offre technique", "Offre financière (BPU / DE)"];

export default function BidAssessmentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const c = getContext();
  const suppliers = useSuppliers();
  const { state, dispatch, hydrated, toast } = useWorkspace();
  const d = useMemo(() => buildDossier(c, id, suppliers), [c, id, suppliers]);
  const [a, setA] = useState<BidAssessment | null>(null);
  const [newItem, setNewItem] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!hydrated || !d) return;
    const existing = state.assessments[id];
    if (existing) { setA(existing); return; }
    const comp = (k: string) => d.readiness.components.find((x) => x.key === k)?.score ?? 50;
    const to5 = (v: number) => Math.max(1, Math.min(5, Math.round(v / 20)));
    setA({
      opportunityId: id, decision: "Pending",
      scores: { commercial: to5(comp("commercial")), sectorRelevance: 3, buyer: to5(comp("buyer")), competition: to5(comp("openness")), supplierAvailability: to5(comp("suppliers")), technicalFit: 3 },
      technicalRequirements: d.opp.requirements.join("\n"),
      requiredDocuments: STD_DOCS.slice(0, d.opp.provisionalGuarantee ? 8 : 7).filter((x) => d.opp.provisionalGuarantee || !x.startsWith("Caution")),
      risks: d.risks.map((r) => `[${tv(r.level)}] ${r.title}: ${r.detail}`).join("\n"),
      notes: "",
      checklist: [
        { id: "c1", label: t("Download and read RC / CPS"), done: false, owner: TEAM[3], due: d.opp.deadline ? addDays(d.opp.deadline, -15) : null },
        { id: "c2", label: t("Confirm execution partner availability"), done: false, owner: TEAM[2], due: d.opp.deadline ? addDays(d.opp.deadline, -12) : null },
        { id: "c3", label: t("Request provisional guarantee from bank"), done: false, owner: TEAM[3], due: d.opp.deadline ? addDays(d.opp.deadline, -10) : null },
        { id: "c4", label: t("Prepare technical offer"), done: false, owner: TEAM[3], due: d.opp.deadline ? addDays(d.opp.deadline, -5) : null },
        { id: "c5", label: t("Pricing review and sign-off"), done: false, owner: TEAM[1], due: d.opp.deadline ? addDays(d.opp.deadline, -3) : null },
      ],
      responsible: TEAM[3], followUpDate: addDays(c.ref, 3), stage: "Screening", updatedAt: new Date().toISOString(),
    });
  }, [hydrated, d, id, state.assessments, c.ref]);

  if (!d) return <div className="p-8"><Empty title={t("Opportunity not found")} /></div>;
  if (!a) return <div className="p-8 text-sm text-ink-500">{t("Loading workspace…")}</div>;
  const o = d.opp;
  const upd = (p: Partial<BidAssessment>) => { setA({ ...a, ...p }); setDirty(true); };
  const teamScore = Math.round((Object.values(a.scores).reduce((x, y) => x + y, 0) / 30) * 100);
  const save = (extra?: Partial<BidAssessment>) => {
    const next = { ...a, ...extra, updatedAt: new Date().toISOString() };
    setA(next);
    dispatch({ type: "saveAssessment", assessment: next });
    if (next.decision === "Bid") dispatch({ type: "setTracking", opportunityId: id, tracking: "Preparing bid" });
    if (next.decision === "No-bid") dispatch({ type: "setTracking", opportunityId: id, tracking: "Dropped" });
    setDirty(false);
    toast(t("Assessment saved{v0}", { v0: extra?.decision ? ` · decision ${tv(extra.decision)}` : "" }));
  };
  const exists = !!state.assessments[id];

  return (
    <div>
      <header className="border-b border-line px-5 pb-5 pt-6 md:px-8">
        <div className="flex flex-wrap items-center gap-2"><span className="eyebrow">{t("Bid assessment")}</span><span className="font-mono text-[11px] text-accent-700">{o.reference}</span><StatusBadge status={o.status} />{dirty && <Badge tone="amber">{t("Unsaved changes")}</Badge>}</div>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl"><h1 className="font-serif text-[24px] font-semibold leading-tight">{o.title}</h1>
            <div className="mt-1 text-[13px] text-ink-600">{c.buyer.get(o.buyerId ?? "")?.name ?? t("Unidentified buyer")} · {f.mad(o.estimatedValue)} · {t("deadline {date}", { date: f.date(o.deadline) })}{d.timing.daysToDeadline !== null && d.timing.daysToDeadline >= 0 ? t(" ({v0} days)", { v0: d.timing.daysToDeadline }) : ""}</div></div>
          <div className="flex flex-wrap gap-2">
            <Link className="btn" href={`/opportunities/${id}`}>{t("Dossier")} <ArrowUpRight size={13} /></Link>
            <Link className="btn" href={`/reports?type=bid&subject=${id}`}><FileText size={14} /> {t("Bid readiness report")}</Link>
            {exists && <button className="btn" onClick={() => { if (confirm(t("Delete this assessment?"))) { dispatch({ type: "deleteAssessment", opportunityId: id }); toast(t("Assessment deleted")); router.push("/bids"); } }}><Trash2 size={14} /></button>}
            <button className="btn-primary" onClick={() => save()}><Save size={14} /> {t("Save assessment")}</button>
          </div>
        </div>
        <div className="mt-5 flex overflow-x-auto">
          {STAGES.map((st, i) => (
            <button key={st} onClick={() => upd({ stage: st })} className={clsx("min-w-[120px] flex-1 border-t-[3px] px-2 pt-2 text-left text-[12px]", i < STAGES.indexOf(a.stage) ? "border-accent text-ink-700" : st === a.stage ? "border-ink-900 font-semibold" : "border-line-strong text-ink-400 hover:text-ink-700")}>
              <span className="font-mono text-[10px] text-ink-400">{i + 1}</span> {st}
            </button>
          ))}
        </div>
      </header>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 border-line px-5 py-6 md:px-8 xl:border-r">
          <SubHead right={t("1 = weak · 5 = strong")}>{t("Team scoring")}</SubHead>
          <div className="space-y-3">
            {SCORE_LABELS.map((s) => {
              const computed = s.map ? d.readiness.components.find((x) => x.key === s.map) : null;
              return (
                <div key={s.key} className="grid items-center gap-3 md:grid-cols-[230px_1fr_150px]">
                  <div><div className="text-[13px] font-medium">{t(s.label)}</div><div className="text-[11.5px] text-ink-500">{t(s.hint)}</div></div>
                  <div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => upd({ scores: { ...a.scores, [s.key]: n } })} className={clsx("h-8 w-10 rounded-[4px] border text-[13px] font-medium", a.scores[s.key] === n ? "border-ink-900 bg-ink-900 text-white" : a.scores[s.key] > n ? "border-accent-100 bg-accent-50 text-accent-800" : "border-line-strong text-ink-500 hover:border-ink-400")}>{n}</button>)}</div>
                  <div className="text-[11.5px] text-ink-500">{computed ? <>{t("Dossier:")} <b className="tnum text-ink-800">{computed.score}</b>/100</> : "No computed equivalent"}</div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <label><span className="label">{t("Technical requirements")}</span><textarea rows={6} className="field" value={a.technicalRequirements} onChange={(e) => upd({ technicalRequirements: e.target.value })} /></label>
            <label><span className="label">{t("Risks")}</span><textarea rows={6} className="field" value={a.risks} onChange={(e) => upd({ risks: e.target.value })} /></label>
          </div>

          <div className="mt-6">
            <SubHead right={t("{v0} documents", { v0: a.requiredDocuments.length })}>{t("Required documents")}</SubHead>
            <div className="flex flex-wrap gap-1.5">
              {STD_DOCS.map((doc) => { const on = a.requiredDocuments.includes(doc); return <button key={doc} onClick={() => upd({ requiredDocuments: on ? a.requiredDocuments.filter((x) => x !== doc) : [...a.requiredDocuments, doc] })} className={clsx("rounded-[4px] border px-2 py-1 text-[12px]", on ? "border-ink-900 bg-ink-900 text-white" : "border-line-strong text-ink-500 hover:text-ink-900")}>{doc}</button>; })}
            </div>
          </div>

          <div className="mt-6">
            <SubHead right={`${a.checklist.filter((x) => x.done).length}/${a.checklist.length} done`}>{t("Action checklist")}</SubHead>
            <div className="divide-y divide-line-soft">
              {a.checklist.map((it) => (
                <div key={it.id} className="grid items-center gap-2 py-1.5 md:grid-cols-[1fr_200px_140px_28px]">
                  <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={it.done} onChange={(e) => upd({ checklist: a.checklist.map((x) => (x.id === it.id ? { ...x, done: e.target.checked } : x)) })} /><span className={clsx(it.done && "text-ink-400 line-through")}>{it.label}</span></label>
                  <select className="field !h-7 !text-[12px]" value={it.owner} onChange={(e) => upd({ checklist: a.checklist.map((x) => (x.id === it.id ? { ...x, owner: e.target.value } : x)) })}>{[...TEAM, CURRENT_USER].map((tx) => <option key={tx} value={tx}>{tv(tx)}</option>)}</select>
                  <input type="date" className={clsx("field !h-7 !text-[12px]", it.due && !it.done && it.due < c.ref && "!border-signal-bad")} value={it.due ?? ""} onChange={(e) => upd({ checklist: a.checklist.map((x) => (x.id === it.id ? { ...x, due: e.target.value || null } : x)) })} />
                  <button className="btn-ghost !h-7 !px-1" aria-label={t("Remove item")} onClick={() => upd({ checklist: a.checklist.filter((x) => x.id !== it.id) })}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2"><input className="field !h-8 max-w-sm" placeholder={t("New action…")} value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newItem.trim()) { upd({ checklist: [...a.checklist, { id: `c${Date.now()}`, label: newItem.trim(), done: false, owner: a.responsible, due: null }] }); setNewItem(""); } }} />
              <button className="btn" disabled={!newItem.trim()} onClick={() => { upd({ checklist: [...a.checklist, { id: `c${Date.now()}`, label: newItem.trim(), done: false, owner: a.responsible, due: null }] }); setNewItem(""); }}><Plus size={14} /> {t("Add")}</button></div>
          </div>

          <label className="mt-6 block"><span className="label">{t("Internal notes")}</span><textarea rows={4} className="field" value={a.notes} onChange={(e) => upd({ notes: e.target.value })} placeholder={t("Discussion, assumptions, open questions…")} /></label>
        </div>

        <aside className="min-w-0 px-5 py-6">
          <SubHead>{t("Decision")}</SubHead>
          <div className="grid grid-cols-2 gap-1.5">
            {(["Bid", "No-bid", "Watch", "Pending"] as BidDecision[]).map((dec) => (
              <button key={dec} onClick={() => save({ decision: dec, stage: dec === "Pending" ? a.stage : "Decided" })} className={clsx("h-9 rounded-[5px] border text-[13px] font-medium", a.decision === dec ? (dec === "Bid" ? "border-signal-good bg-signal-good text-white" : dec === "No-bid" ? "border-signal-bad bg-signal-bad text-white" : "border-ink-900 bg-ink-900 text-white") : "border-line-strong hover:border-ink-400")}>{tv(dec)}</button>
            ))}
          </div>
          <div className="mt-2 text-[11.5px] text-ink-500">{t("Choosing a decision saves immediately and moves the workflow to “Decided”.")}</div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div><div className="text-[11px] text-ink-500">{t("Team score")}</div><div className="tnum text-[26px] font-semibold">{teamScore}</div><Meter value={teamScore} tone={scoreTone(teamScore)} /></div>
            <div><div className="text-[11px] text-ink-500">{t("Dossier readiness")}</div><div className="tnum text-[26px] font-semibold">{d.readiness.score}</div><Meter value={d.readiness.score} tone={scoreTone(d.readiness.score)} /></div>
          </div>
          <div className="mt-2 text-[11.5px] text-ink-500">{t("Dossier posture:")} <b>{tv(d.readiness.posture)}</b>{Math.abs(teamScore - d.readiness.score) >= 20 && <span className="text-signal-warn"> {t("· team and computed views differ by {n} pts — discuss before deciding.", { n: Math.abs(teamScore - d.readiness.score) })}</span>}</div>

          <div className="mt-6 space-y-3">
            <label className="block"><span className="label">{t("Responsible person")}</span><select className="field" value={a.responsible} onChange={(e) => upd({ responsible: e.target.value })}>{[...TEAM, CURRENT_USER].map((tx) => <option key={tx} value={tx}>{tv(tx)}</option>)}</select></label>
            <label className="block"><span className="label">{t("Follow-up date")}</span><input type="date" className="field" value={a.followUpDate ?? ""} onChange={(e) => upd({ followUpDate: e.target.value || null })} /></label>
          </div>

          <div className="mt-6"><SubHead>{t("Computed risks")}</SubHead>
            {d.risks.map((r) => <div key={r.title} className="flex items-start gap-2 py-1 text-[12.5px]"><RiskBadge level={r.level} />{r.title}</div>)}
            {!d.risks.length && <div className="text-[12.5px] text-ink-500">{t("None triggered.")}</div>}
          </div>
          <div className="mt-6"><SubHead>{t("Candidate partners")}</SubHead>
            {d.suppliers.slice(0, 4).map((m) => <Link key={m.supplier.id} href={`/suppliers/${m.supplier.id}`} className="block py-1 text-[12.5px] hover:text-accent-700">{m.supplier.name} <span className="text-ink-500">· {tv(m.supplier.status)}</span></Link>)}
          </div>
          <div className="mt-6 text-[11px] text-ink-500">{t("Last saved:")} {exists ? f.date(state.assessments[id].updatedAt.slice(0, 10)) : t("not yet saved")}</div>
        </aside>
      </div>
    </div>
  );
}
