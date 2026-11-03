"use client";
import { t, tv } from "@/lib/i18n";
import { useState } from "react";
import { getContext } from "@/lib/services/data-service";
import { nextId, useContacts, useSuppliers, useWorkspace } from "@/lib/services/workspace";
import { validateSupplier, isEmail } from "@/lib/data/validate";
import { SUPPLIER_COUNTRIES, TEAM } from "@/lib/data/reference";
import { RELATIONSHIP_STAGES, type Contact, type RelationshipStage, type Supplier } from "@/lib/types";
import { Modal } from "./ui";

const COUNTRY_REGION = Object.fromEntries(SUPPLIER_COUNTRIES.map((c) => [c.country, c.region]));
export const COUNTRIES = [...SUPPLIER_COUNTRIES.map((c) => c.country), "Algeria", "Mali", "Italy", "Belgium", "Saudi Arabia", "Other"];

interface Draft {
  name: string; description: string; country: string; city: string; sectorIds: string[]; services: string; specialisation: string; coverage: string;
  website: string; phone: string; email: string; address: string; relationshipOwner: string; status: RelationshipStage;
  firstContactDate: string; lastInteraction: string; followUpDate: string; previousCooperation: string; notes: string; capacityScore: number;
  contactName: string; contactRole: string; contactEmail: string; contactPhone: string;
}

function fromSupplier(s?: Supplier): Draft {
  return {
    name: s?.name ?? "", description: s?.description ?? "", country: s?.country ?? "Morocco", city: s?.city ?? "", sectorIds: s?.sectorIds ?? [],
    services: s?.services.join(", ") ?? "", specialisation: s?.specialisation ?? "", coverage: s?.coverage.join(", ") ?? "Morocco",
    website: s?.website ?? "", phone: s?.phone ?? "", email: s?.email ?? "", address: s?.address ?? "", relationshipOwner: s?.relationshipOwner ?? TEAM[0],
    status: s?.status ?? "Identified", firstContactDate: s?.firstContactDate ?? "", lastInteraction: s?.lastInteraction ?? "", followUpDate: s?.followUpDate ?? "",
    previousCooperation: s?.previousCooperation ?? "None recorded", notes: s?.notes ?? "", capacityScore: s?.capacityScore ?? 3,
    contactName: "", contactRole: "", contactEmail: "", contactPhone: "",
  };
}

export function SupplierFormModal({ open, onClose, supplier, onSaved }: { open: boolean; onClose: () => void; supplier?: Supplier; onSaved?: (id: string) => void }) {
  const c = getContext();
  const suppliers = useSuppliers();
  const contacts = useContacts();
  const { dispatch, toast } = useWorkspace();
  const [d, setD] = useState<Draft>(() => fromSupplier(supplier));
  const [errors, setErrors] = useState<string[]>([]);
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

  const submit = () => {
    const patch: Partial<Supplier> = {
      name: d.name.trim(), description: d.description.trim(), country: d.country, region: COUNTRY_REGION[d.country] ?? "Other", city: d.city.trim(),
      sectorIds: d.sectorIds, domain: c.sector.get(d.sectorIds[0])?.domain ?? "", services: list(d.services), specialisation: d.specialisation.trim(), coverage: list(d.coverage),
      website: d.website.trim(), phone: d.phone.trim(), email: d.email.trim(), address: d.address.trim(), relationshipOwner: d.relationshipOwner, status: d.status,
      firstContactDate: d.firstContactDate || null, lastInteraction: d.lastInteraction || null, followUpDate: d.followUpDate || null,
      previousCooperation: d.previousCooperation, notes: d.notes, capacityScore: Number(d.capacityScore),
    };
    const errs = validateSupplier(patch);
    if (!supplier && d.contactEmail && !isEmail(d.contactEmail)) errs.push("Contact email format is invalid");
    if (!supplier && suppliers.some((s) => s.name.toLowerCase() === patch.name!.toLowerCase())) errs.push("A supplier with this name already exists");
    setErrors(errs);
    if (errs.length) return;
    if (supplier) {
      dispatch({ type: "updateSupplier", id: supplier.id, patch });
      toast(t("Supplier profile updated"));
      onSaved?.(supplier.id);
    } else {
      const id = nextId("SUP", suppliers);
      const contact: Contact | undefined = d.contactName.trim() ? {
        id: nextId("CT", contacts), name: d.contactName.trim(), role: d.contactRole.trim() || "Main contact", email: d.contactEmail.trim(), phone: d.contactPhone.trim(),
        supplierId: id, languages: [], provenance: { synthetic: true, source: "User-entered demo record", generator: "workspace", seed: 0, createdAt: c.ref },
      } : undefined;
      const s: Supplier = {
        ...(patch as Supplier), id, contactIds: contact ? [contact.id] : [], documents: [], createdAt: c.ref,
        provenance: { synthetic: true, source: "User-entered demo record", generator: "workspace", seed: 0, createdAt: c.ref },
      };
      dispatch({ type: "createSupplier", supplier: s, contact });
      toast(t("Supplier {v0} created", { v0: s.name }));
      onSaved?.(id);
    }
    onClose();
  };

  const F = ({ label, children, span = 1 }: { label: string; children: React.ReactNode; span?: 1 | 2 | 3 }) => (
    <label className={span === 3 ? "sm:col-span-3" : span === 2 ? "sm:col-span-2" : ""}><span className="label">{label}</span>{children}</label>
  );

  return (
    <Modal open={open} onClose={onClose} width="max-w-3xl" title={supplier ? t("Edit {v0}", { v0: supplier.name }) : t("New supplier / partner")}
      footer={<><button className="btn" onClick={onClose}>{t("Cancel")}</button><button className="btn-primary" onClick={submit}>{supplier ? t("Save changes") : t("Create supplier")}</button></>}>
      {errors.length > 0 && <div className="mb-3 rounded-[5px] bg-signal-badbg px-3 py-2 text-[12.5px] text-signal-bad">{errors.map((e) => <div key={e}>• {e}</div>)}</div>}
      <p className="mb-4 text-[12px] text-ink-500">{t("Demo workspace record — stored in this browser only. Do not enter real personal data.")}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {F({ label: t("Company name *"), span: 2, children: <input className="field" value={tv(d.name)} onChange={(e) => set({ name: e.target.value })} /> })}
        {F({ label: t("Relationship stage"), children: <select className="field" value={d.status} onChange={(e) => set({ status: e.target.value as RelationshipStage })}>{RELATIONSHIP_STAGES.map((s) => <option key={s} value={s}>{tv(s)}</option>)}</select> })}
        {F({ label: t("Description"), span: 3, children: <textarea className="field" rows={2} value={d.description} onChange={(e) => set({ description: e.target.value })} /> })}
        {F({ label: t("Country *"), children: <select className="field" value={d.country} onChange={(e) => set({ country: e.target.value })}>{COUNTRIES.map((x) => <option key={x} value={x}>{tv(x)}</option>)}</select> })}
        {F({ label: t("City"), children: <input className="field" value={d.city} onChange={(e) => set({ city: e.target.value })} /> })}
        {F({ label: t("Capacity score (1–5)"), children: <input type="number" min={1} max={5} className="field" value={d.capacityScore} onChange={(e) => set({ capacityScore: Number(e.target.value) })} /> })}
      </div>
      <div className="mt-3"><span className="label">{t("Sectors * (first selected = primary)")}</span>
        <div className="flex flex-wrap gap-1.5">{c.ds.sectors.map((s) => {
          const on = d.sectorIds.includes(s.id);
          return <button type="button" key={s.id} onClick={() => set({ sectorIds: on ? d.sectorIds.filter((x) => x !== s.id) : [...d.sectorIds, s.id] })} className={`rounded-[4px] border px-2 py-0.5 text-[12px] ${on ? "border-ink-900 bg-ink-900 text-white" : "border-line-strong text-ink-600 hover:border-ink-400"}`}>{s.name}</button>;
        })}</div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {F({ label: t("Services (comma-separated)"), span: 2, children: <input className="field" value={d.services} onChange={(e) => set({ services: e.target.value })} /> })}
        {F({ label: t("Specialisation"), children: <input className="field" value={d.specialisation} onChange={(e) => set({ specialisation: e.target.value })} /> })}
        {F({ label: t("Geographic coverage (countries, comma-separated)"), span: 3, children: <input className="field" value={d.coverage} onChange={(e) => set({ coverage: e.target.value })} /> })}
        {F({ label: t("Website"), children: <input className="field" placeholder={t("https://…")} value={d.website} onChange={(e) => set({ website: e.target.value })} /> })}
        {F({ label: t("Phone"), children: <input className="field" value={d.phone} onChange={(e) => set({ phone: e.target.value })} /> })}
        {F({ label: t("Email"), children: <input className="field" value={d.email} onChange={(e) => set({ email: e.target.value })} /> })}
        {F({ label: t("Address"), span: 3, children: <input className="field" value={d.address} onChange={(e) => set({ address: e.target.value })} /> })}
        {F({ label: t("Relationship owner"), children: <select className="field" value={d.relationshipOwner} onChange={(e) => set({ relationshipOwner: e.target.value })}>{TEAM.map((tx) => <option key={tx} value={tx}>{tv(tx)}</option>)}</select> })}
        {F({ label: t("First contact"), children: <input type="date" className="field" value={d.firstContactDate} onChange={(e) => set({ firstContactDate: e.target.value })} /> })}
        {F({ label: t("Last interaction"), children: <input type="date" className="field" value={d.lastInteraction} onChange={(e) => set({ lastInteraction: e.target.value })} /> })}
        {F({ label: t("Follow-up date"), children: <input type="date" className="field" value={d.followUpDate} onChange={(e) => set({ followUpDate: e.target.value })} /> })}
        {F({ label: t("Previous cooperation"), span: 2, children: <input className="field" value={d.previousCooperation} onChange={(e) => set({ previousCooperation: e.target.value })} /> })}
        {F({ label: t("Notes"), span: 3, children: <textarea className="field" rows={2} value={d.notes} onChange={(e) => set({ notes: e.target.value })} /> })}
      </div>
      {!supplier && (
        <div className="mt-4 border-t border-line pt-3">
          <div className="mb-2 text-[12px] font-semibold text-ink-700">{t("Main contact (optional, fictional)")}</div>
          <div className="grid gap-3 sm:grid-cols-4">
            {F({ label: t("Name"), children: <input className="field" value={d.contactName} onChange={(e) => set({ contactName: e.target.value })} /> })}
            {F({ label: t("Role"), children: <input className="field" value={d.contactRole} onChange={(e) => set({ contactRole: e.target.value })} /> })}
            {F({ label: t("Email"), children: <input className="field" value={d.contactEmail} onChange={(e) => set({ contactEmail: e.target.value })} /> })}
            {F({ label: t("Phone"), children: <input className="field" value={d.contactPhone} onChange={(e) => set({ contactPhone: e.target.value })} /> })}
          </div>
        </div>
      )}
    </Modal>
  );
}
