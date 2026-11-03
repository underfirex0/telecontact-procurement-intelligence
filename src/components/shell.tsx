"use client";
import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Activity, BarChart3, Bell, Building2, ClipboardCheck, Compass, FileText, Gauge, Handshake, Landmark, Menu, Network, Radar,
  Search, Settings, ShieldCheck, Trophy, Users, X, LogOut, RotateCcw,
} from "lucide-react";
import { getContext } from "@/lib/services/data-service";
import { CURRENT_USER, useMeetings, useSuppliers, useWorkspace } from "@/lib/services/workspace";
import { futureSignals } from "@/lib/analytics/recurrence";
import { matchesSearch } from "@/lib/query";
import { addDays } from "@/lib/dates";
import * as f from "@/lib/format";
import { Crumb, Popover } from "./ui";

const NAV: { group: string; items: { href: string; label: string; icon: typeof Gauge; n: string }[] }[] = [
  { group: "Intelligence", items: [
    { href: "/", label: "Overview", icon: Gauge, n: "01" },
    { href: "/opportunities", label: "Opportunities", icon: Compass, n: "02" },
    { href: "/buyers", label: "Buyers", icon: Landmark, n: "03" },
    { href: "/competitors", label: "Competitors", icon: Building2, n: "04" },
    { href: "/awardees", label: "Awardees", icon: Trophy, n: "05" },
    { href: "/market", label: "Market Intelligence", icon: BarChart3, n: "06" },
    { href: "/signals", label: "Future Signals", icon: Radar, n: "07" },
  ] },
  { group: "Network", items: [
    { href: "/suppliers", label: "Suppliers & Partners", icon: Network, n: "08" },
    { href: "/acquisition", label: "Provider Acquisition", icon: Handshake, n: "09" },
    { href: "/talent", label: "Talent & Local Experts", icon: Users, n: "10" },
  ] },
  { group: "Execution", items: [
    { href: "/bids", label: "Bid Workspace", icon: ClipboardCheck, n: "11" },
    { href: "/reports", label: "Reports", icon: FileText, n: "12" },
    { href: "/settings", label: "Settings", icon: Settings, n: "13" },
  ] },
];

const SECTION_LABEL: Record<string, string> = {
  "": "Overview", opportunities: "Opportunities", buyers: "Buyers", competitors: "Competitors", awardees: "Awardees", market: "Market Intelligence",
  signals: "Future Signals", suppliers: "Suppliers & Partners", acquisition: "Provider Acquisition", talent: "Talent & Local Experts", bids: "Bid Workspace",
  reports: "Reports", settings: "Settings", quality: "Data Quality", compare: "Compare",
};

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden>
      <rect width="28" height="28" rx="5" fill="#0B1E36" />
      <path d="M7 9h14M14 9v11" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="20.5" cy="19.5" r="2.4" fill="#4C8BD6" />
    </svg>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <div className="flex h-full flex-col">
      <Link href="/" className="flex items-center gap-2.5 px-4 pb-4 pt-4" onClick={onNavigate}>
        <BrandMark className="h-8 w-8 shrink-0" />
        <div className="leading-none">
          <div className="text-[13px] font-bold tracking-[0.16em] text-ink-900">TELECONTACT</div>
          <div className="mt-1 text-[9.5px] font-semibold tracking-[0.2em] text-accent">INTELLIGENCE</div>
        </div>
      </Link>
      <div className="mx-4 mb-3 border-y border-line py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-500">Procurement Intelligence</div>
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {NAV.map((g) => (
          <div key={g.group} className="mb-3">
            <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">{g.group}</div>
            {g.items.map((it) => {
              const on = active(it.href);
              const Icon = it.icon;
              return (
                <Link key={it.href} href={it.href} onClick={onNavigate}
                  className={clsx("focus-ring group relative flex items-center gap-2.5 rounded-[5px] px-2 py-[6px] text-[13px] transition-colors", on ? "bg-white font-medium text-ink-900 shadow-hair" : "text-ink-600 hover:bg-white/70 hover:text-ink-900")}>
                  {on && <span className="absolute -left-2 top-1.5 h-[18px] w-[2px] rounded-r bg-accent" />}
                  <Icon size={15} strokeWidth={on ? 2.1 : 1.7} className={on ? "text-accent" : "text-ink-400 group-hover:text-ink-600"} />
                  <span className="flex-1 truncate">{it.label}</span>
                  <span className="font-mono text-[9.5px] text-ink-300">{it.n}</span>
                </Link>
              );
            })}
          </div>
        ))}
        <div className="mb-3">
          <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">Governance</div>
          <Link href="/quality" onClick={onNavigate} className={clsx("focus-ring relative flex items-center gap-2.5 rounded-[5px] px-2 py-[6px] text-[13px]", active("/quality") ? "bg-white font-medium text-ink-900 shadow-hair" : "text-ink-600 hover:bg-white/70")}>
            {active("/quality") && <span className="absolute -left-2 top-1.5 h-[18px] w-[2px] rounded-r bg-accent" />}
            <ShieldCheck size={15} strokeWidth={1.7} className={active("/quality") ? "text-accent" : "text-ink-400"} />
            Data Quality
          </Link>
        </div>
      </nav>
      <div className="border-t border-line px-4 py-3 text-[10.5px] leading-snug text-ink-500">
        <div className="font-semibold text-signal-warn">SYNTHETIC DEMO DATA</div>
        Prototype for demonstration. Not an officially launched or approved Telecontact product.
      </div>
    </div>
  );
}

/* ---------------- Global search ---------------- */

interface Hit { kind: string; id: string; label: string; sub: string; href: string }

function GlobalSearch() {
  const router = useRouter();
  const suppliers = useSuppliers();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); ref.current?.focus(); setOpen(true); }
      if (e.key === "/" && !(e.target as HTMLElement).closest("input,textarea,select")) { e.preventDefault(); ref.current?.focus(); setOpen(true); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  const hits = useMemo<Hit[]>(() => {
    if (q.trim().length < 2) return [];
    const c = getContext();
    const out: Hit[] = [];
    const take = <T,>(rows: T[], fields: ((r: T) => string | null | undefined)[], map: (r: T) => Hit, n: number) => {
      for (const r of rows) {
        if (out.filter((h) => h.kind === map(r).kind).length >= n) break;
        if (matchesSearch(r, q, fields)) out.push(map(r));
      }
    };
    take(c.clean, [(o) => o.reference, (o) => o.title, (o) => o.city, (o) => (o.buyerId ? c.buyer.get(o.buyerId)?.acronym : "")], (o) => ({ kind: "Opportunity", id: o.id, label: o.title, sub: `${o.reference} · ${o.status}`, href: `/opportunities/${o.id}` }), 6);
    take(c.ds.buyers, [(b) => b.name, (b) => b.acronym, (b) => b.city], (b) => ({ kind: "Buyer", id: b.id, label: b.name, sub: `${b.acronym} · ${b.city}`, href: `/buyers/${b.id}` }), 4);
    take(c.ds.companies, [(x) => x.name, (x) => x.city, (x) => x.ice], (x) => ({ kind: "Company", id: x.id, label: x.name, sub: `${x.city} · ${c.sector.get(x.sectorIds[0])?.name}`, href: `/competitors/${x.id}` }), 4);
    take(suppliers, [(s) => s.name, (s) => s.country, (s) => s.city, (s) => s.services.join(" ")], (s) => ({ kind: "Supplier", id: s.id, label: s.name, sub: `${s.country} · ${s.status}`, href: `/suppliers/${s.id}` }), 4);
    return out;
  }, [q, suppliers]);
  const go = (h: Hit) => { router.push(h.href); setOpen(false); setQ(""); ref.current?.blur(); };
  return (
    <div className="relative w-full max-w-[460px]">
      <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
      <input
        ref={ref}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setSel(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(hits.length - 1, s + 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
          if (e.key === "Enter") {
            if (hits[sel]) go(hits[sel]);
            else if (q.trim()) { router.push(`/opportunities?q=${encodeURIComponent(q.trim())}`); setOpen(false); }
          }
          if (e.key === "Escape") { setOpen(false); ref.current?.blur(); }
        }}
        placeholder="Search tenders, buyers, companies, suppliers…"
        className="field !h-8 !rounded-[6px] !border-line !bg-canvas pl-8 pr-12 focus:!bg-white"
        aria-label="Global search"
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-white px-1 font-mono text-[10px] text-ink-400 sm:block">Ctrl K</kbd>
      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[420px] overflow-y-auto rounded-md bg-white py-1 shadow-pop">
          {hits.length === 0 && <div className="px-3 py-3 text-sm text-ink-500">No matches. Press Enter to search all opportunities.</div>}
          {hits.map((h, i) => (
            <button key={h.kind + h.id} onMouseDown={(e) => { e.preventDefault(); go(h); }} onMouseEnter={() => setSel(i)}
              className={clsx("flex w-full items-start gap-3 px-3 py-1.5 text-left", i === sel && "bg-accent-50")}>
              <span className="mt-[2px] w-[70px] shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-400">{h.kind}</span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] text-ink-900">{h.label}</span>
                <span className="block truncate text-[11px] text-ink-500">{h.sub}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Notifications (computed from records) ---------------- */

interface Notice { id: string; title: string; body: string; href: string; when: string; kind: "deadline" | "followup" | "meeting" | "signal" }

function useNotices(): Notice[] {
  const suppliers = useSuppliers();
  const meetings = useMeetings();
  const { state } = useWorkspace();
  return useMemo(() => {
    const c = getContext();
    const ref = c.ref;
    const out: Notice[] = [];
    for (const o of c.clean.filter((x) => x.status === "Closing soon")) out.push({ id: `dl-${o.id}`, kind: "deadline", title: "Deadline approaching", body: `${o.reference} closes ${f.date(o.deadline)}`, href: `/opportunities/${o.id}`, when: o.deadline! });
    for (const id of Object.keys(state.saved)) {
      const o = c.opp.get(id);
      if (o?.deadline && o.deadline >= ref && o.deadline <= addDays(ref, 21) && o.status !== "Closing soon") out.push({ id: `dls-${id}`, kind: "deadline", title: "Saved tender deadline", body: `${o.reference} closes ${f.date(o.deadline)}`, href: `/opportunities/${id}`, when: o.deadline });
    }
    for (const s of suppliers.filter((x) => x.followUpDate && x.followUpDate <= addDays(ref, 3) && !["Rejected", "Inactive"].includes(x.status))) out.push({ id: `fu-${s.id}-${s.followUpDate}`, kind: "followup", title: s.followUpDate! < ref ? "Follow-up overdue" : "Follow-up due", body: `${s.name} — ${f.date(s.followUpDate)}`, href: `/suppliers/${s.id}`, when: s.followUpDate! });
    for (const m of meetings.filter((x) => x.status === "Scheduled" && x.date >= ref && x.date <= addDays(ref, 7))) out.push({ id: `mt-${m.id}`, kind: "meeting", title: "Meeting this week", body: `${m.subject} · ${f.date(m.date)} ${m.time}`, href: `/suppliers/${m.supplierId}`, when: m.date });
    for (const s of futureSignals(c).filter((x) => x.state === "Within window" && x.level !== "Low").slice(0, 4)) out.push({ id: `sg-${s.id}`, kind: "signal", title: "Signal window open", body: `${s.buyerName.split(" — ")[0]} · ${s.sectorName}`, href: `/signals?focus=${s.id}`, when: s.windowStart });
    return out.sort((a, b) => a.when.localeCompare(b.when));
  }, [suppliers, meetings, state.saved]);
}

function Notifications() {
  const notices = useNotices();
  const { state, dispatch, hydrated } = useWorkspace();
  const unread = hydrated ? notices.filter((n) => !state.readNotifications.includes(n.id)) : [];
  return (
    <Popover width="w-[360px]" trigger={() => (
      <button className="btn-ghost relative !px-2" aria-label="Notifications">
        <Bell size={16} />
        {unread.length > 0 && <span className="tnum absolute right-0.5 top-0.5 min-w-[15px] rounded-full bg-signal-bad px-1 text-center text-[9.5px] font-semibold leading-[15px] text-white">{unread.length}</span>}
      </button>
    )}>
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <div className="text-[13px] font-semibold">Notifications</div>
            <button className="text-xs text-accent-700 hover:underline" onClick={() => dispatch({ type: "markRead", ids: notices.map((n) => n.id) })}>Mark all read</button>
          </div>
          <div className="max-h-[380px] overflow-y-auto">
            {notices.length === 0 && <div className="px-3 py-6 text-center text-sm text-ink-500">Nothing requires attention.</div>}
            {notices.map((n) => (
              <Link key={n.id} href={n.href} onClick={() => { dispatch({ type: "markRead", ids: [n.id] }); close(); }} className="flex gap-2.5 border-b border-line-soft px-3 py-2 hover:bg-canvas">
                <span className={clsx("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", state.readNotifications.includes(n.id) ? "bg-transparent" : "bg-accent")} />
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-medium text-ink-900">{n.title}</span>
                  <span className="block truncate text-[12px] text-ink-600">{n.body}</span>
                </span>
              </Link>
            ))}
          </div>
          <div className="px-3 py-2 text-[10.5px] text-ink-500">Generated from synthetic records relative to {f.date(getContext().ref)}.</div>
        </div>
      )}
    </Popover>
  );
}

function Profile() {
  const { dispatch, toast } = useWorkspace();
  return (
    <Popover width="w-64" trigger={() => (
      <button className="focus-ring flex items-center gap-2 rounded-[6px] py-1 pl-1 pr-2 hover:bg-canvas">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-800 text-[11px] font-semibold text-white">DU</span>
        <span className="hidden text-left leading-tight lg:block">
          <span className="block text-[12.5px] font-medium text-ink-900">Demo User</span>
          <span className="block text-[10.5px] text-ink-500">Analyst · Demo workspace</span>
        </span>
      </button>
    )}>
      {(close) => (
        <div className="py-1 text-[13px]">
          <div className="border-b border-line px-3 py-2">
            <div className="font-medium">{CURRENT_USER}</div>
            <div className="text-xs text-ink-500">Fictional profile · no authentication in prototype</div>
          </div>
          <Link href="/settings" onClick={close} className="flex items-center gap-2 px-3 py-2 hover:bg-canvas"><Settings size={14} /> Workspace settings</Link>
          <button onClick={() => { if (confirm("Reset all demo workspace changes (saved tenders, assessments, suppliers, meetings)?")) { dispatch({ type: "reset" }); toast("Demo workspace reset"); } close(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-canvas"><RotateCcw size={14} /> Reset demo workspace</button>
          <div className="flex items-center gap-2 px-3 py-2 text-ink-400"><LogOut size={14} /> Sign out (disabled in demo)</div>
        </div>
      )}
    </Popover>
  );
}

function useCrumbs() {
  const path = usePathname();
  const c = getContext();
  const parts = path.split("/").filter(Boolean);
  const items: { label: string; href?: string }[] = [{ label: "Telecontact Intelligence", href: "/" }];
  if (!parts.length) items.push({ label: "Overview" });
  parts.forEach((p, i) => {
    const href = "/" + parts.slice(0, i + 1).join("/");
    let label = SECTION_LABEL[p] ?? decodeURIComponent(p);
    if (i === 1) {
      if (parts[0] === "opportunities" || parts[0] === "bids") label = c.opp.get(p)?.reference ?? p;
      if (parts[0] === "buyers") label = c.buyer.get(p)?.acronym ?? label;
      if (parts[0] === "competitors") label = c.company.get(p)?.name ?? p;
    }
    items.push({ label, href: i < parts.length - 1 ? href : undefined });
  });
  return items;
}

function Toasts() {
  const { toasts } = useWorkspace();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="animate-fadein rounded-[6px] bg-ink-900 px-3.5 py-2 text-[13px] text-white shadow-pop">{t.msg}</div>
      ))}
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [mobile, setMobile] = useState(false);
  const crumbs = useCrumbs();
  const path = usePathname();
  useEffect(() => setMobile(false), [path]);
  return (
    <div className="min-h-screen bg-white">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-[236px] border-r border-line bg-[#F4F6F9] lg:block">
        <Sidebar />
      </aside>
      {mobile && (
        <div className="fixed inset-0 z-50 bg-ink-900/30 lg:hidden" onClick={() => setMobile(false)}>
          <aside className="h-full w-[260px] bg-[#F4F6F9]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end p-2"><button className="btn-ghost" onClick={() => setMobile(false)} aria-label="Close menu"><X size={16} /></button></div>
            <Sidebar onNavigate={() => setMobile(false)} />
          </aside>
        </div>
      )}
      <div className="lg:pl-[236px]">
        <div className="no-print sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
          <div className="flex h-[52px] items-center gap-3 px-4 md:px-8">
            <button className="btn-ghost !px-1.5 lg:hidden" onClick={() => setMobile(true)} aria-label="Open menu"><Menu size={18} /></button>
            <div className="hidden min-w-0 flex-1 md:block"><Crumb items={crumbs} /></div>
            <div className="flex flex-1 justify-end md:flex-none"><GlobalSearch /></div>
            <Notifications />
            <Profile />
          </div>
          <div className="flex items-center gap-2 border-t border-[#F0DDB8] bg-[#FDF9F0] px-4 py-[3px] text-[10.5px] text-[#7A4D05] md:px-8">
            <Activity size={11} />
            <span className="font-semibold tracking-[0.08em]">SYNTHETIC DEMO DATA</span>
            <span className="hidden truncate sm:inline">— fictional Moroccan procurement records generated for demonstration. Reference date {f.date(getContext().ref)}.</span>
          </div>
        </div>
        <main className="min-w-0">{children}</main>
      </div>
      <Toasts />
    </div>
  );
}

