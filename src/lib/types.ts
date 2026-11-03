/**
 * Telecontact Intelligence — core data model.
 *
 * Every record in the prototype is SYNTHETIC DEMO DATA. Each entity carries a
 * `provenance` block so analytics and exports can always state where a figure
 * came from.
 */

export type ISODate = string; // YYYY-MM-DD

export interface Provenance {
  synthetic: true;
  source: string; // fictional source channel, e.g. "Synthetic portal feed"
  generator: string; // generator id + version
  seed: number;
  createdAt: ISODate; // record creation date in the synthetic source
}

/* ------------------------------------------------------------------ */
/* Reference data                                                      */
/* ------------------------------------------------------------------ */

export interface Sector {
  id: string;
  code: string; // short classification code, e.g. "S03"
  name: string;
  domain: string; // higher-level domain grouping
  activities: string[]; // typical procured activities
}

export interface Region {
  id: string;
  name: string;
  cities: string[];
}

export type BuyerType =
  | "Ministry department"
  | "Public agency"
  | "Regional council"
  | "Municipality"
  | "Public hospital"
  | "University"
  | "State-owned enterprise"
  | "Public office";

export interface Buyer {
  id: string;
  name: string;
  acronym: string;
  type: BuyerType;
  regionId: string;
  city: string;
  description: string;
  established: number;
  provenance: Provenance;
}

export type CompanySize = "Micro" | "SME" | "Mid-market" | "Large";

export interface Company {
  id: string;
  name: string;
  legalForm: "SARL" | "SA" | "SARL AU" | "SAS";
  ice: string; // fictional 15-digit identifier (format only)
  rc: string; // fictional trade register number
  city: string;
  regionId: string;
  sectorIds: string[]; // primary sector first
  regionIds: string[]; // geographic coverage
  services: string[];
  size: CompanySize;
  founded: number;
  provenance: Provenance;
}

/* ------------------------------------------------------------------ */
/* Procurement records                                                 */
/* ------------------------------------------------------------------ */

export type Procedure =
  | "Appel d'offres ouvert"
  | "Appel d'offres restreint"
  | "Appel d'offres avec présélection"
  | "Concours"
  | "Procédure négociée"
  | "Bon de commande";

export type OpportunityStatus =
  | "Open"
  | "Closing soon"
  | "Under evaluation"
  | "Closed" // deadline passed long ago, outcome not published in source
  | "Awarded"
  | "Unsuccessful"
  | "Cancelled";

export interface Lot {
  id: string;
  opportunityId: string;
  number: number;
  title: string;
  estimatedValue: number | null;
}

export interface ProcurementDocument {
  id: string;
  name: string;
  kind: "RC" | "CPS" | "BPU" | "Plans" | "Avis" | "Annex";
  pages: number;
}

export interface Opportunity {
  id: string;
  reference: string;
  title: string;
  description: string;
  buyerId: string | null;
  sectorId: string | null;
  regionId: string | null;
  city: string | null;
  publicationDate: ISODate | null;
  deadline: ISODate | null;
  estimatedValue: number | null; // MAD, excl. tax
  procedure: Procedure;
  status: OpportunityStatus;
  lots: Lot[];
  documents: ProcurementDocument[];
  contractDurationMonths: number | null;
  provisionalGuarantee: number | null;
  requirements: string[]; // qualification / technical requirements
  /** id of the earlier record this one duplicates (synthetic data-quality defect) */
  duplicateOf?: string;
  provenance: Provenance;
}

export type ParticipationOutcome = "Awarded" | "Shortlisted" | "Unsuccessful" | "Pending" | "Withdrawn";

export interface Participation {
  id: string;
  opportunityId: string;
  lotId: string | null;
  companyId: string;
  bidAmount: number | null;
  submittedOn: ISODate;
  outcome: ParticipationOutcome;
  provenance: Provenance;
}

export interface Award {
  id: string;
  opportunityId: string;
  lotId: string | null;
  companyId: string; // every award names a fictional awardee present in `companies`
  amount: number | null;
  awardDate: ISODate;
  durationMonths: number | null;
  provenance: Provenance;
}

/* ------------------------------------------------------------------ */
/* Network: suppliers, contacts, relationships                         */
/* ------------------------------------------------------------------ */

export const RELATIONSHIP_STAGES = [
  "Identified",
  "Not contacted",
  "Contacted",
  "Responded",
  "Meeting scheduled",
  "Negotiation",
  "Active partner",
  "Inactive",
  "Rejected",
] as const;
export type RelationshipStage = (typeof RELATIONSHIP_STAGES)[number];

export interface Contact {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  supplierId: string | null;
  languages: string[];
  provenance: Provenance;
}

export interface SupplierDocument {
  id: string;
  name: string;
  kind: "Company profile" | "Certification" | "NDA" | "Price list" | "Reference letter";
  addedOn: ISODate;
}

export interface Supplier {
  id: string;
  name: string;
  description: string;
  country: string;
  region: string;
  city: string;
  sectorIds: string[];
  domain: string;
  services: string[];
  specialisation: string;
  coverage: string[]; // countries covered
  website: string;
  phone: string;
  email: string;
  address: string;
  contactIds: string[];
  relationshipOwner: string;
  status: RelationshipStage;
  firstContactDate: ISODate | null;
  lastInteraction: ISODate | null;
  previousCooperation: string;
  notes: string;
  documents: SupplierDocument[];
  followUpDate: ISODate | null;
  capacityScore: number; // 1–5 internal assessment
  createdAt: ISODate;
  provenance: Provenance;
}

export type InteractionType = "Introduction" | "Email" | "Call" | "Meeting" | "Response" | "Evaluation" | "Note";

export interface Interaction {
  id: string;
  supplierId: string;
  date: ISODate;
  type: InteractionType;
  summary: string;
  by: string;
  stageAfter?: RelationshipStage;
}

export interface Meeting {
  id: string;
  supplierId: string;
  date: ISODate;
  time: string;
  subject: string;
  location: string;
  attendees: string[];
  status: "Scheduled" | "Held" | "Cancelled";
  notes: string;
}

/* ------------------------------------------------------------------ */
/* Talent & local experts                                              */
/* ------------------------------------------------------------------ */

export interface JobOpportunity {
  id: string;
  title: string;
  role: string;
  country: string;
  location: string;
  expertise: string[];
  experienceYears: number;
  engagement: "Full-time" | "Project-based" | "Short mission" | "Advisory";
  sectorId: string;
  status: "Open" | "Interviewing" | "Filled" | "On hold";
  postedOn: ISODate;
  description: string;
}

export interface TalentProfile {
  id: string;
  name: string;
  email: string;
  country: string;
  city: string;
  expertise: string[];
  experienceYears: number;
  skills: string[];
  availability: "Immediate" | "1 month" | "3 months" | "Unavailable";
  consent: boolean;
  createdAt: ISODate;
  synthetic: true;
}

export type ApplicationStatus = "Received" | "Screening" | "Interview" | "Shortlisted" | "Placed" | "Declined";

export interface Application {
  id: string;
  jobId: string;
  talentId: string;
  submittedOn: ISODate;
  status: ApplicationStatus;
  cvPlaceholder: string;
  note: string;
}

/* ------------------------------------------------------------------ */
/* Bid workspace                                                        */
/* ------------------------------------------------------------------ */

export type BidDecision = "Pending" | "Bid" | "No-bid" | "Watch";

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  owner?: string;
  due?: ISODate | null;
}

export interface BidAssessment {
  opportunityId: string;
  decision: BidDecision;
  scores: {
    commercial: number; // 1–5
    sectorRelevance: number;
    buyer: number;
    competition: number;
    supplierAvailability: number;
    technicalFit: number;
  };
  technicalRequirements: string;
  requiredDocuments: string[];
  risks: string;
  notes: string;
  checklist: ChecklistItem[];
  responsible: string;
  followUpDate: ISODate | null;
  stage: "Screening" | "Assessment" | "Review" | "Decided";
  updatedAt: string;
}

export interface SavedOpportunity {
  opportunityId: string;
  savedAt: string;
  tracking: "Watching" | "Qualifying" | "Preparing bid" | "Submitted" | "Dropped";
}

export interface Task {
  id: string;
  opportunityId: string | null;
  supplierId: string | null;
  title: string;
  owner: string;
  due: ISODate | null;
  done: boolean;
}

export interface GeneratedReport {
  id: string;
  kind: ReportKind;
  subjectId: string | null;
  title: string;
  generatedAt: string;
}

export type ReportKind =
  | "opportunity"
  | "buyer"
  | "competitor"
  | "awardee"
  | "market"
  | "supplier"
  | "signals"
  | "bid";

/* ------------------------------------------------------------------ */
/* Aggregated dataset                                                   */
/* ------------------------------------------------------------------ */

export interface Dataset {
  meta: {
    name: string;
    seed: number;
    generator: string;
    referenceDate: ISODate; // fixed "today" for reproducible analytics
    periodStart: ISODate;
    periodEnd: ISODate;
    disclaimer: string;
  };
  sectors: Sector[];
  regions: Region[];
  buyers: Buyer[];
  companies: Company[];
  opportunities: Opportunity[];
  participations: Participation[];
  awards: Award[];
  suppliers: Supplier[];
  contacts: Contact[];
  interactions: Interaction[];
  meetings: Meeting[];
  jobs: JobOpportunity[];
  talents: TalentProfile[];
  applications: Application[];
}
