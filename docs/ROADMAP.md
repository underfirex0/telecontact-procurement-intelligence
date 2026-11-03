# Roadmap

## Delivered in this prototype
Synthetic dataset generator; analytical engine (quality, market, buyers, competitors, concentration, recurrence/signals, dossier); 13 modules + data quality; report engine with 8 report types and CSV/Excel/JSON/print-PDF exports; supplier CRM, acquisition workflow, talent module; bid workspace; 27 unit tests; 14 end-to-end journeys.

## Next (prototype hardening)
- Persist the workspace in SQLite / Postgres behind API routes (multi-user).
- Saved searches and alert rules on opportunities and signals.
- Configurable readiness weights per organisation.
- Lot-level competition analysis and bid price benchmarking (needs more bid data).
- Server-side PDF rendering with charts.

## Later (real data)
- Ingestion pipeline for official notices and award results; entity resolution; classification.
- Document parsing of RC/CPS for evaluation criteria and requirements.
- Calendar / email integrations for relationship workflows (with explicit user action and consent).
- Cross-country coverage (West Africa, Europe) for partner execution.
- Signal back-testing: measure hit rate of predicted windows against actual publications.
