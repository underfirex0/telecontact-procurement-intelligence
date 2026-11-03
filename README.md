# Telecontact Intelligence — Procurement Intelligence (prototype)

> **SYNTHETIC DEMO DATA.** Every organisation, person, tender, bid, award and supplier in this application is fictional and generated from a fixed seed. This is a functional prototype that demonstrates a product vision. It is **not** an officially launched or approved Telecontact product, and it connects to no production system, external API or live website.

Telecontact Intelligence turns procurement records into commercial intelligence. It covers who buys what, how often, who wins, how concentrated each market is, which needs will probably recur, which partners can deliver, and whether a specific tender is worth pursuing.

## Quick start

```bash
npm install
```

```bash
npm run dev          # http://localhost:3000
```

```bash
npm test             # 27 unit tests: dataset coherence, analytics, reports, exports
```

```bash
npm run build && npm start   # production build
```

End-to-end user journeys (14 steps, needs a running app and Playwright):

```bash
npm i -D playwright && npx playwright install chromium
BASE_URL=http://localhost:3000 npm run test:e2e
```

Requirements: Node.js 18.17+ (developed on Node 22). No database, environment variables or API keys are needed.

## What is inside

| Module | Route | What it does |
|---|---|---|
| 01 Overview | `/` | Command centre: live pipeline ranked by bid readiness, market activity, demand concentration, signals, recent developments, award concentration, data confidence |
| 02 Opportunities | `/opportunities`, `/opportunities/[id]` | Searchable, filterable, sortable database; **intelligence dossier** per tender |
| 03 Buyers | `/buyers`, `/buyers/[id]`, `/buyers/compare` | Buyer profiles, purchasing calendar, awardee relationships, recurrence, comparison |
| 04 Competitors | `/competitors`, `/competitors/[id]`, `/competitors/compare` | Bids vs awards kept separate, win rates with sample size, head-to-head, positioning |
| 05 Awardees | `/awardees` | Leaders by count/value, sector dominance (HHI), awardee directory |
| 06 Market Intelligence | `/market` | Trends, sectors, regions, buyer demand, values, concentration, recurrence/seasonality, period comparison |
| 07 Future Signals | `/signals` | Expected re-procurement windows with confidence decomposition and evidence |
| 08 Suppliers & Partners | `/suppliers`, `/suppliers/[id]` | Network CRM: create/edit, contacts, stage, interactions, meetings, documents, follow-ups |
| 09 Provider Acquisition | `/acquisition` | Pipeline board, 9-step workflow, supply–demand gaps, registration form, outreach templates (no sending), meetings |
| 10 Talent & Local Experts | `/talent` | Roles, demo application form with consent, expert pool, privacy notes |
| 11 Bid Workspace | `/bids`, `/bids/[id]` | Bid/no-bid assessment, team scoring vs computed readiness, documents, checklist, owners |
| 12 Reports | `/reports` | 8 report types; PDF (print), Excel, CSV, JSON exports |
| 13 Settings | `/settings` | Dataset provenance, validation, workspace export/reset |
| Data Quality | `/quality` | Completeness, duplicates, consistency, integrity, outcome coverage, issue log |

## Architecture in one paragraph

Next.js 14 (App Router) + TypeScript + Tailwind + Recharts + Lucide. A seeded generator (`src/lib/data`) builds the dataset in memory. A pure analytics engine (`src/lib/analytics`) computes all metrics. A data service (`src/lib/services/data-service.ts`) is the single read seam for future real-data integration. User-created records live in a typed, reducer-based workspace store persisted to `localStorage` (`src/lib/services/workspace.tsx`). Reports are built by pure builders (`src/lib/reports`). See `docs/PRODUCT_ARCHITECTURE.md`.

## Documentation

See [`docs/`](docs) — strategy, architecture, data model, dataset, analysis methodology, UX/UI specification, module guides, integration strategy, roadmap, setup guide and known limitations.
