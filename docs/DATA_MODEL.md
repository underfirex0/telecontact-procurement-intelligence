# Data model

Defined in `src/lib/types.ts`. All entities carry `provenance` (`synthetic: true`, source channel, generator id, seed, creation date) except workspace-only records, which are marked `User-entered demo record`.

## Procurement core
| Entity | Key fields | Relationships |
|---|---|---|
| `Sector` (15) | code, name, **domain**, activities | domain groups sectors (Built environment, Digital, Facility services, Advisory, Energy, Operations, Health, Supplies) |
| `Region` (12) | name, cities | Moroccan regions & cities (real geography) |
| `Buyer` (40) | name, acronym, type, region, city | publishes `Opportunity` |
| `Opportunity` (300) | reference, title, description, buyerId, sectorId, regionId, city, publicationDate, deadline, estimatedValue (MAD), procedure, status, contractDurationMonths, provisionalGuarantee, requirements | has 1..n `Lot`, n `ProcurementDocument`; receives `Participation` and `Award` |
| `Lot` | number, title, estimatedValue | belongs to Opportunity; an Award may target a lot |
| `Company` (70) | name, legalForm, fictional ICE / RC, sectors (primary first), regions covered, services, size | bids (`Participation`), wins (`Award`) |
| `Participation` (100) | opportunityId, companyId, bidAmount, outcome (Awarded / Shortlisted / Unsuccessful / Pending / Withdrawn) | a bidder is not necessarily a winner |
| `Award` (90) | opportunityId, lotId, companyId, amount, awardDate, durationMonths | always linked to an Awarded opportunity and an existing company |

**Awardee** is a role, not a table: a Company with ≥1 Award. **Activities** are sector-level lists of procured activities.

Opportunity status is computed against the fixed reference date: `Open`, `Closing soon` (≤10 days), `Under evaluation` (deadline <45 days ago), `Closed` (outcome not published), `Awarded`, `Unsuccessful`, `Cancelled`.

## Network
| Entity | Key fields |
|---|---|
| `Supplier` (60) | name, description, country, region, city, sectors, domain, services, specialisation, coverage (countries), website, phone, email, address, contactIds, relationshipOwner, **status** (9 stages), firstContactDate, lastInteraction, previousCooperation, notes, documents, followUpDate, capacityScore |
| `Contact` (20) | name, role, email, phone, supplierId, languages |
| `Interaction` | supplierId, date, type, summary, by, stageAfter — the relationship history |
| `Meeting` | supplierId, date, time, subject, location, attendees, status (Scheduled / Held / Cancelled), notes |
| Relationship stages | Identified → Not contacted → Contacted → Responded → Meeting scheduled → Negotiation → Active partner; plus Inactive, Rejected |

## Talent
`JobOpportunity` (role, country, location, expertise, experience, engagement, status), `TalentProfile` (expertise, experience, skills, availability, consent flag), `Application` (job, talent, status, CV placeholder).

## Workspace (user records)
`SavedOpportunity` (tracking: Watching / Qualifying / Preparing bid / Submitted / Dropped), `BidAssessment` (decision, six 1–5 scores, technical requirements, required documents, risks, notes, checklist items with owner and due date, responsible, follow-up, workflow stage), `ProviderRegistration`, `GeneratedReport` log. Tasks are modelled as `ChecklistItem`s inside assessments.

## Computed (not stored)
`FutureSignal`, `RecurringSeries`, `Dossier`, `ConcentrationRow`, `QualityReport`, `ReportDoc` — always derived from records, never persisted.

## Validation
`src/lib/data/validate.ts` checks referential integrity (buyers, sectors, regions, companies, suppliers, jobs, talents), date order, lot ownership and positive values; `validateSupplier` validates forms (required fields, email, URL, stage, follow-up after last interaction).
