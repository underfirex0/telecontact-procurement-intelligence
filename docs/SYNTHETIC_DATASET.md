# Synthetic dataset

**All records are SYNTHETIC DEMO DATA.** Organisations and people are fictional (buyer names contain the word "Fictive"/"Fictif" or invented toponyms; emails and websites use the reserved `.example` domain; identifiers are format-only). Moroccan regions and cities are real geography.

## Reproducibility
- Generator: `src/lib/data/generate.ts` (`tci-synthetic-generator@1.0.0`), PRNG mulberry32 (`rng.ts`).
- Seed `20261103`; fixed reference date **2026-11-03**; publications from 2023-01-02 to 2026-11-02.
- The test suite asserts byte-identical output across runs and different output for another seed.

## Volumes (seed 20261103)
| Entity | Count | Notes |
|---|---|---|
| Opportunities | 300 | incl. 4 duplicates; 417 lots |
| Buyers | 40 | 8 buyer types, 12 regions |
| Companies | 70 | 68 entities + 2 near-duplicate entities |
| Participations | 100 | bidder lists disclosed for a subset of tenders |
| Awards | 90 | on 85 tenders (5 multi-lot tenders awarded per lot) |
| Suppliers | 60 | 12 countries |
| Contacts | 20 | main contacts of the most advanced relationships |
| Sectors | 15 | |
| Interactions / meetings | 117 / 20 | consistent with each supplier's stage |
| Jobs / talents / applications | 12 / 16 / 22 | |

Status mix: 13 Open, 5 Closing soon, 18 Under evaluation, 163 Closed, 86 Awarded, 8 Unsuccessful, 7 Cancelled.

## How coherence is produced
1. **Buyers** carry sector preferences and an activity intensity.
2. **Recurring programmes**: each buyer has 1–2 purchasing lines re-procured on the sector's cycle (12, 18, 24 or 36 months) with ±21-day jitter; 7% of cycles are skipped. Values drift upward 0–10% per cycle.
3. **One-off needs** are drawn by buyer activity and sector preference, with accept–reject sampling on sector growth (e.g. renewable energy ×1.35/yr, office supplies ×0.86/yr), a market-wide 12%/yr trend and month seasonality (peaks Mar–May and Oct–Nov, trough in August).
4. **Values** are log-normal per sector and buyer type (e.g. infrastructure median 18M MAD, office supplies 350k); purchase orders are capped below 500k MAD; large tenders may be split into 2–4 lots.
5. **Deadlines** follow procedure-specific windows (purchase order 7–15 days, open tender 21–45, pre-selection 40–60…).
6. **Statuses** derive from the deadline vs the reference date.
7. **Awards** are assigned chronologically so that market structure emerges: Zipf-like company strength, regional coverage, a 58% incumbent retention on recurring lines and a buyer-loyalty multiplier.
8. **Participations**: for selected awarded tenders the bidder list contains the awardee(s) plus 2–5 sector competitors (Unsuccessful / Shortlisted / Withdrawn); some tenders under evaluation have Pending bids.
9. **Suppliers** get a stage, then an interaction history, meetings and documents consistent with that stage.

## Deliberate data-quality defects
Injected so the quality workspace has real work to do: 33 missing budgets, 9 missing region/city, 6 unclassified sectors, 3 unidentified buyers, 6 missing deadlines, 3 missing publication dates, 6 object/sector contradictions, 4 duplicate notices, 2 duplicate company entities (shared fictional ICE), 3 awards without amount. The analytics detect them from the data (the test suite checks detection equals injection for duplicates).
