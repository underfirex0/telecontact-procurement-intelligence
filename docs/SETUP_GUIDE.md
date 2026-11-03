# Setup guide

## Requirements
Node.js 18.17 or later (tested on 22), npm. No database, no environment variables, no API keys.

## Install and run
```bash
npm install
```
```bash
npm run dev
```
Open http://localhost:3000.

## Quality gates
```bash
npm run typecheck
```
```bash
npm run lint
```
```bash
npm test
```
```bash
npm run build && npm start
```

## End-to-end journeys
Playwright is not a project dependency (to keep installs light). With the app running:
```bash
npm i -D playwright && npx playwright install chromium
```
```bash
BASE_URL=http://localhost:3000 npm run test:e2e
```
The script covers: overview and filters, global search, opportunity filters and sorting, dossier and save, bid assessment, buyer profile and comparison, competitor and award history, market tabs, signal drawer, supplier creation, meeting scheduling, provider registration, report generation with Excel and CSV export, data quality.

## Changing the dataset
Edit `DEFAULT_SEED` or generator parameters in `src/lib/data/generate.ts`, then run `npm test` (counts and integrity are asserted). The reference date is fixed (`REFERENCE_DATE`) so analytics stay reproducible.

## Resetting the demo workspace
Profile menu → Reset demo workspace, or Settings → Reset workspace. Workspace data lives only in the browser's localStorage.
