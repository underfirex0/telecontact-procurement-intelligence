"use client";
import { t, tv } from "@/lib/i18n";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { GitCompare, Search } from "lucide-react";
import { getContext } from "@/lib/services/data-service";
import { buyerSummaries } from "@/lib/analytics";
import { query } from "@/lib/query";
import * as f from "@/lib/format";
import { DataTable } from "@/components/data-table";
import { Badge, FilterBar, PageHeader, SelectFilter } from "@/components/ui";

export default function BuyersPage() {
  const c = getContext();
  const router = useRouter();
  const all = useMemo(() => buyerSummaries(c), [c]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [region, setRegion] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const rows = useMemo(() => query(all, {
    search: q, searchFields: [(b) => b.name, (b) => b.acronym, (b) => b.city, (b) => b.topSector],
    filters: [(b) => !type || b.type === type, (b) => !region || c.buyer.get(b.id)?.regionId === region],
  }).rows, [all, q, type, region, c]);
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 3 ? s : [...s, id]));

  return (
    <div>
      <PageHeader eyebrow={t("Module 03 · Buyer intelligence")} title={t("Contracting authorities")}
        description={t("Who buys, what they buy, how regularly, and whom they award to. Select up to three buyers to compare them side by side.")}
        meta={<><span>{c.ds.buyers.length} {t("fictional buyers")}</span><span>{all.filter((b) => b.recurringLines > 0).length} {t("with recurring purchasing lines")}</span><span>{all.filter((b) => b.active > 0).length} {t("with active tenders")}</span></>}
        actions={<button className="btn-primary" disabled={sel.length < 2} onClick={() => router.push(`/buyers/compare?ids=${sel.join(",")}`)}><GitCompare size={14} /> {t("Compare")} {sel.length ? `(${sel.length})` : ""}</button>} />
      <FilterBar>
        <label className="block w-72"><span className="label !mb-0.5 !text-[11px]">{t("Search")}</span>
          <div className="relative"><Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" /><input className="field !h-[30px] pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Name, acronym, city…")} /></div>
        </label>
        <SelectFilter label={t("Buyer type")} value={type} onChange={setType} options={[{ value: "", label: t("All types") }, ...[...new Set(c.ds.buyers.map((b) => b.type))].sort().map((tx) => ({ value: tx, label: tx }))]} />
        <SelectFilter label={t("Region")} value={region} onChange={setRegion} options={[{ value: "", label: t("All regions") }, ...c.ds.regions.map((r) => ({ value: r.id, label: r.name }))]} />
      </FilterBar>
      <div className="px-5 py-5 md:px-8">
        <DataTable rows={rows} rowKey={(b) => b.id} rowHref={(b) => `/buyers/${b.id}`} pageSize={20} initialSort={{ key: "opps", dir: "desc" }} selected={(b) => sel.includes(b.id)}
          columns={[
            { key: "sel", header: "", width: "32px", render: (b) => <input type="checkbox" aria-label={t("Select {v0}", { v0: b.acronym })} checked={sel.includes(b.id)} onChange={() => toggle(b.id)} disabled={!sel.includes(b.id) && sel.length >= 3} /> },
            { key: "name", header: t("Buyer"), sort: (b) => b.name, width: "34%", render: (b) => <div><Link href={`/buyers/${b.id}`} className="font-medium text-ink-900 hover:text-accent-700">{b.name}</Link><div className="text-[11.5px] text-ink-500"><span className="font-mono">{b.acronym}</span> · {tv(b.type)} · {b.city}</div></div> },
            { key: "opps", header: t("Opps."), align: "right", sort: (b) => b.opportunities, render: (b) => b.opportunities },
            { key: "act", header: t("Active"), align: "right", sort: (b) => b.active, render: (b) => b.active ? <Badge tone="blue">{b.active}</Badge> : <span className="text-ink-400">0</span> },
            { key: "l24", header: t("Last 24m"), align: "right", hideBelow: "lg", sort: (b) => b.last24m, render: (b) => b.last24m },
            { key: "med", header: t("Median value"), align: "right", hideBelow: "md", sort: (b) => b.medianValue, render: (b) => f.mad(b.medianValue, { unit: false }) },
            { key: "top", header: t("Main sector"), hideBelow: "xl", sort: (b) => b.topSector, render: (b) => <span className="text-[12.5px]">{b.topSector}<span className="text-ink-400"> · {b.sectors} {t("sectors")}</span></span> },
            { key: "rec", header: t("Recurring lines"), align: "right", hideBelow: "lg", sort: (b) => b.recurringLines, render: (b) => b.recurringLines },
            { key: "aw", header: t("Awards / awardees"), align: "right", hideBelow: "md", sort: (b) => b.awards, render: (b) => `${b.awards} / ${b.awardees}` },
            { key: "last", header: t("Last published"), hideBelow: "xl", sort: (b) => b.lastPublication, render: (b) => <span className="tnum text-[12px]">{f.shortDate(b.lastPublication)}</span> },
          ]} />
      </div>
    </div>
  );
}
