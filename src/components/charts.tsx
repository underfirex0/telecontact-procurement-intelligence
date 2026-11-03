"use client";
/**
 * Chart components. Colour roles:
 *  - single series → accent blue (sequential, magnitude)
 *  - categorical   → validated 5-slot palette, assigned by entity in fixed order
 *  - heatmaps      → one-hue sequential ramp (light → dark blue)
 * Every chart is rendered with a ChartNote (n, period) by its caller.
 */
import clsx from "clsx";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, ComposedChart, Area,
} from "recharts";

export const SERIES = ["#2563a8", "#d0782a", "#17917a", "#7c5cc4", "#c4476b"];
export const MUTED = "#b3c0d1";
export const ACCENT = "#2563a8";

const axisProps = { tickLine: false, axisLine: false, stroke: "#8A9BB4" } as const;

function TooltipBox({ title, rows }: { title: ReactNode; rows: { label: ReactNode; value: ReactNode; color?: string }[] }) {
  return (
    <div className="min-w-[150px] rounded-[5px] bg-white px-3 py-2 text-xs shadow-pop">
      <div className="mb-1 font-semibold text-ink-900">{title}</div>
      {rows.map((r, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-[1px]">
          <span className="flex items-center gap-1.5 text-ink-600">{r.color && <span className="h-2 w-2 rounded-[2px]" style={{ background: r.color }} />}{r.label}</span>
          <span className="tnum font-medium text-ink-900">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Time series ---------------- */

export function TrendBars({ data, xKey, yKey, height = 220, format = (v: number) => String(v), xFormat = (v: string) => v, highlightFrom, avgLine, yLabel }: {
  data: Record<string, number | string>[]; xKey: string; yKey: string; height?: number; format?: (v: number) => string;
  xFormat?: (v: string) => string; highlightFrom?: string; avgLine?: boolean; yLabel?: string;
}) {
  const avg = data.length ? data.reduce((a, d) => a + Number(d[yKey]), 0) / data.length : 0;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke="#EEF1F5" />
          <XAxis dataKey={xKey} {...axisProps} tickFormatter={xFormat} interval="preserveStartEnd" minTickGap={18} />
          <YAxis {...axisProps} allowDecimals={false} tickFormatter={(v) => format(v)} width={48} label={yLabel ? { value: yLabel, angle: -90, position: "insideLeft", offset: 22, style: { fontSize: 10, fill: "#8A9BB4" } } : undefined} />
          <Tooltip cursor={{ fill: "rgba(37,99,168,0.06)" }} content={({ active, payload, label }) => (active && payload?.length ? <TooltipBox title={xFormat(String(label))} rows={[{ label: yLabel ?? "Value", value: format(Number(payload[0].value)), color: ACCENT }]} /> : null)} />
          {avgLine && <ReferenceLine y={avg} stroke="#8A9BB4" strokeDasharray="3 3" label={{ value: `avg ${format(Math.round(avg * 10) / 10)}`, position: "insideTopRight", fontSize: 10, fill: "#64799A" }} />}
          <Bar dataKey={yKey} radius={[3, 3, 0, 0]} isAnimationActive={false}
            shape={(props: unknown) => {
              const p = props as { x: number; y: number; width: number; height: number; payload: Record<string, string> };
              const hi = highlightFrom && String(p.payload[xKey]) >= highlightFrom;
              return <rect x={p.x} y={p.y} width={Math.max(1, p.width)} height={Math.max(0, p.height)} rx={2} fill={highlightFrom ? (hi ? ACCENT : "#9DB6D6") : ACCENT} />;
            }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StackedBars({ data, xKey, series, height = 260, xFormat = (v: string) => v, horizontal = false }: {
  data: Record<string, number | string>[]; xKey: string; series: { key: string; label: string; color: string }[]; height?: number; xFormat?: (v: string) => string; horizontal?: boolean;
}) {
  return (
    <div>
      <Legend items={series.map((s) => ({ label: s.label, color: s.color }))} />
      <div style={{ height }} className="mt-2 w-full">
        <ResponsiveContainer>
          <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 4, right: 8, left: horizontal ? 8 : -14, bottom: 0 }} barCategoryGap={horizontal ? 6 : 3}>
            <CartesianGrid vertical={horizontal} horizontal={!horizontal} stroke="#EEF1F5" />
            {horizontal ? (
              <>
                <XAxis type="number" {...axisProps} allowDecimals={false} />
                <YAxis type="category" dataKey={xKey} {...axisProps} width={150} tick={{ fontSize: 11, fill: "#46607F" }} />
              </>
            ) : (
              <>
                <XAxis dataKey={xKey} {...axisProps} tickFormatter={xFormat} interval="preserveStartEnd" minTickGap={14} />
                <YAxis {...axisProps} allowDecimals={false} width={48} />
              </>
            )}
            <Tooltip cursor={{ fill: "rgba(37,99,168,0.06)" }} content={({ active, payload, label }) => active && payload?.length ? (
              <TooltipBox title={xFormat(String(label))} rows={[...payload].reverse().filter((p) => Number(p.value) > 0).map((p) => ({ label: series.find((s) => s.key === p.dataKey)?.label ?? String(p.dataKey), value: String(p.value), color: String(p.color) }))} />
            ) : null} />
            {series.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} stackId="a" fill={s.color} stroke="#fff" strokeWidth={1} isAnimationActive={false} radius={i === series.length - 1 ? (horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0]) : 0} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function MultiLine({ data, xKey, series, height = 240, xFormat = (v: string) => v, format = (v: number) => String(v) }: {
  data: Record<string, number | string>[]; xKey: string; series: { key: string; label: string; color: string; dashed?: boolean }[]; height?: number; xFormat?: (v: string) => string; format?: (v: number) => string;
}) {
  return (
    <div>
      <Legend items={series.map((s) => ({ label: s.label, color: s.color, dashed: s.dashed }))} />
      <div style={{ height }} className="mt-2 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 6, right: 12, left: -14, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#EEF1F5" />
            <XAxis dataKey={xKey} {...axisProps} tickFormatter={xFormat} interval="preserveStartEnd" minTickGap={14} />
            <YAxis {...axisProps} allowDecimals={false} width={48} tickFormatter={(v) => format(v)} />
            <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
              <TooltipBox title={xFormat(String(label))} rows={payload.map((p) => ({ label: series.find((s) => s.key === p.dataKey)?.label ?? String(p.dataKey), value: format(Number(p.value)), color: String(p.color) }))} />
            ) : null} />
            {series.map((s) => (
              <Line key={s.key} dataKey={s.key} stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? "4 3" : undefined} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Bars + cumulative share line on the same 0–n scale is avoided: area of cumulative count only. */
export function CumulativeArea({ data, xKey, yKey, height = 160, xFormat = (v: string) => v }: { data: Record<string, number | string>[]; xKey: string; yKey: string; height?: number; xFormat?: (v: string) => string }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#EEF1F5" />
          <XAxis dataKey={xKey} {...axisProps} tickFormatter={xFormat} minTickGap={18} />
          <YAxis {...axisProps} width={48} allowDecimals={false} />
          <Tooltip content={({ active, payload, label }) => active && payload?.length ? <TooltipBox title={xFormat(String(label))} rows={[{ label: "Cumulative", value: String(payload[0].value), color: ACCENT }]} /> : null} />
          <Area dataKey={yKey} stroke={ACCENT} strokeWidth={2} fill="rgba(37,99,168,0.10)" isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------------- HTML bar list (rankings) ---------------- */

export interface BarRow {
  key: string;
  label: ReactNode;
  value: number;
  display?: ReactNode;
  sub?: ReactNode;
  href?: string;
  secondary?: number; // optional ghost bar (e.g. previous period)
  color?: string;
  title?: string;
}

export function BarList({ rows, max, className, labelWidth = "w-[42%]", showRank = false }: { rows: BarRow[]; max?: number; className?: string; labelWidth?: string; showRank?: boolean }) {
  const m = max ?? Math.max(1, ...rows.map((r) => Math.max(r.value, r.secondary ?? 0)));
  return (
    <div className={clsx("divide-y divide-line-soft", className)}>
      {rows.map((r, i) => {
        const inner = (
          <div className="group flex items-center gap-3 py-[7px]" title={r.title}>
            {showRank && <span className="tnum w-5 shrink-0 text-right font-mono text-[11px] text-ink-400">{i + 1}</span>}
            <div className={clsx("min-w-0 shrink-0", labelWidth)}>
              <div className="truncate text-[13px] text-ink-800 group-hover:text-ink-900">{r.label}</div>
              {r.sub && <div className="truncate text-[11px] text-ink-500">{r.sub}</div>}
            </div>
            <div className="relative h-[10px] min-w-0 flex-1">
              {r.secondary !== undefined && <div className="absolute inset-y-0 left-0 rounded-[2px] border border-dashed border-ink-300" style={{ width: `${(r.secondary / m) * 100}%` }} />}
              <div className="absolute inset-y-[1px] left-0 rounded-[2px] transition-[filter] group-hover:brightness-90" style={{ width: `${Math.max(0.5, (r.value / m) * 100)}%`, background: r.color ?? ACCENT }} />
            </div>
            <div className="tnum w-24 shrink-0 text-right text-[12.5px] font-medium text-ink-900">{r.display ?? r.value}</div>
          </div>
        );
        return r.href ? <Link key={r.key} href={r.href} className="focus-ring block">{inner}</Link> : <div key={r.key}>{inner}</div>;
      })}
    </div>
  );
}

/* ---------------- Share bar (100% stacked single bar) ---------------- */

export function ShareBar({ parts, height = 10 }: { parts: { label: string; value: number; color: string }[]; height?: number }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  return (
    <div>
      <div className="flex w-full gap-[2px] overflow-hidden rounded-[3px]" style={{ height }}>
        {parts.filter((p) => p.value > 0).map((p) => (
          <div key={p.label} title={`${p.label}: ${p.value} (${Math.round((p.value / total) * 100)}%)`} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
        ))}
      </div>
      <Legend className="mt-2" items={parts.map((p) => ({ label: `${p.label} · ${Math.round((p.value / total) * 100)}%`, color: p.color }))} />
    </div>
  );
}

export function Legend({ items, className }: { items: { label: ReactNode; color: string; dashed?: boolean }[]; className?: string }) {
  return (
    <div className={clsx("flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-ink-600", className)}>
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className={clsx("inline-block h-2 w-3 rounded-[2px]", it.dashed && "border border-dashed !bg-transparent")} style={{ background: it.color, borderColor: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/* ---------------- Heatmap ---------------- */

const RAMP = ["#F2F6FB", "#DCE8F6", "#B9D0EC", "#8DB2DD", "#5B8DC8", "#2F69AB", "#1C4F89"];
export function rampColor(v: number, max: number): string {
  if (!v) return "transparent";
  const i = Math.min(RAMP.length - 1, Math.max(1, Math.ceil((v / max) * (RAMP.length - 1))));
  return RAMP[i];
}

export function Heatmap({ rows, cols, value, max, rowHeader, colHeader, cellTitle, rowHref }: {
  rows: string[]; cols: string[]; value: (r: string, c: string) => number; max: number;
  rowHeader: (r: string) => ReactNode; colHeader: (c: string) => ReactNode; cellTitle?: (r: string, c: string, v: number) => string; rowHref?: (r: string) => string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-[2px] text-[11px]">
        <thead>
          <tr>
            <th />
            {cols.map((c) => (
              <th key={c} className="h-[92px] w-7 align-bottom font-medium text-ink-500"><div className="mx-auto w-4 origin-bottom-left translate-x-3 -rotate-[55deg] whitespace-nowrap text-left">{colHeader(c)}</div></th>
            ))}
            <th className="pl-2 text-right font-medium text-ink-500">Σ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const total = cols.reduce((a, c) => a + value(r, c), 0);
            return (
              <tr key={r}>
                <td className="max-w-[230px] truncate pr-3 text-[12px] text-ink-700">{rowHref ? <Link className="hover:text-accent-700" href={rowHref(r)}>{rowHeader(r)}</Link> : rowHeader(r)}</td>
                {cols.map((c) => {
                  const v = value(r, c);
                  return (
                    <td key={c} title={cellTitle?.(r, c, v)} className={clsx("tnum h-7 w-7 rounded-[2px] text-center", v ? "" : "bg-canvas", v / max > 0.55 ? "text-white" : "text-ink-800")} style={{ background: v ? rampColor(v, max) : undefined }}>
                      {v || ""}
                    </td>
                  );
                })}
                <td className="tnum pl-2 text-right font-medium text-ink-800">{total}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Sparkline ---------------- */

export function Spark({ values, width = 84, height = 22, color = ACCENT }: { values: number[]; width?: number; height?: number; color?: string }) {
  if (!values.length) return null;
  const max = Math.max(1, ...values);
  const step = width / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(height - 2 - (v / max) * (height - 4)).toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Column mini-bars (inline) */
export function MiniBars({ values, labels, height = 34, color = ACCENT }: { values: number[]; labels?: string[]; height?: number; color?: string }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex items-end gap-[3px]" style={{ height }}>
      {values.map((v, i) => (
        <div key={i} title={`${labels?.[i] ?? i}: ${v}`} className="w-3 rounded-t-[2px]" style={{ height: `${Math.max(v ? 8 : 2, (v / max) * 100)}%`, background: v ? color : "#E3E7EE" }} />
      ))}
    </div>
  );
}
