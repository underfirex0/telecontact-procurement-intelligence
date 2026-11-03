# Future procurement signals (module 07)

Route `/signals` · Analytics: `src/lib/analytics/recurrence.ts`.

**Signals are analytical expectations derived from synthetic history. They are not official announcements and do not guarantee publication.** This warning is shown on the page, in the signal drawer and in the report.

## Inputs
Historical publication dates per buyer × sector line, interval statistics (median, MAD, CV), the latest award's date and contract duration, and the reference date.

## Rules
See `DATA_ANALYSIS_METHODOLOGY.md §F` for the exact formulas. In short: expected date = last publication + median interval; a window sized by interval variability; confidence from number of occurrences, regularity, contract-end alignment and recency, minus a penalty if the window already passed without a new publication.

## Output per signal
Buyer, sector, historical opportunities (links), previous publication dates, potential window and central estimate, contract-end estimate, confidence score and level, state (Upcoming / Within window / Overdue), typical value, current incumbent, the confidence decomposition and an explanation sentence.

## Interface
- Gantt-style timeline from 4 months before to 18 months after the reference date; bar colour = confidence level; dot = last publication; orange tick = contract end; hatched = overdue.
- Filters: search, sector, confidence, state.
- Drawer with full evidence; deep link `/signals?focus=<id>` used by the overview, dossiers and buyer profiles.

At the default seed: 55 signals (15 high, 22 medium, 18 low; 9 windows open, 4 overdue).

## Why no machine learning
With 2–5 observations per line, a transparent interval rule is more honest than a fitted model, and every number is explainable to a bid committee.
