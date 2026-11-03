# UX / UI specification

## Design language
An **intelligence workstation**, modelled on research documents rather than admin dashboards.
- **Research layout**: analytical sections use a two-column grid — a 250px label column (numbered index, title, interpretation sentence, sample/period meta) and a content column. Sections are separated by hairline rules, not floating cards.
- **Figure strips** replace KPI cards: one bordered row of figures separated by vertical rules, each with a computed sub-line and link.
- **Typography**: Inter for UI with tabular figures; Source Serif 4 for entity names and report titles (document feel); IBM Plex Mono for references, ids and section numbers.
- **Palette** (tokens in `tailwind.config.ts`): white and very light grey surfaces, deep navy ink `#0B1E36`, corporate blue accent `#2563A8`; status colours reserved for states. Categorical chart palette (blue, amber, teal, violet, rose) validated for colour-vision deficiency; single series always in accent blue; heatmaps use a one-hue sequential ramp.
- **Provenance tags**: Fact (ink), Metric (blue), Interpretation (violet), Recommendation (green), Assumption (amber), Unknown (red) — left rule + tag on every finding.
- **Synthetic labelling**: persistent amber strip under the top bar, dashed "SYNTHETIC" tag on profiles, disclaimer in every report and export.

## Layout
Persistent left sidebar (236px, numbered modules 01–13 in three groups + Governance); sticky top bar with breadcrumbs, global search (Ctrl K or /, keyboard navigation, grouped hits), computed notifications, profile menu. On <1024px the sidebar becomes a drawer; tables hide secondary columns by breakpoint; no horizontal page overflow at 390px.

## Distinct detail structures
| Page | Structure |
|---|---|
| Opportunity dossier | Serif title, 6-figure fact band, sticky table of contents, **strategic verdict** (posture + score decomposition), 15 numbered sections, series timeline, value-position strip, evidence ledger with kind filters |
| Buyer | Institutional identity block with acronym seal, 6 figures, observations, **purchasing calendar** heatmap (sector × quarter), mix, awardee share bars, recurring-line table |
| Competitor | Split ledger **Recorded participation | Verified awards**, positioning findings, award history, buyer relationships, head-to-head |
| Supplier | Relationship **stepper** (click a stage → activity record), profile, timeline, right rail with follow-up, contacts, meetings, documents, notes |
| Bid assessment | Workflow stepper, 1–5 score buttons beside computed scores, decision panel comparing team vs computed readiness |

## Tables
Sticky uppercase headers, sortable columns with direction icons (nulls always last), right-aligned tabular numbers, row hover, clickable rows, pagination with range counter, dense mode, consistent formats (`12 Mar 2025`, `4.2M MAD`).

## Charts
Each chart answers a stated question, names its period, shows n and links to underlying records where practical. Forms used: bar time series (with highlighted recent quarters / average line), stacked domain bars, ranked bar lists with prior-period ghost bars, heatmaps (buyer × sector, region × sector, sector × quarter), share bars, Gantt-style signal windows, dot timelines.

## Interaction
Restrained 160ms fade for overlays; toasts confirm every write; Escape closes modals/drawers; destructive actions confirm.
