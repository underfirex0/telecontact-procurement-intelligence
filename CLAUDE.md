# CLAUDE.md — working notes for this repository

## Project
Telecontact Intelligence — Procurement Intelligence prototype. Next.js 14 App Router, TypeScript (strict), Tailwind, Recharts, Lucide. All data is **synthetic** and generated from a seed; never add real company, person or procurement data, never connect external services, never implement real email sending.

## Commands
- `npm run dev` — dev server (port 3000)
- `npm test` — vitest unit tests (`tests/*.test.ts`)
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — next lint (must stay at zero warnings)
- `npm run build` — production build (must pass)
- `npm run test:e2e` — Playwright journeys against `BASE_URL` (app must be running)

## Layout
- `src/lib/types.ts` — data model (single source of truth for entities)
- `src/lib/data/` — `reference.ts` (sectors, regions, fictional name pools), `generate.ts` (seeded generator, fixed `REFERENCE_DATE`), `rng.ts`, `validate.ts`
- `src/lib/analytics/` — pure functions over a `Ctx` (dataset + indexes). `context.ts` detects duplicates; all market metrics use `ctx.clean`. Modules: quality, market, concentration, buyers, competitors, recurrence (signals), dossier
- `src/lib/services/` — `data-service.ts` (read seam), `workspace.tsx` (client store, localStorage, reducer actions)
- `src/lib/reports/` — `builders.ts` (ReportDoc per type), `export.ts` (CSV, SpreadsheetML, download)
- `src/components/` — `ui.tsx` primitives, `data-table.tsx`, `charts.tsx`, `shell.tsx`, `common.tsx`, forms
- `src/app/` — one folder per module route

## Rules of the codebase
- Business calculations live in `src/lib/analytics`, never in components.
- Never hardcode a KPI: compute it from records and show sample size / period (`ChartNote`).
- Keep participations (bids) and awards separate; win rate only over decided participations.
- Analytics must not read generator ground-truth flags (e.g. `duplicateOf`); detect from data.
- Dossier statements are typed: fact / metric / interpretation / recommendation / assumption / unknown.
- Charts: categorical colours in fixed order (`SERIES` in charts.tsx, validated), single series in accent blue.
- Round any floating value used in inline styles (SSR hydration).
- Components defined inside a render function must not wrap inputs (focus loss) — hoist them.
- Changing the generator changes every figure: run `npm test` and re-check docs that cite counts.
