/**
 * Reusable search / filter / sort / paginate logic for every list in the app.
 * Pure functions — the same logic would run server-side against a real database.
 */
export type SortDir = "asc" | "desc";
export interface QueryOptions<T> {
  search?: string;
  searchFields?: ((row: T) => string | null | undefined)[];
  filters?: ((row: T) => boolean)[];
  sort?: { value: (row: T) => string | number | null | undefined; dir: SortDir } | null;
  page?: number; // 1-based
  pageSize?: number;
}
export interface QueryResult<T> {
  rows: T[];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
}

export function fold(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function matchesSearch<T>(row: T, q: string, fields: ((row: T) => string | null | undefined)[]): boolean {
  const terms = fold(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const hay = fold(fields.map((f) => f(row) ?? "").join(" "));
  return terms.every((t) => hay.includes(t));
}

export function compareValues(a: unknown, b: unknown): number {
  const an = a === null || a === undefined || a === "";
  const bn = b === null || b === undefined || b === "";
  if (an && bn) return 0;
  if (an) return 1; // nulls last
  if (bn) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "fr");
}

export function query<T>(rows: T[], o: QueryOptions<T>): QueryResult<T> {
  let out = rows;
  if (o.search && o.searchFields?.length) out = out.filter((r) => matchesSearch(r, o.search!, o.searchFields!));
  for (const f of o.filters ?? []) out = out.filter(f);
  if (o.sort) {
    const { value, dir } = o.sort;
    out = [...out].sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      const nullA = va === null || va === undefined || va === "";
      const nullB = vb === null || vb === undefined || vb === "";
      if (nullA || nullB) return compareValues(va, vb); // nulls always last
      const c = compareValues(va, vb);
      return dir === "asc" ? c : -c;
    });
  }
  const pageSize = o.pageSize ?? (out.length || 1);
  const pages = Math.max(1, Math.ceil(out.length / pageSize));
  const page = Math.min(Math.max(1, o.page ?? 1), pages);
  return { rows: out.slice((page - 1) * pageSize, page * pageSize), total: out.length, page, pages, pageSize };
}
