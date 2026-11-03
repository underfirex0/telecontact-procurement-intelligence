# Telecontact integration strategy

This prototype runs on synthetic data only. This document describes how a real deployment *could* be integrated; nothing here is implemented or connected.

## Data sources (future, subject to licensing and legal review)
- Public procurement notices and award results from official publication channels, ingested by an approved data pipeline (not scraping from this application).
- Telecontact's own company and directory data, where licensed for this use.
- Internal CRM data for supplier relationships.

## Integration seams already in the code
| Seam | File | Replace with |
|---|---|---|
| Read model | `src/lib/services/data-service.ts` | Repository over PostgreSQL (or the existing data platform) returning the same `Dataset` / per-entity shapes |
| Analytics | `src/lib/analytics/*` (pure) | Run server-side in route handlers or batch jobs; cache results per filter |
| Writes | `src/lib/services/workspace.tsx` reducer actions | API mutations with authentication, audit trail and multi-user ownership |
| Exports | `src/lib/reports/*` | Server-side PDF rendering if branded PDFs are required |

## Required additions before production
1. Entity resolution for buyers and companies (identifier matching, name normalisation) — the duplicate-entity check is the starting point.
2. Classification of tender objects into sectors (rules first, then supervised models with human review).
3. Authentication, roles (analyst, bid manager, partner manager), per-team workspaces.
4. Consent and retention management for contacts and candidates (Moroccan law 09-08, GDPR where applicable).
5. Data-quality monitoring using the existing score as a pipeline KPI.
6. Brand and legal approval of the product, naming and claims.

## Phasing
Pilot on one sector family with real public notices → add award results and bidder minutes → connect supplier CRM → open signals and dossiers to bid teams.
