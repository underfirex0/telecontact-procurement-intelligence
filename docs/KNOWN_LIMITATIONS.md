# Known limitations

## Data
- All data is synthetic. Figures demonstrate the method; they say nothing about the real Moroccan market or real organisations.
- Small samples: 90 awards and 100 bids across 15 sectors. Sector concentration and win rates are indicative; samples under 8 awards are flagged.
- Award outcomes exist for about 35% of award-eligible tenders, and bidder lists for about a quarter of awarded tenders, by design (outcome coverage is the weakest quality component).
- Signal windows depend on the fixed reference date (3 Nov 2026), not on the real current date.

## Product
- **Persistence is per browser** (localStorage). There are no user accounts, no multi-user sharing and no server-side storage. Clearing site data removes workspace records.
- **No real communications.** Outreach, meeting invitations and follow-ups are simulated records; nothing is emailed or sent.
- **Documents are placeholders.** Tender documents, supplier documents and CVs are names only; no file is stored or parsed. Evaluation criteria from RC/CPS are therefore unknown to the dossier.
- **PDF export uses the browser's print dialog** (print stylesheet), not a server-rendered PDF. Charts in reports are rendered as bar lists. Excel export uses the SpreadsheetML 2003 format (`.xls`), which Excel opens with a format notice.
- Readiness weights are fixed in code (documented); the bid workspace lets the team record its own scores side by side.
- Similarity uses simple text features (word overlap), not semantic matching.
- Talent module stores only demo entries; consent capture exists, but retention, access and erasure workflows are not implemented.
- Desktop-first: mobile and tablet are usable (no horizontal overflow; secondary table columns hidden), but dense tables are best on desktop.
- Interface language is English; tender objects and procedures are in French as in Moroccan practice.

## Not implemented by design
No VPS, production database, scraping, external APIs, AI services or real Telecontact data. The prototype is not an officially launched or approved Telecontact product.
