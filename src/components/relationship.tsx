"use client";
import { useState } from "react";
import { getContext } from "@/lib/services/data-service";
import { CURRENT_USER, nextId, useInteractions, useMeetings, useWorkspace } from "@/lib/services/workspace";
import { RELATIONSHIP_STAGES, type InteractionType, type RelationshipStage, type Supplier } from "@/lib/types";
import { addDays } from "@/lib/dates";
import { Modal } from "./ui";

export function LogInteractionModal({ supplier, open, onClose, preset }: { supplier: Supplier; open: boolean; onClose: () => void; preset?: { type?: InteractionType; summary?: string; stageAfter?: RelationshipStage } }) {
  const c = getContext();
  const interactions = useInteractions();
  const { dispatch, toast } = useWorkspace();
  const [type, setType] = useState<InteractionType>(preset?.type ?? "Call");
  const [date, setDate] = useState(c.ref);
  const [summary, setSummary] = useState(preset?.summary ?? "");
  const [stage, setStage] = useState<RelationshipStage | "">(preset?.stageAfter ?? "");
  const [followUp, setFollowUp] = useState(addDays(c.ref, 14));
  const [err, setErr] = useState("");
  const save = () => {
    if (summary.trim().length < 5) return setErr("Please describe the interaction (min. 5 characters).");
    dispatch({ type: "logInteraction", interaction: { id: nextId("INT", interactions), supplierId: supplier.id, date, type, summary: summary.trim(), by: CURRENT_USER, stageAfter: stage || undefined } });
    dispatch({ type: "updateSupplier", id: supplier.id, patch: { lastInteraction: date, followUpDate: followUp || null, ...(stage ? { status: stage } : {}), ...(!supplier.firstContactDate && type !== "Note" ? { firstContactDate: date } : {}) } });
    toast(stage ? `Interaction logged · stage → ${stage}` : "Interaction logged");
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={`Record activity — ${supplier.name}`} width="max-w-xl"
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save}>Save activity</button></>}>
      {err && <div className="mb-3 rounded bg-signal-badbg px-3 py-2 text-[12.5px] text-signal-bad">{err}</div>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label><span className="label">Type</span><select className="field" value={type} onChange={(e) => setType(e.target.value as InteractionType)}>{["Introduction", "Email", "Call", "Meeting", "Response", "Evaluation", "Note"].map((t) => <option key={t}>{t}</option>)}</select></label>
        <label><span className="label">Date</span><input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label className="sm:col-span-2"><span className="label">Summary / response recorded</span><textarea rows={3} className="field" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What happened, what was agreed, what the provider answered…" /></label>
        <label><span className="label">Move relationship stage to</span><select className="field" value={stage} onChange={(e) => setStage(e.target.value as RelationshipStage | "")}><option value="">Keep “{supplier.status}”</option>{RELATIONSHIP_STAGES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label><span className="label">Next follow-up</span><input type="date" className="field" value={followUp} onChange={(e) => setFollowUp(e.target.value)} /></label>
      </div>
      <p className="mt-3 text-[11.5px] text-ink-500">Simulated workflow: nothing is sent to the provider. Activity is stored in this browser.</p>
    </Modal>
  );
}

export function ScheduleMeetingModal({ supplier, open, onClose }: { supplier: Supplier; open: boolean; onClose: () => void }) {
  const c = getContext();
  const meetings = useMeetings();
  const interactions = useInteractions();
  const { dispatch, toast } = useWorkspace();
  const [date, setDate] = useState(addDays(c.ref, 7));
  const [time, setTime] = useState("10:00");
  const [subject, setSubject] = useState("Introductory capability meeting");
  const [location, setLocation] = useState("Video call");
  const [attendees, setAttendees] = useState(`${CURRENT_USER}, ${supplier.relationshipOwner}`);
  const [err, setErr] = useState("");
  const save = () => {
    if (!subject.trim()) return setErr("Subject is required.");
    if (date < c.ref) return setErr("A scheduled meeting must be on or after the reference date.");
    dispatch({ type: "scheduleMeeting", meeting: { id: nextId("MTG", meetings), supplierId: supplier.id, date, time, subject: subject.trim(), location, attendees: attendees.split(",").map((x) => x.trim()).filter(Boolean), status: "Scheduled", notes: "" } });
    dispatch({ type: "logInteraction", interaction: { id: nextId("INT", interactions), supplierId: supplier.id, date: c.ref, type: "Meeting", summary: `Meeting scheduled for ${date} ${time}: ${subject.trim()} (${location}).`, by: CURRENT_USER, stageAfter: "Meeting scheduled" } });
    const advance = ["Identified", "Not contacted", "Contacted", "Responded"].includes(supplier.status);
    dispatch({ type: "updateSupplier", id: supplier.id, patch: { followUpDate: date, lastInteraction: c.ref, ...(advance ? { status: "Meeting scheduled" as const } : {}) } });
    toast(`Meeting scheduled for ${date} (simulated — no invitation sent)`);
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={`Schedule meeting — ${supplier.name}`} width="max-w-xl"
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save}>Schedule</button></>}>
      {err && <div className="mb-3 rounded bg-signal-badbg px-3 py-2 text-[12.5px] text-signal-bad">{err}</div>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="label">Subject</span><input className="field" value={subject} onChange={(e) => setSubject(e.target.value)} /></label>
        <label><span className="label">Date</span><input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label><span className="label">Time</span><input type="time" className="field" value={time} onChange={(e) => setTime(e.target.value)} /></label>
        <label><span className="label">Location</span><select className="field" value={location} onChange={(e) => setLocation(e.target.value)}>{["Video call", "Casablanca office (demo)", "Rabat office (demo)", "Provider premises", "Trade fair"].map((x) => <option key={x}>{x}</option>)}</select></label>
        <label><span className="label">Attendees (comma-separated)</span><input className="field" value={attendees} onChange={(e) => setAttendees(e.target.value)} /></label>
      </div>
      <p className="mt-3 text-[11.5px] text-ink-500">Simulated: no calendar invitation or email is sent.</p>
    </Modal>
  );
}
