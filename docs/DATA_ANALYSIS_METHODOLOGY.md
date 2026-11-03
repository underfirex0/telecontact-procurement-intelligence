# Data analysis methodology

All analytics are deterministic pure functions in `src/lib/analytics`. Nothing is hardcoded: every figure on screen is computed from records, and charts display their sample size (n) and period.

## 0. Base population
- **De-duplication** (`context.ts`): records sharing normalised reference + buyer + normalised object are duplicates; the earliest publication is kept. All market metrics run on this clean set (296 records at the default seed).
- **Filters** (`MarketFilter`): sector, region, buyer type, publication date range.

## A. Data quality (`quality.ts`)
**Score = 40% completeness + 15% uniqueness + 15% consistency + 15% relationship integrity + 15% outcome coverage** (each a 0–1 rate, ×100).
- Completeness: mean fill rate of 8 critical fields (publication date, deadline, buyer, sector, region, city, estimated value, duration).
- Uniqueness: 1 − duplicate records ÷ records.
- Consistency: 1 − records whose object text points to another sector (keyword + title-stem matching) ÷ records.
- Integrity: share of passing checks (award ↔ Awarded tender, awardee exists, award amount published, Awarded tender has award, awardee in disclosed bidder list, supplier has a contact).
- Outcome coverage: tenders with a recorded award ÷ award-eligible tenders (deadline ≥45 days ago, not cancelled/unsuccessful).
Also reported: per-field completeness, publication/deadline coverage, bidder-list coverage, duplicate entities (shared identifier), unreliable records (≥2 critical fields missing) and a full issue log. Default seed score: 87.2.

## B. Market analysis (`market.ts`)
Breakdowns by sector, region, buyer, buyer type and procedure (count, share, sum and median of known estimates, record ids). Monthly / quarterly time series (count and value). Value distribution in five bands with mean, median and P90 (undisclosed estimates excluded and counted). Seasonality index = month count ÷ average month.
**Growth signals**: last 12 months vs the prior 12 months. Needs ≥6 records across both windows ("Insufficient data" otherwise). If the prior window holds <3 records the sector is "Emerging (low base)" — no % change is claimed. Otherwise ≥+20% Rising, ≤−20% Declining, else Stable.

## C. Buyer analysis (`buyers.ts`)
Publication rate (publications ÷ years spanned), median gap between publications, sector mix, procedures, geography, yearly volume and value, awardees with share of buyer awards, recurring lines, cancellation rate (cancelled + unsuccessful ÷ decided, only with ≥3 decided). Observations are rule-based sentences, each with its evidence ids.

## D. Competitor analysis (`competitors.ts`)
- Participations and awards are counted separately.
- **Win rate = awarded participations ÷ decided participations** (Awarded + Unsuccessful + Shortlisted). Pending and Withdrawn are excluded. Awards on tenders without a disclosed bidder list do not enter the win rate (and are reported as such).
- Role: Verified awardee (≥1 award) / Shortlisted participant / Participant / No recorded activity.
- Sector presence = company awards ÷ all awards in that sector; rank by awards then value.
- Repeat business = buyers with ≥2 awards to the company. Head-to-head from shared bidder lists.

## E. Market concentration (`concentration.ts`)
- **HHI** = Σ (share × 100)² on award value per awardee (0–10,000); also on award count. Bands: <1,500 unconcentrated, 1,500–2,500 moderate, >2,500 high.
- Top-1 and top-5 share of award value. Samples under 8 awards are flagged "small n".
- **Buyer dependence**: share of a buyer's awards going to its main supplier; "dependent" when ≥50% of ≥3 awards.
- Competition intensity: mean bidders per tender with a disclosed bidder list.

## F. Recurring demand & signals (`recurrence.ts`)
A **purchasing line** = all clean opportunities of one buyer in one sector. Recurring when ≥2 dated publications. Intervals give median, MAD and coefficient of variation (CV ≤0.35 = regular cycle).
Signals (lines with a 150–1,300-day median interval):
- Expected = last publication + median interval; window ± max(30 d, min(MAD, 25% of interval), 12% of interval).
- Contract evidence: latest award date + duration; aligned when within ±90 days of the expected date.
- **Confidence** = occurrences (2→0.30, 3→0.45, ≥4→0.55) + regularity 0.25×(1−min(CV,1)) (needs ≥2 intervals) + contract alignment 0.15 + recent activity 0.05 − overdue penalty 0.20, clamped to [0,1]. High ≥0.70, Medium ≥0.50, else Low.
- State: Upcoming / Within window / Overdue. Shown only if the window ends after ref − 120 days and starts before ref + 18 months.
Each signal lists its historical publications (evidence), the confidence decomposition and an explanation sentence built from the numbers.

## G. Opportunity dossier (`dossier.ts`)
- **Similarity** = 0.45 same sector + 0.20 same buyer + 0.15 × max(0, 1 − |log10(value ratio)|) + 0.10 same region + 0.10 × Jaccard(object words >3 letters). Threshold 0.45, top 12.
- **Supplier match**: sector (primary 40 / secondary 25) + stage weight (Active 30 … Identified 5) + covers Morocco 15 + based in the execution region 10 + 3 × capacity; rejected suppliers excluded.
- **Risks** (rules): <10 days to deadline; incumbent with ≥2 wins (high) or 1 win (medium); highly concentrated sector (≥8 awards); value ≥ P85 of the sector; buyer cancellation rate ≥25%; no active/negotiating partner; ≥4.5 mean bidders; ≥4 information gaps.
- **Readiness** = 25% commercial (value percentile + sector trend) + 20% competitive openness (75 base; −30/−15 incumbent; −15 high concentration; −10 crowded; +10 recurring line) + 15% buyer reliability + 15% partner availability (35 per active/negotiating match + 10 per other match) + 15% time (≥21 d 100, ≥10 d 70, ≥5 d 40, else 15) + 10% information completeness.
- **Posture**: Closed → "Historical — intelligence only"; ≥72 Pursue; ≥55 Pursue with partner (if an active partner exists, else Qualify further); ≥42 Qualify further; else Do not prioritise.
- Every statement is typed: fact, metric, interpretation, recommendation, assumption or unknown, with evidence ids — shown in the Evidence ledger.

## Limitations
Small samples (90 awards, 100 bids) make sector-level concentration and win rates indicative. See `KNOWN_LIMITATIONS.md`.
