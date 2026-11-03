"use client";
import { t, tv, tvl } from "@/lib/i18n";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Download, Plus, Search } from "lucide-react";
import { getContext } from "@/lib/services/data-service";
import { useContacts, useSuppliers } from "@/lib/services/workspace";
import { query } from "@/lib/query";
import { RELATIONSHIP_STAGES } from "@/lib/types";
import { addDays } from "@/lib/dates";
import * as f from "@/lib/format";
import { toCSV, downloadFile } from "@/lib/reports/export";
import { BarList } from "@/components/charts";
import { DataTable } from "@/components/data-table";
import { SupplierFormModal } from "@/components/supplier-form";
import { FilterBar, PageHeader, SelectFilter, StageBadge, SubHead, Section, clsx } from "@/components/ui";

export default function SuppliersPage() {
  const c = getContext();
  const router = useRouter();
  const suppliers = useSuppliers();
  const contacts = useContacts();
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [sector, setSector] = useState("");
  const [domain, setDomain] = useState("");
  const [status, setStatus] = useState("");
  const [creating, setCreating] = useState(false);
  const rows = useMemo(() => query(suppliers, {
    search: q, searchFields: [(s) => s.name, (s) => s.services.join(" "), (s) => s.specialisation, (s) => s.city, (s) => s.description],
    filters: [
      (s) => !country || s.country === country, (s) => !region || s.region === region, (s) => !city || s.city === city,
      (s) => !sector || s.sectorIds.includes(sector), (s) => !domain || s.domain === domain, (s) => !status || s.status === status,
    ],
  }).rows, [suppliers, q, country, region, city, sector, domain, status]);
  const countries = [...new Set(suppliers.map((s) => s.country))].sort();
  const cities = [...new Set(suppliers.filter((s) => !country || s.country === country).map((s) => s.city))].sort();
  const byCountry = Object.entries(rows.reduce<Record<string, number>>((a, s) => ((a[s.country] = (a[s.country] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1]);
  const stageCounts = RELATIONSHIP_STAGES.map((st) => ({ st, n: rows.filter((s) => s.status === st).length }));
  const dueSoon = rows.filter((s) => s.followUpDate && s.followUpDate <= addDays(c.ref, 7) && !["Rejected", "Inactive"].includes(s.status));
  const exportCsv = () => downloadFile(`telecontact-suppliers-${c.ref}.csv`, toCSV(rows.map((s) => ({
    id: s.id, name: s.name, country: s.country, city: s.city, sectors: s.sectorIds.map((x) => c.sector.get(x)?.name).join("; "), services: s.services.join("; "),
    coverage: s.coverage.join("; "), status: s.status, owner: s.relationshipOwner, last_interaction: s.lastInteraction ?? "", follow_up: s.followUpDate ?? "", email: s.email, website: s.website, data_status: "SYNTHETIC DEMO DATA",
  }))), "text/csv");

  return (
    <div>
      <PageHeader eyebrow={t("Module 08 · Suppliers & partners network")} title={t("Supplier and partner network")}
        description={t("Execution partners and service providers across countries and sectors, with relationship stage, ownership and follow-up discipline.")}
        meta={<><span>{suppliers.length} {t("suppliers")}</span><span>{countries.length} {t("countries")}</span><span>{suppliers.filter((s) => s.status === "Active partner").length} {t("active partners")}</span><span className={clsx(dueSoon.length && "font-medium text-signal-warn")}>{dueSoon.length} {t("follow-ups due ≤ 7 days")}</span></>}
        actions={<><button className="btn" onClick={exportCsv}><Download size={14} /> {t("Export")}</button><button className="btn-primary" onClick={() => setCreating(true)}><Plus size={14} /> {t("New supplier")}</button></>}>
        <div className="flex flex-wrap gap-1">
          <button onClick={() => setStatus("")} className={clsx("rounded-[4px] border px-2 py-1 text-[12px]", !status ? "border-ink-900 bg-ink-900 text-white" : "border-line-strong text-ink-600")}>{t("All · {n}", { n: rows.length })}</button>
          {stageCounts.map(({ st, n }) => (
            <button key={st} onClick={() => setStatus(status === st ? "" : st)} className={clsx("rounded-[4px] border px-2 py-1 text-[12px]", status === st ? "border-ink-900 bg-ink-900 text-white" : "border-line-strong text-ink-600 hover:text-ink-900")}>{tv(st)} <span className="tnum opacity-70">{n}</span></button>
          ))}
        </div>
      </PageHeader>
      <FilterBar>
        <label className="block w-64"><span className="label !mb-0.5 !text-[11px]">{t("Search name, service, specialisation")}</span>
          <div className="relative"><Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" /><input className="field !h-[30px] pl-8" value={q} onChange={(e) => setQ(e.target.value)} /></div></label>
        <SelectFilter label={t("Country")} value={country} onChange={(v) => { setCountry(v); setCity(""); }} width="w-40" options={[{ value: "", label: t("All countries") }, ...countries.map((x) => ({ value: x, label: tv(x) }))]} />
        <SelectFilter label={t("Region")} value={region} onChange={setRegion} width="w-36" options={[{ value: "", label: t("All regions") }, ...[...new Set(suppliers.map((s) => s.region))].sort().map((x) => ({ value: x, label: tv(x) }))]} />
        <SelectFilter label={t("City")} value={city} onChange={setCity} width="w-36" options={[{ value: "", label: t("All cities") }, ...cities.map((x) => ({ value: x, label: tv(x) }))]} />
        <SelectFilter label={t("Sector")} value={sector} onChange={setSector} options={[{ value: "", label: t("All sectors") }, ...c.ds.sectors.map((s) => ({ value: s.id, label: s.name }))]} />
        <SelectFilter label={t("Domain")} value={domain} onChange={setDomain} width="w-40" options={[{ value: "", label: t("All domains") }, ...[...new Set(c.ds.sectors.map((s) => s.domain))].map((x) => ({ value: x, label: tv(x) }))]} />
      </FilterBar>

      <Section title={t("Network footprint")} kicker={t("Where the selected suppliers are based. Use it to spot gaps before a tender requires local capacity.")} index="01">
        <div className="grid gap-8 lg:grid-cols-2">
          <div><SubHead>{t("Suppliers by country")}</SubHead><BarList rows={byCountry.map(([k, n]) => ({ key: k, label: tv(k), value: n, display: n }))} /></div>
          <div><SubHead>{t("Sector coverage (primary sector)")}</SubHead><BarList rows={c.ds.sectors.map((s) => ({ key: s.id, label: s.name, value: rows.filter((x) => x.sectorIds[0] === s.id).length, sub: t("{v0} active", { v0: rows.filter((x) => x.sectorIds[0] === s.id && x.status === "Active partner").length }), display: rows.filter((x) => x.sectorIds[0] === s.id).length })).sort((a, b) => b.value - a.value)} /></div>
        </div>
      </Section>
      <div className="px-5 py-6 md:px-8">
        <DataTable rows={rows} rowKey={(s) => s.id} rowHref={(s) => `/suppliers/${s.id}`} pageSize={20} initialSort={{ key: "n", dir: "asc" }}
          columns={[
            { key: "n", header: t("Supplier"), sort: (s) => s.name, width: "28%", render: (s) => <div><Link href={`/suppliers/${s.id}`} className="font-medium hover:text-accent-700">{s.name}</Link><div className="text-[11.5px] text-ink-500">{tv(s.specialisation)}</div></div> },
            { key: "loc", header: t("Location"), sort: (s) => s.country, render: (s) => <div className="text-[12.5px]">{s.city}<div className="text-[11.5px] text-ink-500">{tv(s.country)}</div></div> },
            { key: "sec", header: t("Sectors"), hideBelow: "lg", render: (s) => <span className="text-[12px]">{s.sectorIds.map((x) => c.sector.get(x)?.name).join(", ")}</span> },
            { key: "cov", header: t("Coverage"), hideBelow: "xl", render: (s) => <span className="text-[11.5px] text-ink-500">{tvl(s.coverage, ", ")}</span> },
            { key: "st", header: t("Stage"), sort: (s) => RELATIONSHIP_STAGES.indexOf(s.status), render: (s) => <StageBadge stage={s.status} /> },
            { key: "ct", header: t("Main contact"), hideBelow: "lg", render: (s) => { const ct = contacts.find((x) => x.id === s.contactIds[0]); return ct ? <span className="text-[12px]">{ct.name}<div className="text-[11px] text-ink-500">{tv(ct.role)}</div></span> : <span className="text-[12px] text-ink-400">{t("None")}</span>; } },
            { key: "own", header: t("Owner"), hideBelow: "xl", sort: (s) => s.relationshipOwner, render: (s) => <span className="text-[12px]">{tv(s.relationshipOwner)}</span> },
            { key: "li", header: t("Last interaction"), sort: (s) => s.lastInteraction, render: (s) => <span className="tnum text-[12px]">{f.shortDate(s.lastInteraction)}</span> },
            { key: "fu", header: t("Follow-up"), sort: (s) => s.followUpDate, render: (s) => <span className={clsx("tnum text-[12px]", s.followUpDate && s.followUpDate < c.ref && !["Rejected", "Inactive"].includes(s.status) && "font-medium text-signal-bad")}>{f.shortDate(s.followUpDate)}</span> },
          ]} />
      </div>
      {creating && <SupplierFormModal open onClose={() => setCreating(false)} onSaved={(id) => router.push(`/suppliers/${id}`)} />}
    </div>
  );
}
