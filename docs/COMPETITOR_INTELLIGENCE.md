# Competitor & awardee intelligence (modules 04–05)

Routes: `/competitors`, `/competitors/[id]`, `/competitors/compare`, `/awardees` · Analytics: `competitors.ts`, `concentration.ts`.

## Core rule: bids are not awards
- **Participation** = a recorded bid from bid-opening minutes (100 records).
- **Award** = a recorded contract award (90 records).
- **Win rate** = awarded ÷ decided participations, displayed with its fraction (e.g. 2/3). Pending and withdrawn bids are excluded. Awards from tenders without disclosed bidders are counted as awards but never inflate the win rate.
- Roles: **Verified awardee**, **Shortlisted participant**, **Participant**, **No recorded activity**. The directory filters by role; many companies bid without winning.

## Company profile
Identity (fictional ICE/RC, sector, size, city), a split ledger (participation vs awards), positioning findings (rank in primary sector, repeat buyers, win-rate reliability, awards outside bidder data, recent momentum), award history with yearly mini-chart, buyer relationships (repeat flag, first/last award), sector presence (share of each sector's awards) and regional activity, head-to-head encounters, full participation record with who won.
A warning appears when the company is part of a detected duplicate entity (shared identifier) because its awards may be split.

## Comparison
Up to three companies: bids, win rate, awards, value, buyers, sector rank, regions, last award; awards per year; buyers shared by all.

## Awardee module
Filters (period, sector, region, buyer type, awarding buyer). Figures: awards, distinct awardees, total value, repeat relationships. Leaderboard by number or value; **sector dominance** table (leader, lead share, top-5 share, HHI, band, small-sample flag); awardee directory with average award, buyers, repeat buyers, regions and active period; CSV export of awards.
