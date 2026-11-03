"use client";
import { t, tk, tv, tvl, getLang } from "@/lib/i18n";
import { tn } from "@/lib/i18n/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { ArrowRight, CalendarPlus, Copy, MessageSquarePlus } from "lucide-react";
import { getContext } from "@/lib/services/data-service";
import { CURRENT_USER, nextId, useContacts, useInteractions, useMeetings, useSuppliers, useWorkspace } from "@/lib/services/workspace";
import { RELATIONSHIP_STAGES, type RelationshipStage, type Supplier } from "@/lib/types";
import { addDays } from "@/lib/dates";
import { isEmail } from "@/lib/data/validate";
import { SUPPLIER_COUNTRIES, TEAM } from "@/lib/data/reference";
import * as f from "@/lib/format";
import { LogInteractionModal, ScheduleMeetingModal } from "@/components/relationship";
import { COUNTRIES } from "@/components/supplier-form";
import { DataTable } from "@/components/data-table";
import { Badge, Empty, Note, PageHeader, Section, StageBadge, SubHead, Tabs, clsx } from "@/components/ui";

type Tab = "pipeline" | "workflow" | "discovery" | "onboarding" | "outreach" | "meetings";

const WORKFLOW: { step: string; stages: RelationshipStage[]; does: string }[] = [
  { step: tk("Identify a provider"), stages: ["Identified"], does: tk("Add the company from discovery, referrals or the onboarding form.") },
  { step: tk("Review its profile"), stages: ["Not contacted"], does: tk("Check sectors, services, coverage and capacity against open demand.") },
  { step: tk("Prepare an introduction"), stages: ["Not contacted"], does: tk("Draft an introduction from the outreach templates (nothing is sent).") },
  { step: tk("Record contact activity"), stages: ["Contacted"], does: tk("Log the introduction and set the next follow-up date.") },
  { step: tk("Record the response"), stages: ["Responded"], does: tk("Capture answers, documents and availability.") },
  { step: tk("Schedule a meeting"), stages: ["Meeting scheduled"], does: tk("Plan a discovery meeting; record attendees and location.") },
  { step: tk("Evaluate the relationship"), stages: ["Negotiation"], does: tk("Score capacity, agree scope, exclusivity and commercial terms.") },
  { step: tk("Establish a partnership"), stages: ["Active partner"], does: tk("Record the agreement and attach NDA / framework documents.") },
  { step: tk("Maintain the relationship"), stages: ["Active partner", "Inactive"], does: tk("Keep follow-ups current; re-activate inactive partners when demand appears.") },
];

const NEXT: Partial<Record<RelationshipStage, RelationshipStage>> = {
  Identified: "Not contacted", "Not contacted": "Contacted", Contacted: "Responded", Responded: "Meeting scheduled", "Meeting scheduled": "Negotiation", Negotiation: "Active partner",
};

function AcquisitionInner() {
  const sp = useSearchParams();
  const [tab, setTab] = useState<Tab>((sp.get("tab") as Tab) ?? "pipeline");
  const suppliers = useSuppliers();
  const [log, setLog] = useState<{ s: Supplier; stage?: RelationshipStage } | null>(null);
  const [meet, setMeet] = useState<Supplier | null>(null);

  return (
    <div>
      <PageHeader eyebrow={t("Module 09 · Provider acquisition & relationship development")} title={t("Provider acquisition")}
        description={t("Identify relevant providers in each country, structure the first contacts and convert them into active partners — with a recorded trail at every step.")}
        meta={<><span>{suppliers.filter((s) => ["Identified", "Not contacted"].includes(s.status)).length} {t("to approach")}</span><span>{suppliers.filter((s) => ["Contacted", "Responded", "Meeting scheduled", "Negotiation"].includes(s.status)).length} {t("in progress")}</span><span>{suppliers.filter((s) => s.status === "Active partner").length} {t("active partners")}</span><span>{t("No real outreach is sent from this prototype")}</span></>}>
        <Tabs value={tab} onChange={setTab} tabs={[
          { id: "pipeline", label: t("Pipeline") }, { id: "workflow", label: t("Workflow") }, { id: "discovery", label: t("Discovery & gaps") },
          { id: "onboarding", label: t("Provider registration") }, { id: "outreach", label: t("Outreach templates") }, { id: "meetings", label: t("Meetings & follow-ups") },
        ]} />
      </PageHeader>
      {tab === "pipeline" && <Pipeline onAdvance={(s, stage) => setLog({ s, stage })} onMeet={setMeet} />}
      {tab === "workflow" && <Workflow />}
      {tab === "discovery" && <Discovery />}
      {tab === "onboarding" && <Onboarding />}
      {tab === "outreach" && <Outreach initial={sp.get("supplier") ?? ""} />}
      {tab === "meetings" && <Meetings onMeet={setMeet} onLog={(s) => setLog({ s })} />}
      {log && <LogInteractionModal open supplier={log.s} preset={{ stageAfter: log.stage, type: log.stage === "Contacted" ? "Introduction" : log.stage === "Responded" ? "Response" : log.stage === "Negotiation" ? "Evaluation" : "Note" }} onClose={() => setLog(null)} />}
      {meet && <ScheduleMeetingModal open supplier={meet} onClose={() => setMeet(null)} />}
    </div>
  );
}

function Pipeline({ onAdvance, onMeet }: { onAdvance: (s: Supplier, stage: RelationshipStage) => void; onMeet: (s: Supplier) => void }) {
  const c = getContext();
  const suppliers = useSuppliers();
  const [country, setCountry] = useState("");
  const list = suppliers.filter((s) => !country || s.country === country);
  const cols = RELATIONSHIP_STAGES.filter((s) => s !== "Rejected");
  return (
    <div className="px-5 py-5 md:px-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[12.5px] text-ink-600">{tn("Move a provider forward with {advance} — each move requires an activity record. {n} rejected providers hidden.", { advance: <b>{t("Advance")}</b>, n: suppliers.filter((s) => s.status === "Rejected").length })}</div>
        <select className="field !h-8 !w-48" value={country} onChange={(e) => setCountry(e.target.value)}><option value="">{t("All countries")}</option>{[...new Set(suppliers.map((s) => s.country))].sort().map((x) => <option key={x} value={x}>{tv(x)}</option>)}</select>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {cols.map((st) => {
          const items = list.filter((s) => s.status === st);
          return (
            <div key={st} className="w-[244px] shrink-0">
              <div className="mb-2 flex items-center justify-between border-b-2 border-ink-900 pb-1"><span className="text-[12px] font-semibold">{tv(st)}</span><span className="tnum text-[11px] text-ink-500">{items.length}</span></div>
              <div className="space-y-2">
                {items.map((s) => {
                  const overdue = s.followUpDate && s.followUpDate < c.ref;
                  return (
                    <div key={s.id} className="rounded-[5px] border border-line bg-white p-2.5 hover:border-line-strong">
                      <Link href={`/suppliers/${s.id}`} className="block text-[12.5px] font-medium leading-snug hover:text-accent-700">{s.name}</Link>
                      <div className="mt-0.5 text-[11px] text-ink-500">{tv(s.country)} · {c.sector.get(s.sectorIds[0])?.name}</div>
                      <div className={clsx("mt-1 text-[11px]", overdue ? "text-signal-bad" : "text-ink-500")}>{s.followUpDate ? t("Follow-up {v0}", { v0: f.shortDate(s.followUpDate) }) : "No follow-up"}</div>
                      <div className="mt-2 flex gap-1">
                        {NEXT[st] && <button className="btn btn-sm !h-6 !text-[11px]" onClick={() => onAdvance(s, NEXT[st]!)}>{t("Advance")} <ArrowRight size={11} /></button>}
                        {["Contacted", "Responded"].includes(st) && <button className="btn-ghost btn-sm !h-6 !text-[11px]" onClick={() => onMeet(s)}><CalendarPlus size={11} /> {t("Meet")}</button>}
                        {st === "Inactive" && <button className="btn btn-sm !h-6 !text-[11px]" onClick={() => onAdvance(s, "Contacted")}>{t("Re-activate")}</button>}
                      </div>
                    </div>
                  );
                })}
                {items.length === 0 && <div className="rounded-[5px] border border-dashed border-line-strong py-4 text-center text-[11px] text-ink-400">{t("Empty")}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Workflow() {
  const suppliers = useSuppliers();
  const interactions = useInteractions();
  return (
    <Section index="01" title={t("Relationship development process")} wide kicker={t("Nine structured steps from identification to a maintained partnership. Counts show where providers currently sit.")}>
      <ol className="grid gap-px overflow-hidden rounded-[6px] border border-line bg-line md:grid-cols-3">
        {WORKFLOW.map((w, i) => {
          const n = suppliers.filter((s) => w.stages.includes(s.status)).length;
          return (
            <li key={w.step} className="bg-white p-4">
              <div className="flex items-baseline justify-between"><span className="font-mono text-[11px] text-accent">{t("Step {n}", { n: i + 1 })}</span><span className="tnum text-[11px] text-ink-500">{t("{n} provider(s) · stage {stages}", { n, stages: w.stages.map(tv).join(" / ") })}</span></div>
              <div className="mt-1 text-[14px] font-semibold">{t(w.step)}</div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-600">{t(w.does)}</p>
            </li>
          );
        })}
      </ol>
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {[
          [t("Conversion to active"), `${f.pct(suppliers.filter((s) => s.status === "Active partner").length / Math.max(1, suppliers.filter((s) => !["Identified", "Not contacted"].includes(s.status)).length))}`, t("active partners ÷ providers contacted")],
          [t("Logged interactions"), String(interactions.length), t("across all providers")],
          [t("Rejected / inactive"), String(suppliers.filter((s) => ["Rejected", "Inactive"].includes(s.status)).length), t("kept for history")],
        ].map(([k, v, s]) => <div key={k} className="border-l-2 border-accent pl-3"><div className="text-[11.5px] text-ink-500">{k}</div><div className="tnum text-[20px] font-semibold">{v}</div><div className="text-[11.5px] text-ink-500">{s}</div></div>)}
      </div>
    </Section>
  );
}

function Discovery() {
  const c = getContext();
  const suppliers = useSuppliers();
  // supply-demand gap: active & recent demand per sector vs suppliers per sector
  const recent = c.clean.filter((o) => o.publicationDate && o.publicationDate >= addDays(c.ref, -365) && o.sectorId);
  const gaps = c.ds.sectors.map((s) => {
    const demand = recent.filter((o) => o.sectorId === s.id);
    const sup = suppliers.filter((x) => x.sectorIds.includes(s.id) && x.status !== "Rejected");
    const active = sup.filter((x) => x.status === "Active partner" || x.status === "Negotiation");
    const regions = [...new Set(demand.map((o) => o.regionId).filter(Boolean))];
    return { id: s.id, name: s.name, demand: demand.length, value: demand.reduce((a, o) => a + (o.estimatedValue ?? 0), 0), suppliers: sup.length, active: active.length, moroccan: sup.filter((x) => x.coverage.includes("Morocco")).length, regions: regions.length, ratio: demand.length / Math.max(1, active.length) };
  }).sort((a, b) => b.ratio - a.ratio);
  const toApproach = suppliers.filter((s) => ["Identified", "Not contacted"].includes(s.status));
  return (
    <>
      <Section index="01" title={t("Supply–demand gap")} kicker={t("Last-12-month demand per sector vs suppliers in the network. Sectors with demand but few active partners are where to recruit next.")}>
        <DataTable rows={gaps} rowKey={(g) => g.id} dense pageSize={15} initialSort={{ key: "r", dir: "desc" }} columns={[
          { key: "n", header: t("Sector"), render: (g) => <span className="font-medium">{g.name}</span> },
          { key: "d", header: t("Tenders (12m)"), align: "right", sort: (g) => g.demand, render: (g) => g.demand },
          { key: "v", header: t("Known value"), align: "right", sort: (g) => g.value, render: (g) => f.mad(g.value) },
          { key: "s", header: t("Suppliers"), align: "right", sort: (g) => g.suppliers, render: (g) => g.suppliers },
          { key: "a", header: t("Active / negotiating"), align: "right", sort: (g) => g.active, render: (g) => g.active },
          { key: "m", header: t("Cover Morocco"), align: "right", sort: (g) => g.moroccan, render: (g) => g.moroccan },
          { key: "r", header: t("Tenders per active partner"), align: "right", sort: (g) => g.ratio, render: (g) => <span className={clsx(g.demand >= 4 && g.active === 0 && "font-semibold text-signal-bad")}>{g.active ? g.ratio.toFixed(1) : g.demand ? t("no partner") : "—"}</span> },
          { key: "f", header: "", render: (g) => (g.demand >= 4 && g.active === 0 ? <Badge tone="red">{t("Recruit")}</Badge> : g.ratio >= 6 ? <Badge tone="amber">{t("Thin")}</Badge> : null) },
        ]} />
      </Section>
      <Section index="02" title={t("Providers to approach")} kicker={t("Identified providers that have not been contacted yet, with the follow-up planned.")}>
        <DataTable rows={toApproach} rowKey={(s) => s.id} rowHref={(s) => `/suppliers/${s.id}`} dense pageSize={10} columns={[
          { key: "n", header: t("Provider"), render: (s) => <span className="font-medium">{s.name}</span> },
          { key: "c", header: t("Country"), sort: (s) => s.country, render: (s) => s.country },
          { key: "s", header: t("Sector"), render: (s) => c.sector.get(s.sectorIds[0])?.name },
          { key: "cov", header: t("Geographic availability"), render: (s) => <span className="text-[12px] text-ink-500">{tvl(s.coverage, ", ")}</span> },
          { key: "st", header: t("Status"), render: (s) => <StageBadge stage={s.status} /> },
          { key: "o", header: "", render: (s) => <Link className="btn btn-sm" href={`/acquisition?tab=outreach&supplier=${s.id}`} onClick={(e) => e.stopPropagation()}>{t("Draft intro")}</Link> },
        ]} />
      </Section>
    </>
  );
}

function Lbl({ t: label, children, span }: { t: string; children: React.ReactNode; span?: boolean }) {
  return <label className={span ? "sm:col-span-2" : ""}><span className="label">{t(label)}</span>{children}</label>;
}

function Onboarding() {
  const c = getContext();
  const suppliers = useSuppliers();
  const contacts = useContacts();
  const { state, dispatch, toast } = useWorkspace();
  const empty = { company: "", country: "Morocco", city: "", sectors: [] as string[], services: "", contact: "", role: "", email: "", phone: "", coverage: "", website: "", areas: [] as string[], info: "", consent: false };
  const [d, setD] = useState(empty);
  const [errors, setErrors] = useState<string[]>([]);
  const AREAS = ["Subcontracting", "Joint bidding / consortium", "Local representation", "Equipment supply", "Technical staff", "Logistics"];
  const submit = () => {
    const e: string[] = [];
    if (d.company.trim().length < 2) e.push("Company name is required");
    if (!d.sectors.length) e.push("Select at least one sector");
    if (!d.contact.trim()) e.push("Main contact name is required");
    if (!isEmail(d.email)) e.push("A valid email is required");
    if (d.website && !/^https?:\/\//.test(d.website)) e.push("Website must start with http:// or https://");
    if (!d.consent) e.push("Consent to the demo data notice is required");
    if (suppliers.some((s) => s.name.toLowerCase() === d.company.trim().toLowerCase())) e.push("This company is already registered");
    setErrors(e);
    if (e.length) return;
    const sid = nextId("SUP", suppliers);
    const cid = nextId("CT", contacts);
    const prov = { synthetic: true as const, source: "Demo provider registration form", generator: "workspace", seed: 0, createdAt: c.ref };
    const region = SUPPLIER_COUNTRIES.find((x) => x.country === d.country)?.region ?? "Other";
    dispatch({
      type: "register",
      registration: { id: nextId("REG", state.registrations), submittedAt: new Date().toISOString(), supplierId: sid, areasOfCooperation: d.areas, additionalInfo: d.info },
      supplier: {
        id: sid, name: d.company.trim(), description: d.info.trim() || t("Registered through the demo provider registration form."), country: d.country, region, city: d.city.trim(),
        sectorIds: d.sectors, domain: c.sector.get(d.sectors[0])?.domain ?? "", services: d.services.split(",").map((x) => x.trim()).filter(Boolean), specialisation: d.services.split(",")[0]?.trim() ?? "",
        coverage: d.coverage.split(",").map((x) => x.trim()).filter(Boolean), website: d.website.trim(), phone: d.phone.trim(), email: d.email.trim(), address: d.city.trim(),
        contactIds: [cid], relationshipOwner: TEAM[2], status: "Identified", firstContactDate: null, lastInteraction: null, previousCooperation: "None recorded",
        notes: d.areas.length ? `Areas of cooperation: ${d.areas.join(", ")}` : "", documents: [], followUpDate: addDays(c.ref, 5), capacityScore: 3, createdAt: c.ref, provenance: prov,
      },
      contact: { id: cid, name: d.contact.trim(), role: d.role.trim() || "Main contact", email: d.email.trim(), phone: d.phone.trim(), supplierId: sid, languages: [], provenance: prov },
    });
    toast(t("Registration received — {v0} added as “Identified”", { v0: d.company.trim() }));
    setD(empty);
  };
  return (
    <div className="grid xl:grid-cols-[minmax(0,1fr)_360px]">
      <Section index="01" title={t("Provider registration form")} wide className="xl:border-r" kicker={t("Demo form a provider would complete to join the network. Submissions create an “Identified” supplier record with a follow-up in 5 days.")}>
        <Note tone="warn">{t("Prototype: fictional demo submissions only. Do not enter real company or personal data. Data stays in this browser.")}</Note>
        {errors.length > 0 && <div className="mt-3 rounded-[5px] bg-signal-badbg px-3 py-2 text-[12.5px] text-signal-bad">{errors.map((e) => <div key={e}>• {e}</div>)}</div>}
        <div className="mt-4 grid max-w-3xl gap-3 sm:grid-cols-2">
          <Lbl t="Company name *" span><input className="field" value={d.company} onChange={(e) => setD({ ...d, company: e.target.value })} /></Lbl>
          <Lbl t="Country *"><select className="field" value={d.country} onChange={(e) => setD({ ...d, country: e.target.value })}>{COUNTRIES.map((x) => <option key={x} value={x}>{tv(x)}</option>)}</select></Lbl>
          <Lbl t="City"><input className="field" value={d.city} onChange={(e) => setD({ ...d, city: e.target.value })} /></Lbl>
          <div className="sm:col-span-2"><span className="label">{t("Sectors *")}</span><div className="flex flex-wrap gap-1.5">{c.ds.sectors.map((s) => { const on = d.sectors.includes(s.id); return <button type="button" key={s.id} onClick={() => setD({ ...d, sectors: on ? d.sectors.filter((x) => x !== s.id) : [...d.sectors, s.id] })} className={`rounded-[4px] border px-2 py-0.5 text-[12px] ${on ? "border-ink-900 bg-ink-900 text-white" : "border-line-strong text-ink-600"}`}>{s.name}</button>; })}</div></div>
          <Lbl t="Services offered (comma-separated)" span><input className="field" value={d.services} onChange={(e) => setD({ ...d, services: e.target.value })} /></Lbl>
          <Lbl t="Main contact *"><input className="field" value={d.contact} onChange={(e) => setD({ ...d, contact: e.target.value })} /></Lbl>
          <Lbl t="Role"><input className="field" value={d.role} onChange={(e) => setD({ ...d, role: e.target.value })} /></Lbl>
          <Lbl t="Email *"><input className="field" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} placeholder={t("name@company.example")} /></Lbl>
          <Lbl t="Phone"><input className="field" value={d.phone} onChange={(e) => setD({ ...d, phone: e.target.value })} /></Lbl>
          <Lbl t="Geographic coverage (countries)"><input className="field" value={d.coverage} onChange={(e) => setD({ ...d, coverage: e.target.value })} placeholder={t("Morocco, Senegal")} /></Lbl>
          <Lbl t="Website"><input className="field" value={d.website} onChange={(e) => setD({ ...d, website: e.target.value })} placeholder={t("https://")} /></Lbl>
          <div className="sm:col-span-2"><span className="label">{t("Areas of cooperation")}</span><div className="flex flex-wrap gap-3">{AREAS.map((a) => <label key={a} className="flex items-center gap-1.5 text-[12.5px]"><input type="checkbox" checked={d.areas.includes(a)} onChange={(e) => setD({ ...d, areas: e.target.checked ? [...d.areas, a] : d.areas.filter((x) => x !== a) })} />{tv(a)}</label>)}</div></div>
          <Lbl t="Additional information" span><textarea className="field" rows={3} value={d.info} onChange={(e) => setD({ ...d, info: e.target.value })} /></Lbl>
          <label className="flex items-start gap-2 text-[12.5px] text-ink-700 sm:col-span-2"><input type="checkbox" className="mt-1" checked={d.consent} onChange={(e) => setD({ ...d, consent: e.target.checked })} />{t("I understand this is a demonstration form and confirm that the information entered is fictional.")}</label>
          <div className="sm:col-span-2"><button className="btn-primary" onClick={submit}>{t("Submit registration")}</button></div>
        </div>
      </Section>
      <Section index="02" title={t("Recent registrations")} wide>
        {state.registrations.length === 0 ? <div className="text-[13px] text-ink-500">{t("No registration submitted in this workspace yet.")}</div> : (
          <div className="divide-y divide-line-soft">{[...state.registrations].reverse().map((r) => { const s = suppliers.find((x) => x.id === r.supplierId); return s ? <Link key={r.id} href={`/suppliers/${s.id}`} className="block py-2 hover:bg-canvas"><div className="text-[13px] font-medium">{s.name}</div><div className="text-[11.5px] text-ink-500">{tv(s.country)} · {f.date(r.submittedAt.slice(0, 10))} · {tvl(r.areasOfCooperation) || "no area selected"}</div></Link> : null; })}</div>
        )}
      </Section>
    </div>
  );
}

const TEMPLATES = {
  intro: { label: tk("Introduction"), subject: "Partnership opportunities in {{sector}} — Telecontact", body: "Dear {{contact}},\n\nWe are building a network of {{sector_lower}} partners able to support public-sector projects in {{coverage}}. {{company}}'s experience in {{specialisation}} caught our attention.\n\nOur market intelligence shows {{demand}} relevant tenders published over the last 12 months in this sector. We would welcome a short call to understand your capacity and discuss how we could cooperate (subcontracting, joint bids or local representation).\n\nWould you be available for a 30-minute call in the coming two weeks?\n\nKind regards,\n{{owner}}\nTelecontact (demo)" },
  followup: { label: tk("Follow-up"), subject: "Following up — cooperation in {{sector}}", body: "Dear {{contact}},\n\nI am following up on my previous message regarding a possible cooperation between {{company}} and Telecontact in {{sector_lower}}.\n\nWe currently track {{active}} active tenders in this sector. If useful, I can share a short overview of the opportunities where your services would be relevant.\n\nBest regards,\n{{owner}}" },
  meeting: { label: tk("Meeting request"), subject: "Meeting request — {{company}} × Telecontact", body: "Dear {{contact}},\n\nThank you for your reply. To move forward, could we schedule a meeting to review:\n• your references and certifications,\n• your coverage in {{coverage}},\n• the commercial framework for joint bids.\n\nPlease let me know two or three slots that suit you.\n\nKind regards,\n{{owner}}" },
  partnership: { label: tk("Partnership proposal"), subject: "Framework partnership proposal", body: "Dear {{contact}},\n\nFollowing our discussions, we propose to formalise a framework partnership covering {{sector_lower}} opportunities in {{coverage}}. The proposal covers scope, exclusivity per tender, margin sharing and confidentiality (NDA attached in the real process).\n\nWe suggest a review call to finalise the terms.\n\nBest regards,\n{{owner}}" },
};

/** French versions of the outreach templates (same merge fields). */
const TEMPLATES_FR: Record<keyof typeof TEMPLATES, { subject: string; body: string }> = {
  intro: { subject: "Opportunités de partenariat — {{sector}} — Telecontact", body: "Madame, Monsieur {{contact}},\n\nNous constituons un réseau de partenaires dans le domaine « {{sector_lower}} » capables d'accompagner des projets du secteur public en {{coverage}}. L'expérience de {{company}} en {{specialisation}} a retenu notre attention.\n\nNotre veille indique {{demand}} appels d'offres pertinents publiés au cours des 12 derniers mois dans ce secteur. Nous serions heureux d'échanger brièvement pour comprendre votre capacité et étudier une coopération (sous-traitance, offres conjointes ou représentation locale).\n\nSeriez-vous disponible pour un appel de 30 minutes dans les deux prochaines semaines ?\n\nBien cordialement,\n{{owner}}\nTelecontact (démo)" },
  followup: { subject: "Relance — coopération dans le domaine {{sector}}", body: "Madame, Monsieur {{contact}},\n\nJe me permets de revenir vers vous au sujet d'une possible coopération entre {{company}} et Telecontact dans le domaine « {{sector_lower}} ».\n\nNous suivons actuellement {{active}} appels d'offres actifs dans ce secteur. Si cela vous est utile, je peux vous transmettre une courte synthèse des opportunités où vos services seraient pertinents.\n\nBien cordialement,\n{{owner}}" },
  meeting: { subject: "Demande de rendez-vous — {{company}} × Telecontact", body: "Madame, Monsieur {{contact}},\n\nMerci pour votre réponse. Pour avancer, pourrions-nous organiser une réunion afin de passer en revue :\n• vos références et certifications,\n• votre couverture en {{coverage}},\n• le cadre commercial des offres conjointes.\n\nMerci de m'indiquer deux ou trois créneaux qui vous conviennent.\n\nBien cordialement,\n{{owner}}" },
  partnership: { subject: "Proposition d'accord-cadre de partenariat", body: "Madame, Monsieur {{contact}},\n\nÀ la suite de nos échanges, nous proposons de formaliser un accord-cadre couvrant les opportunités « {{sector_lower}} » en {{coverage}}. La proposition porte sur le périmètre, l'exclusivité par appel d'offres, le partage de marge et la confidentialité (accord de confidentialité joint dans le processus réel).\n\nNous suggérons un appel pour finaliser les conditions.\n\nBien cordialement,\n{{owner}}" },
};

function Outreach({ initial }: { initial: string }) {
  const c = getContext();
  const suppliers = useSuppliers();
  const contacts = useContacts();
  const interactions = useInteractions();
  const { dispatch, toast } = useWorkspace();
  const [sid, setSid] = useState(initial || suppliers.find((s) => s.status === "Not contacted")?.id || suppliers[0].id);
  const [tpl, setTpl] = useState<keyof typeof TEMPLATES>("intro");
  const s = suppliers.find((x) => x.id === sid)!;
  const contact = contacts.find((x) => x.id === s.contactIds[0]);
  const sector = c.sector.get(s.sectorIds[0]);
  const demand = c.clean.filter((o) => o.sectorId === s.sectorIds[0] && o.publicationDate && o.publicationDate >= addDays(c.ref, -365)).length;
  const active = c.clean.filter((o) => o.sectorId === s.sectorIds[0] && (o.status === "Open" || o.status === "Closing soon")).length;
  const vars: Record<string, string> = {
    contact: contact?.name ?? t("Sir or Madam"), company: s.name, sector: sector?.name ?? "", sector_lower: (sector?.name ?? "").toLowerCase(), specialisation: tv(s.specialisation).toLowerCase(),
    coverage: tvl(s.coverage) || tv(s.country), owner: tv(s.relationshipOwner), demand: String(demand), active: String(active),
  };
  const fill = (tx: string) => tx.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
  const [body, setBody] = useState<string | null>(null);
  const tplText = getLang() === "fr" ? TEMPLATES_FR[tpl] : TEMPLATES[tpl];
  const text = body ?? fill(tplText.body);
  const subject = fill(tplText.subject);
  const logIt = () => {
    const stage: RelationshipStage | undefined = tpl === "intro" && ["Identified", "Not contacted"].includes(s.status) ? "Contacted" : undefined;
    dispatch({ type: "logInteraction", interaction: { id: nextId("INT", interactions), supplierId: s.id, date: c.ref, type: tpl === "intro" ? "Introduction" : "Email", summary: t("{template} drafted from template and logged (simulated — not sent). Subject: {subject}", { template: t(TEMPLATES[tpl].label), subject }), by: CURRENT_USER, stageAfter: stage } });
    dispatch({ type: "updateSupplier", id: s.id, patch: { lastInteraction: c.ref, followUpDate: addDays(c.ref, 10), ...(stage ? { status: stage, firstContactDate: s.firstContactDate ?? c.ref } : {}) } });
    toast(stage ? "Logged as contacted (simulated) · follow-up in 10 days" : "Outreach logged (simulated) · follow-up in 10 days");
  };
  return (
    <Section index="01" title={t("Draft outreach")} kicker={t("Templates merge the provider profile with live market figures. Drafts can be copied; logging records a simulated contact — no email is ever sent.")} wide>
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-3">
          <label className="block"><span className="label">{t("Provider")}</span><select className="field" value={sid} onChange={(e) => { setSid(e.target.value); setBody(null); }}>{suppliers.map((x) => <option key={x.id} value={x.id}>{x.name} · {tv(x.status)}</option>)}</select></label>
          <div><span className="label">{t("Template")}</span><div className="flex flex-col gap-1">{(Object.keys(TEMPLATES) as (keyof typeof TEMPLATES)[]).map((k) => <button key={k} onClick={() => { setTpl(k); setBody(null); }} className={clsx("rounded-[5px] border px-3 py-1.5 text-left text-[13px]", tpl === k ? "border-ink-900 bg-ink-900 text-white" : "border-line-strong hover:border-ink-300")}>{t(TEMPLATES[k].label)}</button>)}</div></div>
          <div className="rounded-[5px] bg-canvas p-3 text-[12px] text-ink-600"><div className="mb-1 font-semibold text-ink-800">{t("Merge data")}</div>{t("Contact:")} {vars.contact}<br />{t("Sector:")} {vars.sector}<br />{t("12-month demand: {n} tenders", { n: demand })}<br />{t("Active tenders:")} {active}<br />{t("Stage:")} <StageBadge stage={s.status} /></div>
        </div>
        <div>
          <div className="rounded-[6px] border border-line">
            <div className="border-b border-line px-4 py-2 text-[12.5px]"><span className="text-ink-500">{t("To:")}</span> {contact ? `${contact.name} <${contact.email}>` : s.email || "no email on file"}</div>
            <div className="border-b border-line px-4 py-2 text-[12.5px]"><span className="text-ink-500">{t("Subject:")}</span> <b>{subject}</b></div>
            <textarea className="block min-h-[300px] w-full resize-y px-4 py-3 font-sans text-[13px] leading-relaxed text-ink-800 outline-none" value={text} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn" onClick={() => { navigator.clipboard?.writeText(`Subject: ${subject}\n\n${text}`).then(() => toast(t("Draft copied to clipboard")), () => toast(t("Clipboard unavailable"))); }}><Copy size={14} /> {t("Copy draft")}</button>
            <button className="btn-primary" onClick={logIt}><MessageSquarePlus size={14} /> {t("Log as sent (simulated)")}</button>
            <Link className="btn-ghost" href={`/suppliers/${s.id}`}>{t("Open profile")}</Link>
          </div>
          <p className="mt-2 text-[11.5px] text-ink-500">{t("No email integration exists in this prototype. Sending happens outside the platform.")}</p>
        </div>
      </div>
    </Section>
  );
}

function Meetings({ onMeet, onLog }: { onMeet: (s: Supplier) => void; onLog: (s: Supplier) => void }) {
  const c = getContext();
  const meetings = useMeetings();
  const suppliers = useSuppliers();
  const upcoming = meetings.filter((m) => m.status === "Scheduled");
  const held = meetings.filter((m) => m.status !== "Scheduled").reverse();
  const due = suppliers.filter((s) => s.followUpDate && s.followUpDate <= addDays(c.ref, 14) && !["Rejected", "Inactive"].includes(s.status)).sort((a, b) => a.followUpDate!.localeCompare(b.followUpDate!));
  const name = (id: string) => suppliers.find((s) => s.id === id)?.name ?? id;
  return (
    <div className="grid xl:grid-cols-2">
      <Section index="01" title={t("Follow-ups due (≤ 14 days)")} wide className="xl:border-r" kicker={t("{v0} overdue", { v0: due.filter((s) => s.followUpDate! < c.ref).length })}>
        {due.length === 0 ? <Empty title={t("No follow-up due")} /> : (
          <div className="divide-y divide-line-soft">{due.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0"><Link href={`/suppliers/${s.id}`} className="block truncate text-[13px] font-medium hover:text-accent-700">{s.name}</Link><div className="text-[11.5px] text-ink-500">{tv(s.country)} · <StageBadge stage={s.status} /> · {tv(s.relationshipOwner)}</div></div>
              <div className="flex shrink-0 items-center gap-2"><span className={clsx("tnum text-[12px]", s.followUpDate! < c.ref ? "font-semibold text-signal-bad" : "text-ink-600")}>{f.shortDate(s.followUpDate)}</span><button className="btn btn-sm" onClick={() => onLog(s)}>{t("Log")}</button><button className="btn-ghost btn-sm" onClick={() => onMeet(s)}><CalendarPlus size={12} /></button></div>
            </div>
          ))}</div>
        )}
      </Section>
      <Section index="02" title={t("Meetings")} wide>
        <SubHead right={`${upcoming.length}`}>{t("Scheduled@@list")}</SubHead>
        {upcoming.map((m) => <Link key={m.id} href={`/suppliers/${m.supplierId}`} className="flex justify-between gap-3 border-b border-line-soft py-2 hover:bg-canvas/60"><div><div className="text-[13px] font-medium">{tv(m.subject)}</div><div className="text-[11.5px] text-ink-500">{name(m.supplierId)} · {tv(m.location)}</div></div><span className="tnum shrink-0 text-[12px]">{f.shortDate(m.date)} {m.time}</span></Link>)}
        <div className="mt-5"><SubHead right={`${held.length}`}>{t("Held / cancelled")}</SubHead></div>
        {held.slice(0, 12).map((m) => <Link key={m.id} href={`/suppliers/${m.supplierId}`} className="flex justify-between gap-3 border-b border-line-soft py-2 hover:bg-canvas/60"><div><div className="text-[13px]">{tv(m.subject)} <Badge tone={m.status === "Held" ? "green" : "neutral"}>{tv(m.status)}</Badge></div><div className="text-[11.5px] text-ink-500">{name(m.supplierId)}{m.notes ? ` · ${tv(m.notes)}` : ""}</div></div><span className="tnum shrink-0 text-[12px] text-ink-500">{f.shortDate(m.date)}</span></Link>)}
      </Section>
    </div>
  );
}

export default function AcquisitionPage() {
  return <Suspense><AcquisitionInner /></Suspense>;
}
