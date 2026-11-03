"use client";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, Search } from "lucide-react";
import { getContext } from "@/lib/services/data-service";
import { useWorkspace } from "@/lib/services/workspace";
import { query } from "@/lib/query";
import { addDays } from "@/lib/dates";
import { PROCEDURES } from "@/lib/data/reference";
import * as f from "@/lib/format";
import { toCSV, downloadFile } from "@/lib/reports/export";
import { OppTable } from "@/components/common";
import { Chip, FilterBar, PageHeader, SelectFilter } from "@/components/ui";
import type { Opportunity } from "@/lib/types";

const STATUS_VIEWS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "closing", label: "Closing ≤14 days" },
  { id: "new", label: "New (30 days)" },
  { id: "evaluation", label: "Under evaluation" },
  { id: "awarded", label: "Awarded" },
  { id: "closed", label: "Closed / other" },
  { id: "saved", label: "Saved" },
];

function OpportunitiesInner() {
  const c = getContext();
  const sp = useSearchParams();
  const { state, hydrated } = useWorkspace();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [view, setView] = useState(sp.get("status") ?? "all");
  const [sector, setSector] = useState(sp.get("sector") ?? "");
  const [region, setRegion] = useState(sp.get("region") ?? "");
  const [buyer, setBuyer] = useState(sp.get("buyer") ?? "");
  const [procedure, setProcedure] = useState("");
  const [band, setBand] = useState("");
  const [year, setYear] = useState("");
  const [includeDup, setIncludeDup] = useState(false);
  const ref = c.ref;

  const base = includeDup ? c.ds.opportunities : c.clean;
  const result = useMemo(() => {
    const bands: Record<string, [number, number]> = { s: [0, 1e6], m: [1e6, 5e6], l: [5e6, 2e7], xl: [2e7, Infinity] };
    const filters: ((o: Opportunity) => boolean)[] = [];
    if (view === "active") filters.push((o) => o.status === "Open" || o.status === "Closing soon");
    if (view === "closing") filters.push((o) => !!o.deadline && o.deadline >= ref && o.deadline <= addDays(ref, 14));
    if (view === "new") filters.push((o) => !!o.publicationDate && o.publicationDate > addDays(ref, -30));
    if (view === "evaluation") filters.push((o) => o.status === "Under evaluation");
    if (view === "awarded") filters.push((o) => o.status === "Awarded");
    if (view === "closed") filters.push((o) => ["Closed", "Cancelled", "Unsuccessful"].includes(o.status));
    if (view === "saved") filters.push((o) => !!state.saved[o.id]);
    if (sector) filters.push((o) => (sector === "none" ? !o.sectorId : o.sectorId === sector));
    if (region) filters.push((o) => o.regionId === region);
    if (buyer) filters.push((o) => o.buyerId === buyer);
    if (procedure) filters.push((o) => o.procedure === procedure);
    if (year) filters.push((o) => o.publicationDate?.startsWith(year) ?? false);
    if (band === "unknown") filters.push((o) => o.estimatedValue === null);
    else if (band) filters.push((o) => o.estimatedValue !== null && o.estimatedValue >= bands[band][0] && o.estimatedValue < bands[band][1]);
    return query(base, {
      search: q,
      searchFields: [(o) => o.reference, (o) => o.title, (o) => o.description, (o) => o.city, (o) => (o.buyerId ? `${c.buyer.get(o.buyerId)?.name} ${c.buyer.get(o.buyerId)?.acronym}` : ""), (o) => (o.sectorId ? c.sector.get(o.sectorId)?.name : "")],
      filters,
    }).rows;
  }, [base, q, view, sector, region, buyer, procedure, band, year, state.saved, c, ref]);

  const counts = useMemo(() => ({
    active: c.clean.filter((o) => o.status === "Open" || o.status === "Closing soon").length,
    saved: hydrated ? Object.keys(state.saved).length : 0,
  }), [c, state.saved, hydrated]);
  const totalKnown = result.filter((o) => o.estimatedValue !== null);
  const exportCsv = () => {
    const rows = result.map((o) => ({
      reference: o.reference, title: o.title, buyer: o.buyerId ? c.buyer.get(o.buyerId)?.name : "", sector: o.sectorId ? c.sector.get(o.sectorId)?.name : "",
      region: o.regionId ? c.region.get(o.regionId)?.name : "", city: o.city ?? "", publication_date: o.publicationDate ?? "", deadline: o.deadline ?? "",
      estimated_value_mad: o.estimatedValue ?? "", procedure: o.procedure, status: o.status, lots: o.lots.length, source: o.provenance.source, data_status: "SYNTHETIC DEMO DATA",
    }));
    downloadFile(`telecontact-opportunities-${ref}.csv`, toCSV(rows), "text/csv");
  };

  return (
    <div>
      <PageHeader eyebrow="Module 02 · Opportunity intelligence" title="Procurement opportunities"
        description="Search the full record set, narrow by buyer, sector, geography, value and procedure, and open any tender as an intelligence dossier."
        meta={<><span>{c.clean.length} unique records</span><span>{c.duplicates.length} detected duplicates hidden</span><span>{counts.active} active</span></>}
        actions={<button className="btn" onClick={exportCsv}><Download size={14} /> Export CSV ({result.length})</button>}>
        <div className="relative max-w-2xl">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reference, object, buyer, city, sector…" className="field !h-10 pl-9 text-[14px]" aria-label="Search opportunities" />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {STATUS_VIEWS.map((v) => (
            <Chip key={v.id} active={view === v.id} onClick={() => setView(v.id)}>{v.label}{v.id === "active" ? ` · ${counts.active}` : v.id === "saved" ? ` · ${counts.saved}` : ""}</Chip>
          ))}
        </div>
      </PageHeader>
      <FilterBar right={<label className="flex items-center gap-1.5 text-xs text-ink-600"><input type="checkbox" checked={includeDup} onChange={(e) => setIncludeDup(e.target.checked)} /> Show detected duplicates</label>}>
        <SelectFilter label="Sector" value={sector} onChange={setSector} options={[{ value: "", label: "All sectors" }, ...c.ds.sectors.map((s) => ({ value: s.id, label: s.name })), { value: "none", label: "Unclassified" }]} />
        <SelectFilter label="Region" value={region} onChange={setRegion} options={[{ value: "", label: "All regions" }, ...c.ds.regions.map((r) => ({ value: r.id, label: r.name }))]} />
        <SelectFilter label="Buyer" value={buyer} onChange={setBuyer} width="w-56" options={[{ value: "", label: "All buyers" }, ...[...c.ds.buyers].sort((a, b) => a.acronym.localeCompare(b.acronym)).map((b) => ({ value: b.id, label: `${b.acronym} — ${b.name}` }))]} />
        <SelectFilter label="Procedure" value={procedure} onChange={setProcedure} options={[{ value: "", label: "All procedures" }, ...PROCEDURES.map((p) => ({ value: p, label: p }))]} />
        <SelectFilter label="Estimated value" value={band} onChange={setBand} width="w-36" options={[{ value: "", label: "Any value" }, { value: "s", label: "< 1M MAD" }, { value: "m", label: "1M – 5M" }, { value: "l", label: "5M – 20M" }, { value: "xl", label: "≥ 20M" }, { value: "unknown", label: "Not disclosed" }]} />
        <SelectFilter label="Published" value={year} onChange={setYear} width="w-28" options={[{ value: "", label: "Any year" }, ...["2026", "2025", "2024", "2023"].map((y) => ({ value: y, label: y }))]} />
      </FilterBar>
      <div className="px-5 py-5 md:px-8">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 text-[12.5px] text-ink-600">
          <div><b className="tnum text-ink-900">{result.length}</b> opportunities · combined known estimate <b className="tnum text-ink-900">{f.mad(totalKnown.reduce((a, o) => a + (o.estimatedValue ?? 0), 0))}</b> ({totalKnown.length} with budget)</div>
          <div className="text-[11px] text-ink-500">Click a column to sort · click a row to open its dossier</div>
        </div>
        <OppTable rows={result} pageSize={20} />
      </div>
    </div>
  );
}

export default function OpportunitiesPage() {
  return <Suspense><OpportunitiesInner /></Suspense>;
}
