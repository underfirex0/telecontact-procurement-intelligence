"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { GitCompare, Search } from "lucide-react";
import { getContext } from "@/lib/services/data-service";
import { companySummaries, type CompanyRole } from "@/lib/analytics";
import { query } from "@/lib/query";
import * as f from "@/lib/format";
import { DataTable } from "@/components/data-table";
import { Badge, Chip, FilterBar, Note, PageHeader, SelectFilter } from "@/components/ui";

const ROLE_TONE: Record<CompanyRole, "green" | "violet" | "blue" | "neutral"> = { "Verified awardee": "green", "Shortlisted participant": "violet", Participant: "blue", "No recorded activity": "neutral" };

export default function CompetitorsPage() {
  const c = getContext();
  const router = useRouter();
  const all = useMemo(() => companySummaries(c), [c]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<string>("");
  const [sector, setSector] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const rows = useMemo(() => query(all, {
    search: q, searchFields: [(r) => r.name, (r) => r.city, (r) => r.primarySector, (r) => c.company.get(r.id)?.ice],
    filters: [(r) => !role || r.role === role, (r) => !sector || (c.company.get(r.id)?.sectorIds.includes(sector) ?? false)],
  }).rows, [all, q, role, sector, c]);
  const roleCount = (r: CompanyRole) => all.filter((x) => x.role === r).length;
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 3 ? s : [...s, id]));

  return (
    <div>
      <PageHeader eyebrow="Module 04 · Competitor intelligence" title="Companies in the market"
        description="Recorded bids and verified awards are tracked separately. Win rates are computed only where bidder lists and outcomes were disclosed."
        meta={<><span>{all.length} fictional companies</span><span>{c.ds.participations.length} recorded participations</span><span>{c.ds.awards.length} verified awards</span></>}
        actions={<button className="btn-primary" disabled={sel.length < 2} onClick={() => router.push(`/competitors/compare?ids=${sel.join(",")}`)}><GitCompare size={14} /> Compare {sel.length ? `(${sel.length})` : ""}</button>}>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={!role} onClick={() => setRole("")}>All · {all.length}</Chip>
          {(["Verified awardee", "Shortlisted participant", "Participant", "No recorded activity"] as CompanyRole[]).map((r) => <Chip key={r} active={role === r} onClick={() => setRole(r)}>{r} · {roleCount(r)}</Chip>)}
        </div>
      </PageHeader>
      <FilterBar>
        <label className="block w-72"><span className="label !mb-0.5 !text-[11px]">Search</span>
          <div className="relative"><Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" /><input className="field !h-[30px] pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Company, city, identifier…" /></div>
        </label>
        <SelectFilter label="Sector presence" value={sector} onChange={setSector} options={[{ value: "", label: "All sectors" }, ...c.ds.sectors.map((s) => ({ value: s.id, label: s.name }))]} width="w-56" />
      </FilterBar>
      <div className="px-5 py-5 md:px-8">
        <div className="mb-4"><Note>Roles: <b>Verified awardee</b> — at least one recorded award. <b>Shortlisted participant</b> — shortlisted, never awarded. <b>Participant</b> — recorded bids only. A company can appear as a participant on many tenders without winning.</Note></div>
        <DataTable rows={rows} rowKey={(r) => r.id} rowHref={(r) => `/competitors/${r.id}`} pageSize={20} initialSort={{ key: "aw", dir: "desc" }} selected={(r) => sel.includes(r.id)}
          columns={[
            { key: "sel", header: "", width: "32px", render: (r) => <input type="checkbox" aria-label={`Select ${r.name}`} checked={sel.includes(r.id)} onChange={() => toggle(r.id)} disabled={!sel.includes(r.id) && sel.length >= 3} /> },
            { key: "n", header: "Company", sort: (r) => r.name, width: "28%", render: (r) => <div><Link href={`/competitors/${r.id}`} className="font-medium hover:text-accent-700">{r.name}</Link><div className="text-[11.5px] text-ink-500">{r.primarySector} · {r.city} · {r.size}</div></div> },
            { key: "role", header: "Role", sort: (r) => r.role, render: (r) => <Badge tone={ROLE_TONE[r.role]}>{r.role}</Badge> },
            { key: "p", header: "Bids", align: "right", sort: (r) => r.participations, render: (r) => r.participations || <span className="text-ink-400">0</span> },
            { key: "wr", header: "Win rate", align: "right", sort: (r) => r.winRate, render: (r) => r.winRate === null ? <span className="text-ink-400">n/a</span> : <span title={`${r.wins} of ${r.decided} decided`}>{f.pct(r.winRate)} <span className="text-[11px] text-ink-400">({r.wins}/{r.decided})</span></span> },
            { key: "aw", header: "Awards", align: "right", sort: (r) => r.awards, render: (r) => r.awards || <span className="text-ink-400">0</span> },
            { key: "v", header: "Award value", align: "right", sort: (r) => r.awardValue, render: (r) => (r.awardValue ? f.mad(r.awardValue, { unit: false }) : <span className="text-ink-400">—</span>) },
            { key: "b", header: "Buyers", align: "right", hideBelow: "lg", sort: (r) => r.buyers, render: (r) => r.buyers },
            { key: "rb", header: "Repeat buyers", align: "right", hideBelow: "lg", sort: (r) => r.repeatBuyers, render: (r) => r.repeatBuyers },
            { key: "la", header: "Last award", hideBelow: "xl", sort: (r) => r.lastAward, render: (r) => <span className="tnum text-[12px]">{f.shortDate(r.lastAward)}</span> },
          ]} />
      </div>
    </div>
  );
}
