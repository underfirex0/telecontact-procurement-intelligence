"use client";
import { t, tv, tvl } from "@/lib/i18n";
import { useMemo, useState } from "react";
import { Paperclip, ShieldCheck, UserPlus } from "lucide-react";
import { getContext } from "@/lib/services/data-service";
import { nextId, useTalentData, useWorkspace } from "@/lib/services/workspace";
import { isEmail } from "@/lib/data/validate";
import { query } from "@/lib/query";
import type { Application, JobOpportunity } from "@/lib/types";
import * as f from "@/lib/format";
import { DataTable } from "@/components/data-table";
import { Badge, Drawer, FigureStrip, FilterBar, Modal, Note, PageHeader, Section, SelectFilter, SubHead, Tabs } from "@/components/ui";

const APP_STATUSES: Application["status"][] = ["Received", "Screening", "Interview", "Shortlisted", "Placed", "Declined"];
const JOB_TONE = { Open: "blue", Interviewing: "violet", Filled: "green", "On hold": "neutral" } as const;

export default function TalentPage() {
  const c = getContext();
  const { jobs, talents, applications } = useTalentData();
  const [tab, setTab] = useState<"jobs" | "pool" | "privacy">("jobs");
  const [country, setCountry] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState<JobOpportunity | null>(null);
  const [apply, setApply] = useState<JobOpportunity | null>(null);
  const rows = useMemo(() => query(jobs, { filters: [(j) => !country || j.country === country, (j) => !status || j.status === status] }).rows, [jobs, country, status]);

  return (
    <div>
      <PageHeader eyebrow={t("Module 10 · Talent & local expert network")} title={t("Talent and local experts")}
        description={t("Roles and local experts who can help execute projects in different countries. Synthetic examples only — no real personal data is collected or stored.")}
        actions={<button className="btn-primary" onClick={() => setApply(jobs.find((j) => j.status === "Open") ?? jobs[0])}><UserPlus size={14} /> {t("Apply (demo)")}</button>}>
        <Tabs value={tab} onChange={setTab} tabs={[{ id: "jobs", label: t("Opportunities"), count: jobs.length }, { id: "pool", label: t("Expert pool"), count: talents.length }, { id: "privacy", label: t("Privacy & consent") }]} />
      </PageHeader>
      {tab === "jobs" && (
        <>
          <div className="px-5 pt-5 md:px-8">
            <FigureStrip items={[
              { label: t("Open roles"), value: jobs.filter((j) => j.status === "Open").length, sub: t("{v0} countries", { v0: new Set(jobs.map((j) => j.country)).size }) },
              { label: t("Applications"), value: applications.length, sub: `${applications.filter((a) => ["Interview", "Shortlisted"].includes(a.status)).length} in interview / shortlist` },
              { label: t("Placed"), value: applications.filter((a) => a.status === "Placed").length, sub: t("synthetic placements") },
              { label: t("Experts available now"), value: talents.filter((tx) => tx.availability === "Immediate").length, sub: t("of {v0} in pool", { v0: talents.length }) },
            ]} />
          </div>
          <FilterBar>
            <SelectFilter label={t("Country")} value={country} onChange={setCountry} options={[{ value: "", label: t("All countries") }, ...[...new Set(jobs.map((j) => j.country))].map((x) => ({ value: x, label: tv(x) }))]} />
            <SelectFilter label={t("Status")} value={status} onChange={setStatus} options={[{ value: "", label: t("All statuses") }, ...["Open", "Interviewing", "Filled", "On hold"].map((x) => ({ value: x, label: tv(x) }))]} />
          </FilterBar>
          <div className="px-5 py-5 md:px-8">
            <DataTable rows={rows} rowKey={(j) => j.id} onRowClick={setOpen} pageSize={15}
              columns={[
                { key: "t", header: t("Role"), sort: (j) => j.title, width: "32%", render: (j) => <div><div className="font-medium">{tv(j.title)}</div><div className="text-[11.5px] text-ink-500">{tv(j.role)} · {c.sector.get(j.sectorId)?.name}</div></div> },
                { key: "l", header: t("Location"), sort: (j) => j.country, render: (j) => <div className="text-[12.5px]">{tv(j.location)}<div className="text-[11.5px] text-ink-500">{tv(j.country)}</div></div> },
                { key: "e", header: t("Required expertise"), hideBelow: "lg", render: (j) => <span className="text-[12px]">{tvl(j.expertise, ", ")}</span> },
                { key: "x", header: t("Experience"), align: "right", sort: (j) => j.experienceYears, render: (j) => t("{n}+ yrs", { n: j.experienceYears }) },
                { key: "g", header: t("Engagement"), hideBelow: "md", render: (j) => <span className="text-[12px]">{tv(j.engagement)}</span> },
                { key: "a", header: t("Applicants"), align: "right", sort: (j) => applications.filter((a) => a.jobId === j.id).length, render: (j) => applications.filter((a) => a.jobId === j.id).length },
                { key: "s", header: t("Status"), sort: (j) => j.status, render: (j) => <Badge tone={JOB_TONE[j.status]}>{tv(j.status)}</Badge> },
                { key: "ap", header: "", render: (j) => j.status === "Open" || j.status === "Interviewing" ? <button className="btn btn-sm" onClick={() => setApply(j)}>{t("Apply")}</button> : null },
              ]} />
          </div>
        </>
      )}
      {tab === "pool" && (
        <div className="px-5 py-5 md:px-8">
          <DataTable rows={talents} rowKey={(tx) => tx.id} pageSize={20}
            columns={[
              { key: "n", header: t("Expert (synthetic)"), sort: (tx) => tx.name, render: (tx) => <div><div className="font-medium">{tv(tx.name)}</div><div className="text-[11.5px] text-ink-500">{tx.email}</div></div> },
              { key: "c", header: t("Country"), sort: (tx) => tx.country, render: (tx) => tx.country },
              { key: "e", header: t("Expertise"), render: (tx) => <span className="text-[12px]">{tvl(tx.expertise, ", ")}</span> },
              { key: "y", header: t("Experience"), align: "right", sort: (tx) => tx.experienceYears, render: (tx) => t("{n} yrs", { n: tx.experienceYears }) },
              { key: "s", header: t("Skills"), hideBelow: "lg", render: (tx) => <span className="text-[12px] text-ink-500">{tvl(tx.skills, ", ")}</span> },
              { key: "a", header: t("Availability"), sort: (tx) => tx.availability, render: (tx) => <Badge tone={tx.availability === "Immediate" ? "green" : tx.availability === "Unavailable" ? "neutral" : "blue"}>{tv(tx.availability)}</Badge> },
              { key: "k", header: t("Consent"), render: (tx) => (tx.consent ? <span className="text-[12px] text-signal-good">{t("Recorded")}</span> : <span className="text-[12px] text-signal-bad">{t("Missing")}</span>) },
              { key: "ap", header: t("Applications"), align: "right", render: (tx) => applications.filter((a) => a.talentId === tx.id).length },
            ]} />
        </div>
      )}
      {tab === "privacy" && (
        <Section index="01" title={t("Privacy-conscious onboarding")} kicker={t("How the module is prepared for real candidate data, and what the prototype deliberately does not do.")}>
          <div className="grid gap-6 md:grid-cols-2">
            {[
              [t("Consent capture"), t("Every application requires an explicit consent checkbox; the consent flag is stored with the profile and shown in the expert pool.")],
              [t("Data minimisation"), t("Only professional fields are requested (name, professional email, country, expertise, experience, skills). No ID numbers, birth dates or photos.")],
              [t("CV handling"), t("CV upload is a placeholder: the file name is recorded, the file itself is never read or stored in this prototype.")],
              [t("Storage"), t("Submissions stay in the browser's local storage for the demo workspace and can be wiped from Settings → Reset workspace.")],
              [t("Retention & rights (future)"), t("Production would add retention periods, access/erasure requests and a consent log aligned with Moroccan law 09-08 and GDPR for EU candidates.")],
              [t("No external transfer"), t("Nothing is sent to external services, email providers or AI APIs.")],
            ].map(([t, d]) => <div key={t} className="border-l-2 border-signal-good pl-3"><div className="flex items-center gap-1.5 text-[13.5px] font-semibold"><ShieldCheck size={14} className="text-signal-good" />{t}</div><p className="mt-1 text-[12.5px] leading-relaxed text-ink-600">{d}</p></div>)}
          </div>
        </Section>
      )}
      {open && <JobDrawer job={open} onClose={() => setOpen(null)} onApply={() => { setApply(open); setOpen(null); }} />}
      {apply && <ApplyModal job={apply} jobs={jobs} onClose={() => setApply(null)} />}
    </div>
  );
}

function JobDrawer({ job, onClose, onApply }: { job: JobOpportunity; onClose: () => void; onApply: () => void }) {
  const c = getContext();
  const { talents, applications } = useTalentData();
  const { dispatch, toast } = useWorkspace();
  const apps = applications.filter((a) => a.jobId === job.id);
  return (
    <Drawer open onClose={onClose} title={tv(job.title)} subtitle={t("{v0}, {v1} · {v2} · posted {v3}", { v0: job.location, v1: job.country, v2: job.engagement, v3: f.date(job.postedOn) })}>
      <div className="flex items-center gap-2"><Badge tone={JOB_TONE[job.status]}>{tv(job.status)}</Badge><span className="text-[12px] text-ink-500">{c.sector.get(job.sectorId)?.name}</span></div>
      <p className="mt-3 text-[13px] text-ink-700">{tv(job.description)}</p>
      <div className="mt-3 text-[13px]"><b>{t("Required expertise:")}</b> {tvl(job.expertise, ", ")} · <b>{t("{n}+ years", { n: job.experienceYears })}</b></div>
      <div className="mt-5"><SubHead right={`${apps.length}`}>{t("Applicants & status")}</SubHead>
        {apps.length === 0 && <div className="text-[13px] text-ink-500">{t("No application yet.")}</div>}
        {apps.map((a) => {
          const tx = talents.find((x) => x.id === a.talentId);
          return (
            <div key={a.id} className="flex items-center justify-between gap-3 border-b border-line-soft py-2">
              <div className="min-w-0"><div className="text-[13px] font-medium">{tv(tx?.name)}</div><div className="text-[11.5px] text-ink-500">{tx?.country} · {t("{n} yrs · applied {date}", { n: tx?.experienceYears, date: f.shortDate(a.submittedOn) })} · <Paperclip size={10} className="inline" /> {tv(a.cvPlaceholder)}</div></div>
              <select className="field !h-7 !w-36 !text-[12px]" value={a.status} onChange={(e) => { dispatch({ type: "setApplicationStatus", id: a.id, status: e.target.value as Application["status"] }); toast(t("Application → {v0}", { v0: e.target.value })); }}>{APP_STATUSES.map((s) => <option key={s} value={s}>{tv(s)}</option>)}</select>
            </div>
          );
        })}
      </div>
      {(job.status === "Open" || job.status === "Interviewing") && <button className="btn-primary mt-4" onClick={onApply}>{t("Apply to this role (demo)")}</button>}
    </Drawer>
  );
}

function ApplyModal({ job, jobs, onClose }: { job: JobOpportunity; jobs: JobOpportunity[]; onClose: () => void }) {
  const c = getContext();
  const { talents, applications } = useTalentData();
  const { dispatch, toast } = useWorkspace();
  const [jobId, setJobId] = useState(job.id);
  const [d, setD] = useState({ name: "", email: "", country: "Morocco", expertise: "", experience: 3, skills: "", cv: "", consent: false });
  const [errs, setErrs] = useState<string[]>([]);
  const submit = () => {
    const e: string[] = [];
    if (d.name.trim().length < 2) e.push("Name is required");
    if (!isEmail(d.email)) e.push("A valid professional email is required");
    if (!d.expertise.trim()) e.push("Expertise is required");
    if (d.experience < 0 || d.experience > 50) e.push("Experience must be between 0 and 50 years");
    if (!d.consent) e.push("Consent is required to submit");
    setErrs(e);
    if (e.length) return;
    const tid = nextId("TAL", talents);
    dispatch({
      type: "apply",
      talent: { id: tid, name: `${d.name.trim()} (demo entry)`, email: d.email.trim(), country: d.country, city: "—", expertise: d.expertise.split(",").map((x) => x.trim()).filter(Boolean), experienceYears: d.experience, skills: d.skills.split(",").map((x) => x.trim()).filter(Boolean), availability: "1 month", consent: true, createdAt: c.ref, synthetic: true },
      application: { id: nextId("APP", applications), jobId, talentId: tid, submittedOn: c.ref, status: "Received", cvPlaceholder: d.cv ? `${d.cv} (placeholder — file not stored)` : "No CV attached", note: "" },
    });
    toast(t("Application received (demo) — status: Received"));
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={t("Job application (demo form)")} width="max-w-xl" footer={<><button className="btn" onClick={onClose}>{t("Cancel")}</button><button className="btn-primary" onClick={submit}>{t("Submit application")}</button></>}>
      <Note tone="warn">{t("Prototype form: use fictional data only. No real personal data should be entered.")}</Note>
      {errs.length > 0 && <div className="mt-3 rounded bg-signal-badbg px-3 py-2 text-[12.5px] text-signal-bad">{errs.map((x) => <div key={x}>• {x}</div>)}</div>}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="label">{t("Role")}</span><select className="field" value={jobId} onChange={(e) => setJobId(e.target.value)}>{jobs.filter((j) => j.status !== "Filled").map((j) => <option key={j.id} value={j.id}>{tv(j.title)} — {tv(j.country)}</option>)}</select></label>
        <label><span className="label">{t("Full name *")}</span><input className="field" value={tv(d.name)} onChange={(e) => setD({ ...d, name: e.target.value })} /></label>
        <label><span className="label">{t("Professional email *")}</span><input className="field" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} placeholder={t("name@example.test")} /></label>
        <label><span className="label">{t("Country")}</span><select className="field" value={d.country} onChange={(e) => setD({ ...d, country: e.target.value })}>{["Morocco", "Senegal", "Côte d'Ivoire", "Tunisia", "Mauritania", "Spain", "France", "Portugal", "Other"].map((x) => <option key={x} value={x}>{tv(x)}</option>)}</select></label>
        <label><span className="label">{t("Years of experience")}</span><input type="number" min={0} max={50} className="field" value={d.experience} onChange={(e) => setD({ ...d, experience: Number(e.target.value) })} /></label>
        <label className="sm:col-span-2"><span className="label">{t("Expertise * (comma-separated)")}</span><input className="field" value={d.expertise} onChange={(e) => setD({ ...d, expertise: e.target.value })} /></label>
        <label className="sm:col-span-2"><span className="label">{t("Relevant skills")}</span><input className="field" value={d.skills} onChange={(e) => setD({ ...d, skills: e.target.value })} /></label>
        <label className="sm:col-span-2"><span className="label">{t("CV attachment (placeholder — only the file name is kept)")}</span><input type="file" className="block text-[12.5px]" onChange={(e) => setD({ ...d, cv: e.target.files?.[0]?.name ?? "" })} /></label>
        <label className="flex items-start gap-2 text-[12.5px] sm:col-span-2"><input type="checkbox" className="mt-1" checked={d.consent} onChange={(e) => setD({ ...d, consent: e.target.checked })} />{t("I consent to the processing of the information above for this demonstration and confirm it is fictional.")}</label>
      </div>
    </Modal>
  );
}
