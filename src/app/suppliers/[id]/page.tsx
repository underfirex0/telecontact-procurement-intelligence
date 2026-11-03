"use client";
import { t, tv, tvl } from "@/lib/i18n";
import { tn } from "@/lib/i18n/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { CalendarPlus, FileText, Globe, Mail, MapPin, MessageSquarePlus, Pencil, Phone, Send, UserPlus, FileStack } from "lucide-react";
import { getContext } from "@/lib/services/data-service";
import { nextId, useContacts, useInteractions, useMeetings, useSuppliers, useWorkspace } from "@/lib/services/workspace";
import { matchSuppliers } from "@/lib/analytics";
import { isEmail } from "@/lib/data/validate";
import type { Meeting, RelationshipStage } from "@/lib/types";
import * as f from "@/lib/format";
import { SupplierFormModal } from "@/components/supplier-form";
import { LogInteractionModal, ScheduleMeetingModal } from "@/components/relationship";
import { Badge, DefList, Empty, Modal, Note, StageBadge, SubHead, SyntheticTag, clsx } from "@/components/ui";

const PIPE: RelationshipStage[] = ["Identified", "Not contacted", "Contacted", "Responded", "Meeting scheduled", "Negotiation", "Active partner"];

export default function SupplierPage() {
  const { id } = useParams<{ id: string }>();
  const c = getContext();
  const suppliers = useSuppliers();
  const contacts = useContacts();
  const interactions = useInteractions();
  const meetings = useMeetings();
  const { dispatch, toast } = useWorkspace();
  const s = suppliers.find((x) => x.id === id);
  const [edit, setEdit] = useState(false);
  const [log, setLog] = useState<null | { stageAfter?: RelationshipStage }>(null);
  const [meet, setMeet] = useState(false);
  const [addContact, setAddContact] = useState(false);
  const [notes, setNotes] = useState<string | null>(null);
  const relevant = useMemo(() => {
    if (!s) return [];
    return c.clean.filter((o) => (o.status === "Open" || o.status === "Closing soon") && matchSuppliers(o, [s], 1).length > 0).slice(0, 8);
  }, [c, s]);
  if (!s) return <div className="p-8"><Empty title={t("Supplier not found")} action={<Link className="btn" href="/suppliers">{t("Back to network")}</Link>} /></div>;
  const myContacts = contacts.filter((x) => x.supplierId === s.id);
  const myInts = interactions.filter((x) => x.supplierId === s.id);
  const myMeetings = meetings.filter((x) => x.supplierId === s.id);
  const stageIdx = PIPE.indexOf(s.status);
  const overdue = s.followUpDate && s.followUpDate < c.ref && !["Rejected", "Inactive"].includes(s.status);
  const setMeetingStatus = (m: Meeting, status: Meeting["status"]) => { dispatch({ type: "updateMeeting", id: m.id, patch: { status } }); toast(t("Meeting marked {v0}", { v0: status.toLowerCase() })); };

  return (
    <div>
      <header className="border-b border-line px-5 pb-5 pt-6 md:px-8">
        <div className="flex flex-wrap items-center gap-2"><span className="eyebrow">{t("Supplier & partner profile")}</span><SyntheticTag /><StageBadge stage={s.status} />{overdue && <Badge tone="red">{t("Follow-up overdue")}</Badge>}</div>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-3xl">
            <h1 className="font-serif text-[26px] font-semibold leading-tight">{s.name}</h1>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-600">
              <span className="flex items-center gap-1"><MapPin size={13} />{s.city}, {tv(s.country)} · {s.region}</span>
              <span>{s.sectorIds.map((x) => c.sector.get(x)?.name).join(" · ")}</span>
              <span>{t("Owner:")} {tv(s.relationshipOwner)}</span>
            </div>
            <p className="mt-2 text-[13px] text-ink-600">{tv(s.description)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={() => setEdit(true)}><Pencil size={14} /> {t("Edit")}</button>
            <Link className="btn" href={`/acquisition?tab=outreach&supplier=${s.id}`}><Send size={14} /> {t("Prepare introduction")}</Link>
            <button className="btn" onClick={() => setMeet(true)}><CalendarPlus size={14} /> {t("Schedule meeting")}</button>
            <button className="btn-primary" onClick={() => setLog({})}><MessageSquarePlus size={14} /> {t("Record activity")}</button>
          </div>
        </div>
        {/* relationship stepper */}
        <div className="mt-5">
          <div className="flex overflow-x-auto">
            {PIPE.map((st, i) => (
              <button key={st} onClick={() => st !== s.status && setLog({ stageAfter: st })} title={t("Move to {v0}", { v0: tv(st) })}
                className={clsx("group relative min-w-[110px] flex-1 border-t-[3px] px-2 pt-2 text-left text-[11.5px] transition-colors",
                  i < stageIdx || (stageIdx === -1 && false) ? "border-accent text-ink-700" : i === stageIdx ? "border-ink-900 font-semibold text-ink-900" : "border-line-strong text-ink-400 hover:border-ink-300 hover:text-ink-700")}>
                <span className="font-mono text-[10px] text-ink-400">{i + 1}</span> {tv(st)}
              </button>
            ))}
          </div>
          {stageIdx === -1 && <div className="mt-2 text-[12px] text-ink-500">{tn("Relationship currently {stage}. Click a stage to re-open the pipeline (an activity record is required).", { stage: <b>{tv(s.status)}</b> })}</div>}
        </div>
      </header>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 border-line xl:border-r">
          <section className="border-b border-line px-5 py-6 md:px-8">
            <SubHead>{t("Company profile@@section")}</SubHead>
            <DefList cols={3} items={[
              { k: t("Services offered"), v: s.services.join(", ") || "—" },
              { k: t("Specialisation"), v: s.specialisation || "—" },
              { k: t("Domain"), v: s.domain || "—" },
              { k: t("Geographic coverage"), v: s.coverage.join(", ") || "—" },
              { k: t("Capacity (internal score)"), v: `${s.capacityScore}/5` },
              { k: t("Previous cooperation"), v: tv(s.previousCooperation) },
              { k: t("Website"), v: <span className="flex items-center gap-1"><Globe size={12} />{s.website || "—"}</span> },
              { k: t("Phone"), v: <span className="flex items-center gap-1"><Phone size={12} />{s.phone || "—"}</span> },
              { k: t("Email"), v: <span className="flex items-center gap-1"><Mail size={12} />{s.email || "—"}</span> },
              { k: t("Address"), v: s.address || "—" },
              { k: t("First contact"), v: f.date(s.firstContactDate) },
              { k: t("Record source"), v: `${tv(s.provenance.source)} · ${f.date(s.createdAt)}` },
            ]} />
          </section>

          <section className="border-b border-line px-5 py-6 md:px-8">
            <SubHead right={<button className="text-accent-700 hover:underline" onClick={() => setLog({})}>{t("+ record activity")}</button>}>{t("Interaction history")}</SubHead>
            {myInts.length === 0 ? <div className="text-[13px] text-ink-500">{t("No interaction recorded yet.")}</div> : (
              <ol className="relative border-l border-line pl-5">
                {myInts.map((i) => (
                  <li key={i.id} className="relative pb-4 last:pb-0">
                    <span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent ring-1 ring-accent/30" />
                    <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-ink-500"><span className="tnum">{f.date(i.date)}</span><Badge>{tv(i.type)}</Badge>{i.stageAfter && <span>→ {tv(i.stageAfter)}</span>}<span>· {tv(i.by)}</span></div>
                    <div className="mt-0.5 text-[13px] text-ink-800">{tv(i.summary)}</div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="px-5 py-6 md:px-8">
            <SubHead right={t("{v0} active tenders match", { v0: relevant.length })}>{t("Where this supplier could help")}</SubHead>
            {relevant.length ? (
              <div className="divide-y divide-line-soft">{relevant.map((o) => (
                <Link key={o.id} href={`/opportunities/${o.id}`} className="flex items-start justify-between gap-4 py-2 hover:bg-canvas/60">
                  <div className="min-w-0"><div className="font-mono text-[11px] text-accent-700">{o.reference}</div><div className="truncate text-[13px]">{o.title}</div></div>
                  <div className="shrink-0 text-right text-[12px]"><div className="tnum">{f.mad(o.estimatedValue)}</div><div className="text-ink-500">{t("closes")} {f.shortDate(o.deadline)}</div></div>
                </Link>
              ))}</div>
            ) : <div className="text-[13px] text-ink-500">{t("No active tender in this supplier's sectors.")}</div>}
          </section>
        </div>

        <aside className="min-w-0">
          <section className="border-b border-line px-5 py-5">
            <SubHead>{t("Follow-up")}</SubHead>
            <div className="flex items-center gap-2">
              <input type="date" className="field" value={s.followUpDate ?? ""} onChange={(e) => { dispatch({ type: "updateSupplier", id: s.id, patch: { followUpDate: e.target.value || null } }); toast(t("Follow-up date updated")); }} />
            </div>
            <div className={clsx("mt-1.5 text-[12px]", overdue ? "text-signal-bad" : "text-ink-500")}>{s.followUpDate ? (overdue ? t("Overdue since {date}", { date: f.date(s.followUpDate) }) : t("Due {date}", { date: f.date(s.followUpDate) })) : t("No follow-up planned")} · {t("last interaction {date}", { date: f.date(s.lastInteraction) })}</div>
          </section>
          <section className="border-b border-line px-5 py-5">
            <SubHead right={<button className="text-accent-700 hover:underline" onClick={() => setAddContact(true)}><UserPlus size={12} className="inline" /> {t("add")}</button>}>{t("Main contacts")}</SubHead>
            {myContacts.length === 0 && <div className="text-[13px] text-ink-500">{t("No named contact.")}</div>}
            {myContacts.map((ct) => (
              <div key={ct.id} className="border-b border-line-soft py-2 last:border-0">
                <div className="text-[13px] font-medium">{ct.name}</div>
                <div className="text-[12px] text-ink-500">{tv(ct.role)}{ct.languages.length ? ` · ${tvl(ct.languages, ", ")}` : ""}</div>
                <div className="mt-0.5 text-[12px] text-ink-600">{ct.email} · {ct.phone}</div>
              </div>
            ))}
          </section>
          <section className="border-b border-line px-5 py-5">
            <SubHead right={<button className="text-accent-700 hover:underline" onClick={() => setMeet(true)}>{t("+ schedule")}</button>}>{t("Meetings")}</SubHead>
            {myMeetings.length === 0 && <div className="text-[13px] text-ink-500">{t("No meeting recorded.")}</div>}
            {myMeetings.map((m) => (
              <div key={m.id} className="border-b border-line-soft py-2 last:border-0">
                <div className="flex items-center justify-between gap-2"><span className="tnum text-[12px] font-medium">{f.date(m.date)} · {m.time}</span><Badge tone={m.status === "Scheduled" ? "blue" : m.status === "Held" ? "green" : "neutral"}>{tv(m.status)}</Badge></div>
                <div className="text-[13px]">{tv(m.subject)}</div>
                <div className="text-[11.5px] text-ink-500">{tv(m.location)} · {tvl(m.attendees, ", ")}</div>
                {m.status === "Scheduled" && <div className="mt-1 flex gap-2"><button className="btn btn-sm" onClick={() => setMeetingStatus(m, "Held")}>{t("Mark held")}</button><button className="btn-ghost btn-sm" onClick={() => setMeetingStatus(m, "Cancelled")}>{t("Cancel")}</button></div>}
              </div>
            ))}
          </section>
          <section className="border-b border-line px-5 py-5">
            <SubHead right={t("placeholders")}>{t("Documents")}</SubHead>
            {s.documents.length === 0 && <div className="text-[13px] text-ink-500">{t("No document on file.")}</div>}
            {s.documents.map((d) => <div key={d.id} className="flex items-center gap-2 py-1 text-[12.5px]"><FileStack size={13} className="text-ink-400" /><span className="flex-1 truncate">{tv(d.name)}</span><span className="text-[11px] text-ink-400">{f.shortDate(d.addedOn)}</span></div>)}
          </section>
          <section className="px-5 py-5">
            <SubHead right={notes === null ? <button className="text-accent-700 hover:underline" onClick={() => setNotes(s.notes)}>{t("edit")}</button> : null}>{t("Notes")}</SubHead>
            {notes === null ? <p className="whitespace-pre-wrap text-[13px] text-ink-700">{tv(s.notes) || t("No notes.")}</p> : (
              <div><textarea className="field" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} /><div className="mt-2 flex gap-2"><button className="btn-primary btn-sm" onClick={() => { dispatch({ type: "updateSupplier", id: s.id, patch: { notes } }); setNotes(null); toast(t("Notes saved")); }}>{t("Save")}</button><button className="btn btn-sm" onClick={() => setNotes(null)}>{t("Cancel")}</button></div></div>
            )}
            <div className="mt-4"><Note>{tn("Outreach in this prototype is simulated. Use {link} to draft messages; nothing is sent.", { link: <Link className="underline" href={`/acquisition?tab=outreach&supplier=${s.id}`}>{t("outreach templates")}</Link> })}</Note></div>
            <div className="mt-3"><Link href={`/reports?type=supplier&subject=${s.id}`} className="btn btn-sm"><FileText size={12} /> {t("Supplier report")}</Link></div>
          </section>
        </aside>
      </div>

      {edit && <SupplierFormModal open supplier={s} onClose={() => setEdit(false)} />}
      {log && <LogInteractionModal open supplier={s} preset={log} onClose={() => setLog(null)} />}
      {meet && <ScheduleMeetingModal open supplier={s} onClose={() => setMeet(false)} />}
      {addContact && <AddContactModal supplierId={s.id} onClose={() => setAddContact(false)} />}
    </div>
  );
}

function AddContactModal({ supplierId, onClose }: { supplierId: string; onClose: () => void }) {
  const c = getContext();
  const contacts = useContacts();
  const suppliers = useSuppliers();
  const { dispatch, toast } = useWorkspace();
  const [d, setD] = useState({ name: "", role: "", email: "", phone: "", languages: "" });
  const [err, setErr] = useState("");
  const save = () => {
    if (d.name.trim().length < 2) return setErr(t("Name is required."));
    if (d.email && !isEmail(d.email)) return setErr(t("Email format is invalid."));
    const id = nextId("CT", contacts);
    dispatch({ type: "addContact", contact: { id, name: d.name.trim(), role: d.role.trim() || t("Contact"), email: d.email.trim(), phone: d.phone.trim(), supplierId, languages: d.languages.split(",").map((x) => x.trim()).filter(Boolean), provenance: { synthetic: true, source: "User-entered demo record", generator: "workspace", seed: 0, createdAt: c.ref } } });
    const s = suppliers.find((x) => x.id === supplierId)!;
    dispatch({ type: "updateSupplier", id: supplierId, patch: { contactIds: [...s.contactIds, id] } });
    toast(t("Contact added"));
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={t("Add contact")} width="max-w-lg" footer={<><button className="btn" onClick={onClose}>{t("Cancel")}</button><button className="btn-primary" onClick={save}>{t("Add contact")}</button></>}>
      {err && <div className="mb-3 rounded bg-signal-badbg px-3 py-2 text-[12.5px] text-signal-bad">{err}</div>}
      <p className="mb-3 text-[12px] text-ink-500">{t("Fictional demo contacts only — do not enter real personal data.")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["name", "role", "email", "phone", "languages"] as const).map((k) => (
          <label key={k} className={k === "languages" ? "sm:col-span-2" : ""}><span className="label capitalize">{k}{k === "languages" ? " (comma-separated)" : ""}</span><input className="field" value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} /></label>
        ))}
      </div>
    </Modal>
  );
}
