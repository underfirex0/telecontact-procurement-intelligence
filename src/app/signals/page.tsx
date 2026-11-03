"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { getContext } from "@/lib/services/data-service";
import { futureSignals, type FutureSignal } from "@/lib/analytics";
import { addMonths, diffDays, monthsBetween } from "@/lib/dates";
import { query } from "@/lib/query";
import * as f from "@/lib/format";
import { Badge, Chip, DefList, Drawer, FilterBar, Finding, LevelBadge, Meter, Note, PageHeader, SelectFilter, SubHead, clsx } from "@/components/ui";

const LEVEL_COLOR = { High: "#2563a8", Medium: "#6E95C6", Low: "#B3C0D1" };

function SignalsInner() {
  const c = getContext();
  const sp = useSearchParams();
  const router = useRouter();
  const all = useMemo(() => futureSignals(c), [c]);
  const [level, setLevel] = useState("");
  const [state, setState] = useState("active");
  const [sector, setSector] = useState("");
  const [q, setQ] = useState("");
  const focus = sp.get("focus");
  const selected = all.find((s) => s.id === focus) ?? null;
  const rows = useMemo(() => query(all, {
    search: q, searchFields: [(s) => s.buyerName, (s) => s.sectorName],
    filters: [(s) => !level || s.level === level, (s) => !sector || s.sectorId === sector, (s) => (state === "active" ? s.state !== "Overdue" : state ? s.state === state : true)],
  }).rows, [all, q, level, sector, state]);

  const start = addMonths(c.ref, -4);
  const end = addMonths(c.ref, 18);
  const span = diffDays(end, start);
  const x = (d: string) => Math.round(Math.max(0, Math.min(100, (diffDays(d, start) / span) * 100)) * 100) / 100;
  const months = monthsBetween(start, end);
  const open = (id: string | null) => router.replace(id ? `/signals?focus=${id}` : "/signals", { scroll: false });

  return (
    <div>
      <PageHeader eyebrow="Module 07 · Future procurement intelligence" title="Future procurement signals"
        description="Expected re-procurement windows derived from buyers' historical publication cycles and contract durations. Transparent statistical rules — no black-box prediction."
        meta={<><span>{all.length} signals from {new Set(all.map((s) => s.buyerId)).size} buyers</span><span>{all.filter((s) => s.level === "High").length} high confidence</span><span>{all.filter((s) => s.state === "Within window").length} windows open now</span></>}
        actions={<Link href="/reports?type=signals" className="btn"><FileText size={14} /> Signals report</Link>}>
        <Note tone="warn">Signals are analytical expectations based on synthetic history. They are <b>not</b> official announcements and do not guarantee that a tender will be published.</Note>
      </PageHeader>
      <FilterBar>
        <label className="block w-60"><span className="label !mb-0.5 !text-[11px]">Search</span><input className="field !h-[30px]" placeholder="Buyer or sector…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <SelectFilter label="Sector" value={sector} onChange={setSector} options={[{ value: "", label: "All sectors" }, ...c.ds.sectors.map((s) => ({ value: s.id, label: s.name }))]} />
        <div><span className="label !mb-0.5 !text-[11px]">Confidence</span><div className="flex gap-1">{["", "High", "Medium", "Low"].map((l) => <Chip key={l} active={level === l} onClick={() => setLevel(l)}>{l || "All"}</Chip>)}</div></div>
        <div><span className="label !mb-0.5 !text-[11px]">State</span><div className="flex gap-1">{[["active", "Upcoming + open"], ["Within window", "Window open"], ["Upcoming", "Upcoming"], ["Overdue", "Overdue"], ["", "All"]].map(([v, l]) => <Chip key={v} active={state === v} onClick={() => setState(v)}>{l}</Chip>)}</div></div>
      </FilterBar>

      <div className="px-5 py-6 md:px-8">
        <div className="mb-2 flex items-center justify-between text-[12px] text-ink-500">
          <span><b className="text-ink-900">{rows.length}</b> signals · horizon {f.shortDate(start)} → {f.shortDate(end)}</span>
          <span className="flex gap-3">{(["High", "Medium", "Low"] as const).map((l) => <span key={l} className="flex items-center gap-1"><span className="h-2 w-3 rounded-[2px]" style={{ background: LEVEL_COLOR[l] }} />{l}</span>)}<span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-ink-700" />last publication</span></span>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[860px]">
            {/* axis */}
            <div className="grid grid-cols-[300px_1fr_120px] border-b border-line-strong pb-1 text-[10.5px] text-ink-400">
              <div className="eyebrow">Buyer · sector</div>
              <div className="relative h-4">
                {months.filter((_, i) => i % 2 === 0).map((m) => <span key={m} className="absolute -translate-x-1/2" style={{ left: `${x(m + "-01")}%` }}>{f.monthLabel(m)}</span>)}
              </div>
              <div className="eyebrow text-right">Confidence</div>
            </div>
            {rows.map((s) => (
              <button key={s.id} onClick={() => open(s.id)} className={clsx("grid w-full grid-cols-[300px_1fr_120px] items-center border-b border-line-soft py-2 text-left hover:bg-canvas", focus === s.id && "bg-accent-50")}>
                <div className="min-w-0 pr-3">
                  <div className="truncate text-[13px] font-medium text-ink-900">{s.buyerName}</div>
                  <div className="truncate text-[11.5px] text-ink-500">{s.sectorName} · n={s.historical.length} · ~{Math.round(s.medianIntervalDays / 30.4)}-month cycle</div>
                </div>
                <div className="relative h-6">
                  {months.map((m) => <span key={m} className="absolute top-0 h-full w-px bg-line-soft" style={{ left: `${x(m + "-01")}%` }} />)}
                  <span className="absolute top-[-4px] h-[32px] w-px bg-signal-bad" style={{ left: `${x(c.ref)}%` }} />
                  {s.lastPublication >= start && <span className="absolute top-[9px] h-2 w-2 -translate-x-1/2 rounded-full bg-ink-700" style={{ left: `${x(s.lastPublication)}%` }} />}
                  <span className={clsx("absolute top-[5px] h-[14px] rounded-[3px]", s.state === "Overdue" && "opacity-50 [background-image:repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(255,255,255,.6)_3px,rgba(255,255,255,.6)_5px)]")} style={{ left: `${x(s.windowStart)}%`, width: `${Math.max(0.6, x(s.windowEnd) - x(s.windowStart))}%`, background: LEVEL_COLOR[s.level] }} />
                  {s.contractEnd && s.contractEnd >= start && s.contractEnd <= end && <span title={`Contract end ${s.contractEnd}`} className="absolute top-[2px] h-5 w-[2px] bg-[#d0782a]" style={{ left: `${x(s.contractEnd)}%` }} />}
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="tnum text-[12px] font-semibold">{Math.round(s.confidence * 100)}</span>
                  <span className="text-[10.5px] text-ink-500">{s.state}</span>
                </div>
              </button>
            ))}
            {rows.length === 0 && <div className="py-10 text-center text-sm text-ink-500">No signals match the filters.</div>}
          </div>
        </div>
        <div className="mt-2 text-[11px] text-ink-500">Red line = reference date ({f.date(c.ref)}). Orange tick = end of the latest recorded contract in the line. Hatched bars = window passed without a captured publication.</div>
      </div>
      <SignalDrawer s={selected} onClose={() => open(null)} />
    </div>
  );
}

function SignalDrawer({ s, onClose }: { s: FutureSignal | null; onClose: () => void }) {
  if (!s) return null;
  return (
    <Drawer open onClose={onClose} title={`${s.buyerName}`} subtitle={`${s.sectorName} · signal ${s.id}`}>
      <div className="flex flex-wrap items-center gap-2"><LevelBadge level={s.level} /><Badge tone={s.state === "Within window" ? "blue" : s.state === "Overdue" ? "red" : "neutral"}>{s.state}</Badge><span className="tnum text-[12px] text-ink-500">confidence score {s.confidence.toFixed(2)}</span></div>
      <div className="mt-4"><DefList cols={2} items={[
        { k: "Potential window", v: <b className="tnum">{f.date(s.windowStart)} → {f.date(s.windowEnd)}</b> },
        { k: "Central estimate", v: f.date(s.expected) },
        { k: "Last publication", v: f.date(s.lastPublication) },
        { k: "Median interval", v: `${s.medianIntervalDays} days` },
        { k: "Latest contract end", v: s.contractEnd ? `${f.date(s.contractEnd)}${s.contractAligned ? " (aligned)" : " (not aligned)"}` : "Unknown" },
        { k: "Typical value", v: f.mad(s.expectedValue) },
        { k: "Current incumbent", v: s.incumbent ? <Link className="link" href={`/competitors/${s.incumbent.id}`}>{s.incumbent.name}</Link> : "None recorded" },
        { k: "Buyer profile", v: <Link className="link" href={`/buyers/${s.buyerId}`}>Open buyer</Link> },
      ]} /></div>
      <div className="mt-5"><SubHead>Explanation</SubHead><Finding kind="interpretation">{s.explanation}</Finding></div>
      <div className="mt-5">
        <SubHead right="sums to the score (bounded 0–1)">Confidence components</SubHead>
        {s.components.map((c) => (
          <div key={c.label} className="grid grid-cols-[180px_1fr_48px] items-center gap-3 py-1 text-[12.5px]">
            <span className="text-ink-700">{c.label}</span>
            <Meter value={Math.abs(c.value) * 100} max={60} tone={c.value < 0 ? "bad" : "accent"} />
            <span className="tnum text-right">{c.value >= 0 ? "+" : ""}{c.value.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="mt-5">
        <SubHead right={`n = ${s.historical.length}`}>Supporting evidence — historical publications</SubHead>
        <table className="tbl dense"><thead><tr><th>Published</th><th>Reference / object</th><th className="!text-right">Value</th><th>Status</th></tr></thead>
          <tbody>{s.historical.map((h) => (
            <tr key={h.id}><td className="tnum text-[12px]">{f.shortDate(h.publicationDate)}</td><td><Link href={`/opportunities/${h.id}`} className="font-mono text-[11px] text-accent-700 hover:underline">{h.reference}</Link><div className="line-clamp-1 text-[12px]">{h.title}</div></td><td className="tnum text-right text-[12px]">{f.mad(h.estimatedValue, { unit: false })}</td><td className="text-[12px]">{h.status}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <div className="mt-5"><Note tone="warn">Not an official announcement. Confirm with the buyer&apos;s procurement plan (programme prévisionnel) when available.</Note></div>
    </Drawer>
  );
}

export default function SignalsPage() {
  return <Suspense><SignalsInner /></Suspense>;
}
