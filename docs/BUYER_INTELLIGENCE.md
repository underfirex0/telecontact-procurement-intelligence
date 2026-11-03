# Buyer intelligence (module 03)

Routes: `/buyers`, `/buyers/[id]`, `/buyers/compare?ids=…` · Analytics: `src/lib/analytics/buyers.ts`.

## Directory
Search (name, acronym, city, sector), filters (buyer type, region), sortable metrics: opportunities, active, last-24-month volume, median value, main sector, recurring lines, awards / awardees, last publication. Select up to three buyers to compare.

## Profile
1. **Identity**: name, acronym, type, city/region, establishment year, description (synthetic).
2. **Figures**: opportunities, publication rate and median gap, median value and budget coverage, awards and value, distinct awardees and leading share, recurring lines and forward signals.
3. **Analytical observations** (rule-based, with evidence): dominant category, recurring lines with interval and regularity, incumbent share, year-on-year volume change (≥25%), cancellation rate (≥25%), absence of award data.
4. **Purchasing calendar**: sector × quarter heatmap; repeated cells reveal cycles.
5. **What this buyer purchases**: sector mix (count and value), procedures, execution geography, yearly volume and value.
6. **Awardee relationships**: awards, share of buyer awards, value, sectors.
7. **Recurring purchasing behaviour**: each line's publications, median interval, regularity (CV) and next expected window.
8. **Latest opportunities**.

## Comparison
Side-by-side metrics (type, volume, rate, gap, median and max value, main sector, recurring lines, awards, leading awardee share, cancellation rate), yearly volume lines and a sector-mix table showing overlap — useful to find buyers purchasing similar services.

## Report
Buyer Intelligence Report (Reports module) reuses the profile.
