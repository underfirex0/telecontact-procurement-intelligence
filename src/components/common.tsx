"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { getContext } from "@/lib/services/data-service";
import { useWorkspace } from "@/lib/services/workspace";
import type { MarketFilter } from "@/lib/analytics/context";
import type { Opportunity } from "@/lib/types";
import { addDays, addMonths } from "@/lib/dates";
import * as f from "@/lib/format";
import { DataTable, type Column } from "./data-table";
import { FilterBar, SelectFilter, StatusBadge, clsx } from "./ui";

/* ---------------- Market filter (shared by overview / market / awardees) ---------------- */

export const PERIODS = [
  { value: "all", label: "Full history (2023–2026)" },
  { value: "12m", label: "Last 12 months" },
  { value: "2026", label: "2026 (to date)" },
  { value: "2025", label: "2025" },
  { value: "2024", label: "2024" },
  { value: "2023", label: "2023" },
];

export function periodRange(p: string): { from?: string; to?: string; label: string } {
  const c = getContext();
  const end = c.ds.meta.periodEnd;
  if (p === "12m") return { from: addDays(addMonths(end, -12), 1), to: end, label: `${f.shortDate(addDays(addMonths(end, -12), 1))} – ${f.shortDate(end)}` };
  if (/^\d{4}$/.test(p)) return { from: `${p}-01-01`, to: p === "2026" ? end : `${p}-12-31`, label: p === "2026" ? `Jan 26 – ${f.shortDate(end)}` : p };
  return { label: `${f.shortDate(c.ds.meta.periodStart)} – ${f.shortDate(end)}` };
}

export interface MarketFilterState {
  sector: string;
  region: string;
  buyerType: string;
  period: string;
}

export function useMarketFilter(initial: Partial<MarketFilterState> = {}) {
  const [s, setS] = useState<MarketFilterState>({ sector: "", region: "", buyerType: "", period: "all", ...initial });
  const filter: MarketFilter = useMemo(() => {
    const r = periodRange(s.period);
    return { sectorIds: s.sector ? [s.sector] : undefined, regionIds: s.region ? [s.region] : undefined, buyerTypes: s.buyerType ? [s.buyerType] : undefined, from: r.from, to: r.to };
  }, [s]);
  return { state: s, set: (p: Partial<MarketFilterState>) => setS((x) => ({ ...x, ...p })), filter, periodLabel: periodRange(s.period).label, active: !!(s.sector || s.region || s.buyerType || s.period !== "all") };
}

export function MarketFilterBar({ mf, hide = [], right }: { mf: ReturnType<typeof useMarketFilter>; hide?: (keyof MarketFilterState)[]; right?: React.ReactNode }) {
  const c = getContext();
  const buyerTypes = [...new Set(c.ds.buyers.map((b) => b.type))].sort();
  return (
    <FilterBar right={<>{mf.active && <button className="btn-ghost btn-sm" onClick={() => mf.set({ sector: "", region: "", buyerType: "", period: "all" })}>Clear filters</button>}{right}</>}>
      {!hide.includes("period") && <SelectFilter label="Period" value={mf.state.period} onChange={(v) => mf.set({ period: v })} options={PERIODS} width="w-48" />}
      {!hide.includes("sector") && <SelectFilter label="Sector" value={mf.state.sector} onChange={(v) => mf.set({ sector: v })} options={[{ value: "", label: "All sectors" }, ...c.ds.sectors.map((s) => ({ value: s.id, label: s.name }))]} width="w-52" />}
      {!hide.includes("region") && <SelectFilter label="Region" value={mf.state.region} onChange={(v) => mf.set({ region: v })} options={[{ value: "", label: "All regions" }, ...c.ds.regions.map((r) => ({ value: r.id, label: r.name }))]} width="w-52" />}
      {!hide.includes("buyerType") && <SelectFilter label="Buyer type" value={mf.state.buyerType} onChange={(v) => mf.set({ buyerType: v })} options={[{ value: "", label: "All buyer types" }, ...buyerTypes.map((t) => ({ value: t, label: t }))]} width="w-48" />}
    </FilterBar>
  );
}

/* ---------------- Sector colour (categorical, stable per entity) ---------------- */

const DOMAIN_ORDER = ["Built environment", "Digital", "Facility services", "Advisory", "Energy", "Operations", "Health", "Supplies"];
export const DOMAIN_COLORS: Record<string, string> = {
  "Built environment": "#2563a8", Digital: "#d0782a", "Facility services": "#17917a", Advisory: "#7c5cc4", Energy: "#c4476b",
  Operations: "#8A9BB4", Health: "#8A9BB4", Supplies: "#8A9BB4",
};
export function domainOrder() {
  return DOMAIN_ORDER;
}

/* ---------------- Save toggle ---------------- */

export function SaveButton({ id, compact = false }: { id: string; compact?: boolean }) {
  const { state, dispatch, toast, hydrated } = useWorkspace();
  const saved = hydrated && !!state.saved[id];
  return (
    <button
      onClick={(e) => { e.stopPropagation(); dispatch({ type: "toggleSave", opportunityId: id }); toast(saved ? "Removed from saved opportunities" : "Saved — tracking as Watching"); }}
      className={clsx(compact ? "btn-ghost !h-7 !px-1.5" : "btn", saved && "!text-accent-700")}
      aria-label={saved ? "Unsave opportunity" : "Save opportunity"}
      title={saved ? "Saved" : "Save"}
    >
      {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
      {!compact && (saved ? "Saved" : "Save")}
    </button>
  );
}

/* ---------------- Opportunity table (reused across modules) ---------------- */

export function oppColumns(opts: { showBuyer?: boolean; showSave?: boolean } = {}): Column<Opportunity>[] {
  const c = getContext();
  const cols: Column<Opportunity>[] = [
    {
      key: "ref", header: "Reference / object", sort: (o) => o.reference, width: "38%",
      render: (o) => (
        <div className="min-w-[240px]">
          <Link href={`/opportunities/${o.id}`} className="font-mono text-[11.5px] text-accent-700 hover:underline">{o.reference}</Link>
          <div className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-ink-900">{o.title}</div>
          {c.duplicates.some((d) => d.id === o.id) && <span className="text-[10.5px] font-medium text-signal-bad">Detected duplicate</span>}
        </div>
      ),
    },
  ];
  if (opts.showBuyer !== false) cols.push({ key: "buyer", header: "Buyer", sort: (o) => (o.buyerId ? c.buyer.get(o.buyerId)?.acronym : null), hideBelow: "md", render: (o) => o.buyerId ? <Link href={`/buyers/${o.buyerId}`} className="hover:text-accent-700" title={c.buyer.get(o.buyerId)?.name}><span className="font-medium">{c.buyer.get(o.buyerId)?.acronym}</span><div className="text-[11.5px] text-ink-500">{o.city ?? "—"}</div></Link> : <span className="text-ink-400">Not identified</span> });
  cols.push(
    { key: "sector", header: "Sector", sort: (o) => (o.sectorId ? c.sector.get(o.sectorId)?.name : null), hideBelow: "lg", render: (o) => <span className="text-[12.5px]">{o.sectorId ? c.sector.get(o.sectorId)?.name : <span className="text-ink-400">Unclassified</span>}</span> },
    { key: "pub", header: "Published", sort: (o) => o.publicationDate, hideBelow: "xl", render: (o) => <span className="tnum whitespace-nowrap text-[12.5px]">{f.shortDate(o.publicationDate)}</span> },
    { key: "deadline", header: "Deadline", sort: (o) => o.deadline, render: (o) => <span className="tnum whitespace-nowrap text-[12.5px]">{f.shortDate(o.deadline)}</span> },
    { key: "value", header: "Est. value", align: "right", sort: (o) => o.estimatedValue, render: (o) => <span className="whitespace-nowrap">{o.estimatedValue ? f.mad(o.estimatedValue, { unit: false }) : <span className="text-ink-400">n/a</span>}</span> },
    { key: "status", header: "Status", sort: (o) => o.status, render: (o) => <StatusBadge status={o.status} /> },
  );
  if (opts.showSave) cols.push({ key: "save", header: "", width: "36px", render: (o) => <SaveButton id={o.id} compact /> });
  return cols;
}

export function OppTable({ rows, pageSize = 10, showBuyer = true, showSave = true, initialSort }: { rows: Opportunity[]; pageSize?: number; showBuyer?: boolean; showSave?: boolean; initialSort?: { key: string; dir: "asc" | "desc" } }) {
  return <DataTable rows={rows} columns={oppColumns({ showBuyer, showSave })} rowKey={(o) => o.id} rowHref={(o) => `/opportunities/${o.id}`} pageSize={pageSize} initialSort={initialSort ?? { key: "pub", dir: "desc" }} dense />;
}
