"use client";
/**
 * Telecontact Intelligence — UI primitives.
 * Design language: research-document layout (label column + content column),
 * hairline rules instead of floating cards, tabular figures, restrained colour.
 */
import clsx from "clsx";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { X, Info, ChevronRight } from "lucide-react";
import type { OpportunityStatus, RelationshipStage } from "@/lib/types";
import type { StatementKind } from "@/lib/analytics/dossier";

export { clsx };

/* ---------------- Page header ---------------- */

export function PageHeader({ eyebrow, title, description, actions, meta, children }: {
  eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode; meta?: ReactNode; children?: ReactNode;
}) {
  return (
    <header className="border-b border-line bg-white px-5 pb-5 pt-6 md:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
          <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.01em] text-ink-900">{title}</h1>
          {description && <p className="mt-1.5 text-sm text-ink-600">{description}</p>}
          {meta && <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500">{meta}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </header>
  );
}

/* ---------------- Analytical section: label column + content ---------------- */

export function Section({ index, title, kicker, aside, meta, actions, children, id, wide = false, className }: {
  index?: string; title: ReactNode; kicker?: ReactNode; aside?: ReactNode; meta?: ReactNode; actions?: ReactNode;
  children: ReactNode; id?: string; wide?: boolean; className?: string;
}) {
  return (
    <section id={id} className={clsx("scroll-mt-28 border-b border-line px-5 py-7 md:px-8", className)}>
      <div className={clsx("grid gap-x-10 gap-y-4", wide ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-[250px_minmax(0,1fr)]")}>
        <div className={clsx(wide && "flex flex-wrap items-end justify-between gap-3")}>
          <div>
            <div className="flex items-baseline gap-2">
              {index && <span className="font-mono text-[11px] text-accent">{index}</span>}
              <h2 className="text-[15px] font-semibold tracking-[-0.005em] text-ink-900">{title}</h2>
            </div>
            {kicker && <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">{kicker}</p>}
            {meta && <div className="mt-2.5 space-y-0.5 text-[11.5px] leading-snug text-ink-500">{meta}</div>}
            {aside && <div className="mt-3">{aside}</div>}
          </div>
          {actions && <div className={clsx(!wide && "mt-3", "flex flex-wrap gap-2")}>{actions}</div>}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

/** Sub-block heading inside a section */
export function SubHead({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2 border-b border-line pb-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-600">{children}</h3>
      {right && <div className="text-xs text-ink-500">{right}</div>}
    </div>
  );
}

/* ---------------- Figure strip (replaces KPI cards) ---------------- */

export interface Figure {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  href?: string;
  tone?: "default" | "accent" | "warn";
}

export function FigureStrip({ items, className }: { items: Figure[]; className?: string }) {
  return (
    <div className={clsx("grid grid-cols-2 border-y border-line sm:grid-cols-3", items.length >= 6 ? "lg:grid-cols-6" : items.length === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4", className)}>
      {items.map((f, i) => {
        const body = (
          <div className={clsx("group h-full px-4 py-3.5", "border-line", i > 0 && "border-l", f.href && "hover:bg-canvas")}>
            <div className="text-[11.5px] font-medium text-ink-500">{f.label}</div>
            <div className={clsx("tnum mt-1 text-[22px] font-semibold leading-none tracking-[-0.02em]", f.tone === "accent" ? "text-accent-700" : f.tone === "warn" ? "text-signal-warn" : "text-ink-900")}>{f.value}</div>
            {f.sub && <div className="mt-1.5 text-[11.5px] leading-snug text-ink-500">{f.sub}</div>}
          </div>
        );
        return f.href ? <Link key={i} href={f.href} className="focus-ring block">{body}</Link> : <div key={i}>{body}</div>;
      })}
    </div>
  );
}

/** Small inline label/value pair list */
export function DefList({ items, cols = 2 }: { items: { k: ReactNode; v: ReactNode }[]; cols?: 1 | 2 | 3 | 4 }) {
  return (
    <dl className={clsx("grid gap-x-8 gap-y-2.5 text-sm", cols === 1 ? "grid-cols-1" : cols === 2 ? "grid-cols-1 sm:grid-cols-2" : cols === 3 ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-2 lg:grid-cols-4")}>
      {items.map((it, i) => (
        <div key={i} className="min-w-0">
          <dt className="text-[11.5px] text-ink-500">{it.k}</dt>
          <dd className="mt-0.5 break-words text-ink-900">{it.v}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------------- Badges ---------------- */

type Tone = "neutral" | "blue" | "green" | "amber" | "red" | "violet" | "ink";
const TONES: Record<Tone, string> = {
  neutral: "bg-canvas-sunken text-ink-700 ring-line-strong",
  blue: "bg-accent-50 text-accent-800 ring-accent-100",
  green: "bg-signal-goodbg text-signal-good ring-[#CFE7DA]",
  amber: "bg-signal-warnbg text-signal-warn ring-[#F0DDB8]",
  red: "bg-signal-badbg text-signal-bad ring-[#F1CFD1]",
  violet: "bg-[#F2EFFA] text-[#5B45A6] ring-[#E0D9F3]",
  ink: "bg-ink-900 text-white ring-ink-900",
};

export function Badge({ tone = "neutral", children, dot = false, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 whitespace-nowrap rounded-[4px] px-1.5 py-[1px] text-[11px] font-medium ring-1 ring-inset", TONES[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}

export const STATUS_TONE: Record<OpportunityStatus, Tone> = {
  Open: "blue", "Closing soon": "amber", "Under evaluation": "violet", Closed: "neutral", Awarded: "green", Unsuccessful: "red", Cancelled: "red",
};
export function StatusBadge({ status }: { status: OpportunityStatus }) {
  return <Badge tone={STATUS_TONE[status]} dot>{status}</Badge>;
}

export const STAGE_TONE: Record<RelationshipStage, Tone> = {
  Identified: "neutral", "Not contacted": "neutral", Contacted: "blue", Responded: "blue", "Meeting scheduled": "violet", Negotiation: "amber", "Active partner": "green", Inactive: "neutral", Rejected: "red",
};
export function StageBadge({ stage }: { stage: RelationshipStage }) {
  return <Badge tone={STAGE_TONE[stage]} dot>{stage}</Badge>;
}

export function LevelBadge({ level }: { level: "High" | "Medium" | "Low" }) {
  return <Badge tone={level === "High" ? "green" : level === "Medium" ? "amber" : "neutral"}>{level} confidence</Badge>;
}

export function RiskBadge({ level }: { level: "High" | "Medium" | "Low" }) {
  return <Badge tone={level === "High" ? "red" : level === "Medium" ? "amber" : "neutral"}>{level}</Badge>;
}

export const KIND_META: Record<StatementKind, { label: string; tone: Tone; rule: string; desc: string }> = {
  fact: { label: "Fact", tone: "ink", rule: "border-ink-900", desc: "Copied from a synthetic source record" },
  metric: { label: "Metric", tone: "blue", rule: "border-accent", desc: "Calculated from records" },
  interpretation: { label: "Interpretation", tone: "violet", rule: "border-[#7C5CC4]", desc: "Rule-based reading of metrics" },
  recommendation: { label: "Recommendation", tone: "green", rule: "border-signal-good", desc: "Suggested action" },
  assumption: { label: "Assumption", tone: "amber", rule: "border-signal-warn", desc: "Premise the analysis relies on" },
  unknown: { label: "Unknown", tone: "red", rule: "border-signal-bad", desc: "Not available in the dataset" },
};
export function KindTag({ kind }: { kind: StatementKind }) {
  const m = KIND_META[kind];
  return <Badge tone={m.tone} className="uppercase tracking-[0.06em] !text-[10px]">{m.label}</Badge>;
}

/** A finding line with provenance class and evidence */
export function Finding({ kind, children, evidence }: { kind: StatementKind; children: ReactNode; evidence?: string[] }) {
  return (
    <div className={clsx("border-l-2 py-1 pl-3", KIND_META[kind].rule)}>
      <div className="flex flex-wrap items-start gap-2">
        <KindTag kind={kind} />
        <div className="min-w-0 flex-1 text-[13.5px] leading-relaxed text-ink-800">{children}</div>
      </div>
      {evidence && evidence.length > 0 && <div className="mt-1 pl-0.5"><EvidenceLinks ids={evidence} /></div>}
    </div>
  );
}

/* ---------------- Evidence ---------------- */

export function recordHref(id: string): string | null {
  if (id.startsWith("OPP-")) return `/opportunities/${id.replace(/-L\d+$|-D\d+$/, "")}`;
  if (/^B\d+$/.test(id)) return `/buyers/${id}`;
  if (/^C\d+$/.test(id)) return `/competitors/${id}`;
  if (id.startsWith("SUP-")) return `/suppliers/${id}`;
  return null;
}

export function EvidenceLinks({ ids, max = 6, label = "Evidence" }: { ids: string[]; max?: number; label?: string }) {
  const [open, setOpen] = useState(false);
  const uniq = [...new Set(ids)];
  const shown = open ? uniq : uniq.slice(0, max);
  return (
    <div className="flex flex-wrap items-center gap-1 text-[11px] text-ink-500">
      <span className="mr-0.5 font-medium">{label} ({uniq.length}):</span>
      {shown.map((id) => {
        const href = recordHref(id);
        return href ? (
          <Link key={id} href={href} className="tnum rounded-[3px] bg-canvas px-1 font-mono text-[10.5px] text-accent-700 hover:bg-accent-50">{id}</Link>
        ) : (
          <span key={id} className="tnum rounded-[3px] bg-canvas px-1 font-mono text-[10.5px]">{id}</span>
        );
      })}
      {uniq.length > max && (
        <button onClick={() => setOpen(!open)} className="text-accent-700 hover:underline">{open ? "less" : `+${uniq.length - max} more`}</button>
      )}
    </div>
  );
}

/** Sample / period footnote shown under every chart */
export function ChartNote({ n, period, note, unit = "records" }: { n: number; period?: string; note?: ReactNode; unit?: string }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-500">
      <span className="tnum">n = {n.toLocaleString("en-US")} {unit}</span>
      {period && <span>· {period}</span>}
      <span>· Synthetic demo data</span>
      {note && <span>· {note}</span>}
    </div>
  );
}

/* ---------------- Tabs ---------------- */

export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { id: T; label: ReactNode; count?: number }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={clsx("flex gap-5 overflow-x-auto border-b border-line", className)}>
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={clsx("focus-ring -mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 pb-2 pt-1 text-[13px] font-medium transition-colors", value === t.id ? "border-ink-900 text-ink-900" : "border-transparent text-ink-500 hover:text-ink-800")}
        >
          {t.label}
          {t.count !== undefined && <span className="tnum rounded-[3px] bg-canvas-sunken px-1 text-[10.5px] text-ink-600">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Overlays ---------------- */

export function Modal({ open, onClose, title, children, footer, width = "max-w-2xl" }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; width?: string }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/25 p-4 pt-[6vh]" onMouseDown={onClose}>
      <div role="dialog" aria-modal className={clsx("w-full animate-fadein rounded-md bg-white shadow-pop", width)} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <div className="text-[15px] font-semibold text-ink-900">{title}</div>
          <button className="btn-ghost !px-1.5" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, children, subtitle }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-ink-900/20" onMouseDown={onClose}>
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[640px] animate-fadein flex-col bg-white shadow-pop" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-4">
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-ink-900">{title}</div>
            {subtitle && <div className="mt-0.5 text-xs text-ink-500">{subtitle}</div>}
          </div>
          <button className="btn-ghost !px-1.5" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </aside>
    </div>
  );
}

export function Popover({ trigger, children, align = "right", width = "w-80" }: { trigger: (open: boolean) => ReactNode; children: ReactNode | ((close: () => void) => ReactNode); align?: "left" | "right"; width?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen(!open)}>{trigger(open)}</div>
      {open && (
        <div className={clsx("absolute top-full z-40 mt-1.5 animate-fadein rounded-md bg-white shadow-pop", width, align === "right" ? "right-0" : "left-0")}>
          {typeof children === "function" ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  );
}

/* ---------------- Misc ---------------- */

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-line-strong px-6 py-10 text-center">
      <div className="text-sm font-medium text-ink-800">{title}</div>
      {children && <div className="mt-1 max-w-md text-[13px] text-ink-500">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Note({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" }) {
  return (
    <div className={clsx("flex gap-2 rounded-[5px] px-3 py-2 text-[12.5px] leading-relaxed", tone === "info" ? "bg-accent-50 text-accent-800" : "bg-signal-warnbg text-[#7A4D05]")}>
      <Info size={14} className="mt-[3px] shrink-0" />
      <div>{children}</div>
    </div>
  );
}

/** Horizontal score meter 0–100 */
export function Meter({ value, max = 100, tone = "accent", className }: { value: number; max?: number; tone?: "accent" | "good" | "warn" | "bad" | "ink"; className?: string }) {
  const color = { accent: "bg-accent", good: "bg-signal-good", warn: "bg-[#C9871A]", bad: "bg-signal-bad", ink: "bg-ink-800" }[tone];
  return (
    <div className={clsx("h-1.5 w-full overflow-hidden rounded-full bg-canvas-sunken", className)}>
      <div className={clsx("h-full rounded-full", color)} style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
    </div>
  );
}

export function scoreTone(v: number): "good" | "warn" | "bad" {
  return v >= 70 ? "good" : v >= 50 ? "warn" : "bad";
}

export function Crumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="flex min-w-0 items-center gap-1 text-[12.5px] text-ink-500">
      {items.map((it, i) => (
        <span key={i} className="flex min-w-0 items-center gap-1">
          {i > 0 && <ChevronRight size={12} className="shrink-0 text-ink-300" />}
          {it.href ? <Link href={it.href} className="truncate hover:text-ink-900">{it.label}</Link> : <span className="truncate text-ink-800">{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function SyntheticTag({ className }: { className?: string }) {
  return <span className={clsx("inline-flex items-center rounded-[3px] border border-dashed border-[#C9871A] px-1 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-signal-warn", className)}>Synthetic</span>;
}

/** Toggle chip used in filter bars */
export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className={clsx("focus-ring h-7 rounded-[4px] border px-2 text-xs font-medium transition-colors", active ? "border-ink-900 bg-ink-900 text-white" : "border-line-strong bg-white text-ink-600 hover:border-ink-300 hover:text-ink-900")}>
      {children}
    </button>
  );
}

export function FilterBar({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-2.5 border-b border-line bg-canvas/60 px-5 py-3 md:px-8">
      {children}
      {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
    </div>
  );
}

export function SelectFilter({ label, value, onChange, options, width = "w-44" }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; width?: string }) {
  return (
    <label className={clsx("block", width)}>
      <span className="label !mb-0.5 !text-[11px]">{label}</span>
      <select className="field !h-[30px] !text-[12.5px]" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
