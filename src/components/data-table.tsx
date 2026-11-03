"use client";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { query, type SortDir } from "@/lib/query";

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  sort?: (row: T) => string | number | null | undefined;
  align?: "left" | "right" | "center";
  width?: string;
  className?: string;
  hideBelow?: "md" | "lg" | "xl";
}

export function DataTable<T>({
  rows, columns, rowKey, rowHref, onRowClick, initialSort, pageSize = 25, dense = false, empty, caption, footer, maxHeight, selected,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string;
  onRowClick?: (row: T) => void;
  initialSort?: { key: string; dir: SortDir };
  pageSize?: number;
  dense?: boolean;
  empty?: ReactNode;
  caption?: ReactNode;
  footer?: ReactNode;
  maxHeight?: string;
  selected?: (row: T) => boolean;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(initialSort ?? null);
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [rows.length, sort?.key, sort?.dir]);
  const col = columns.find((c) => c.key === sort?.key);
  const result = useMemo(
    () => query(rows, { sort: col?.sort && sort ? { value: col.sort, dir: sort.dir } : null, page, pageSize }),
    [rows, col, sort, page, pageSize],
  );
  const hide = (h?: string) => (h === "md" ? "hidden md:table-cell" : h === "lg" ? "hidden lg:table-cell" : h === "xl" ? "hidden xl:table-cell" : "");
  const toggle = (c: Column<T>) => {
    if (!c.sort) return;
    setSort((s) => (s?.key === c.key ? (s.dir === "desc" ? { key: c.key, dir: "asc" } : null) : { key: c.key, dir: "desc" }));
  };
  return (
    <div>
      {caption && <div className="mb-2 text-xs text-ink-500">{caption}</div>}
      <div className="overflow-x-auto" style={maxHeight ? { maxHeight, overflowY: "auto" } : undefined}>
        <table className={clsx("tbl", dense && "dense")}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} style={{ width: c.width }} aria-sort={c.sort ? (sort?.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none") : undefined} className={clsx(c.align === "right" && "!text-right", c.align === "center" && "!text-center", hide(c.hideBelow))}>
                  {c.sort ? (
                    <button onClick={() => toggle(c)} className={clsx("focus-ring inline-flex items-center gap-1 uppercase hover:text-ink-900", sort?.key === c.key && "text-ink-900", c.align === "right" && "flex-row-reverse")}>
                      {c.header}
                      {sort?.key === c.key ? (sort.dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="opacity-40" />}
                    </button>
                  ) : c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((r) => {
              const href = rowHref?.(r);
              const clickable = !!href || !!onRowClick;
              return (
                <tr
                  key={rowKey(r)}
                  className={clsx(clickable && "cursor-pointer", selected?.(r) && "[&>td]:bg-accent-50")}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("a,button,input,select,label")) return;
                    if (onRowClick) onRowClick(r);
                    else if (href) router.push(href);
                  }}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={clsx(c.align === "right" && "tnum text-right", c.align === "center" && "text-center", hide(c.hideBelow), c.className)}>{c.render(r)}</td>
                  ))}
                </tr>
              );
            })}
            {result.rows.length === 0 && (
              <tr><td colSpan={columns.length} className="!py-10 text-center text-sm text-ink-500">{empty ?? "No records match the current filters."}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {(result.pages > 1 || footer) && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 text-xs text-ink-500">
          <div className="tnum">
            {result.total ? `${(result.page - 1) * result.pageSize + 1}–${Math.min(result.total, result.page * result.pageSize)} of ${result.total.toLocaleString("en-US")}` : "0 records"}
            {footer && <span className="ml-3">{footer}</span>}
          </div>
          {result.pages > 1 && (
            <div className="flex items-center gap-1">
              <button className="btn btn-sm" disabled={result.page <= 1} onClick={() => setPage(result.page - 1)} aria-label="Previous page"><ChevronLeft size={13} /></button>
              <span className="tnum px-2">Page {result.page} / {result.pages}</span>
              <button className="btn btn-sm" disabled={result.page >= result.pages} onClick={() => setPage(result.page + 1)} aria-label="Next page"><ChevronRight size={13} /></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
