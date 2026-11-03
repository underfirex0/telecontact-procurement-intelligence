# Product architecture

## Stack
| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 14 App Router, React 18 | Routing, production build, future server rendering/API routes |
| Language | TypeScript (strict) | Typed data model end to end |
| Styling | Tailwind CSS with design tokens (`tailwind.config.ts`) | Consistent restrained design system |
| Charts | Recharts + custom HTML/SVG (bar lists, heatmaps, timelines) | Recharts for time series; HTML for crisp ranking tables |
| Icons | lucide-react | Clean line icons |
| Fonts | Inter, Source Serif 4, IBM Plex Mono (self-hosted via @fontsource) | No external font requests |
| Persistence | Seeded in-memory dataset + `localStorage` workspace | Self-contained, no infrastructure |
| Tests | Vitest (unit), Playwright script (journeys) | Fast deterministic analytics tests |

SQLite was considered and rejected for the prototype: the dataset is generated deterministically and is small (≈300 tenders), so an in-memory model is simpler and reproducible; user edits are per-browser by design.

## Layers
```
src/app/*                 UI routes (client components)
src/components/*          UI primitives, tables, charts, shell, forms
        │
src/lib/services/
  data-service.ts         READ SEAM — getDataset(), getContext()
  workspace.tsx           WRITE SEAM — reducer actions, localStorage persistence, merged selectors
        │
src/lib/reports/          report builders (pure) + exporters (CSV, SpreadsheetML, JSON)
src/lib/analytics/        pure analytical engine over Ctx
src/lib/data/             reference data, seeded generator, validation
src/lib/types.ts          data model
src/lib/query.ts          reusable search / filter / sort / paginate
```
Business logic never lives in components. Every analytical function is pure: `(ctx, filter) → result`.

## Analytical context (`Ctx`)
`buildContext(dataset)` creates lookup maps and **detects duplicates** (same normalised reference + buyer + object; earliest kept). `ctx.clean` is the de-duplicated opportunity list used by all market analytics. Analytics never read the generator's ground-truth flags.

## Workspace store
Reducer actions (`toggleSave`, `saveAssessment`, `createSupplier`, `updateSupplier`, `logInteraction`, `scheduleMeeting`, `register`, `apply`, `logReport`, …) are the only write path. Selectors (`useSuppliers`, `useMeetings`, `useInteractions`, `useTalentData`) merge base synthetic records with user records and edits. Replacing these actions with API calls is the integration path.

## Rendering
Pages are client components (state-rich filtering). Static routes are prerendered; dynamic `[id]` routes render on demand. Floating values used in inline styles are rounded to avoid hydration mismatches.

## Real-data integration seam
1. Replace `getDataset()` with a repository reading from a database (same `Dataset` shape, or per-entity repositories).
2. Move analytics to the server (they are pure and framework-agnostic) and expose them via route handlers.
3. Replace workspace reducer side-effects with API mutations; keep the action vocabulary.
See `TELECONTACT_INTEGRATION_STRATEGY.md`.
