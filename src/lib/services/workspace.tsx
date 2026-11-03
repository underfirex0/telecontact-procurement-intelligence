"use client";
/**
 * Workspace store — user-created and user-edited records layered on top of the
 * read-only synthetic dataset. Persisted in the browser (localStorage) so the
 * prototype is fully self-contained. Every write goes through `dispatch`, which
 * makes swapping this for API calls straightforward.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { getContext, getDataset } from "./data-service";
import type {
  Application, BidAssessment, Contact, GeneratedReport, Interaction, Meeting, RelationshipStage, SavedOpportunity, Supplier, TalentProfile,
} from "../types";

export const CURRENT_USER = "Demo User (Analyst)";
const KEY = "tci.workspace.v1";

export interface ProviderRegistration {
  id: string;
  submittedAt: string;
  supplierId: string;
  areasOfCooperation: string[];
  additionalInfo: string;
}

export interface WorkspaceState {
  version: 1;
  saved: Record<string, SavedOpportunity>;
  assessments: Record<string, BidAssessment>;
  supplierEdits: Record<string, Partial<Supplier>>;
  newSuppliers: Supplier[];
  newContacts: Contact[];
  interactions: Interaction[];
  meetings: Meeting[];
  meetingEdits: Record<string, Partial<Meeting>>;
  registrations: ProviderRegistration[];
  talents: TalentProfile[];
  applications: Application[];
  applicationEdits: Record<string, Application["status"]>;
  reports: GeneratedReport[];
  readNotifications: string[];
}

const EMPTY: WorkspaceState = {
  version: 1, saved: {}, assessments: {}, supplierEdits: {}, newSuppliers: [], newContacts: [], interactions: [], meetings: [],
  meetingEdits: {}, registrations: [], talents: [], applications: [], applicationEdits: {}, reports: [], readNotifications: [],
};

export type Action =
  | { type: "hydrate"; state: WorkspaceState }
  | { type: "reset" }
  | { type: "toggleSave"; opportunityId: string }
  | { type: "setTracking"; opportunityId: string; tracking: SavedOpportunity["tracking"] }
  | { type: "saveAssessment"; assessment: BidAssessment }
  | { type: "deleteAssessment"; opportunityId: string }
  | { type: "createSupplier"; supplier: Supplier; contact?: Contact }
  | { type: "updateSupplier"; id: string; patch: Partial<Supplier> }
  | { type: "addContact"; contact: Contact }
  | { type: "logInteraction"; interaction: Interaction }
  | { type: "scheduleMeeting"; meeting: Meeting }
  | { type: "updateMeeting"; id: string; patch: Partial<Meeting> }
  | { type: "register"; registration: ProviderRegistration; supplier: Supplier; contact: Contact }
  | { type: "apply"; talent: TalentProfile; application: Application }
  | { type: "setApplicationStatus"; id: string; status: Application["status"] }
  | { type: "logReport"; report: GeneratedReport }
  | { type: "markRead"; ids: string[] };

function reducer(s: WorkspaceState, a: Action): WorkspaceState {
  switch (a.type) {
    case "hydrate": return { ...EMPTY, ...a.state };
    case "reset": return EMPTY;
    case "toggleSave": {
      const saved = { ...s.saved };
      if (saved[a.opportunityId]) delete saved[a.opportunityId];
      else saved[a.opportunityId] = { opportunityId: a.opportunityId, savedAt: new Date().toISOString(), tracking: "Watching" };
      return { ...s, saved };
    }
    case "setTracking": {
      const cur = s.saved[a.opportunityId] ?? { opportunityId: a.opportunityId, savedAt: new Date().toISOString(), tracking: "Watching" as const };
      return { ...s, saved: { ...s.saved, [a.opportunityId]: { ...cur, tracking: a.tracking } } };
    }
    case "saveAssessment": {
      const saved = s.saved[a.assessment.opportunityId] ? s.saved : { ...s.saved, [a.assessment.opportunityId]: { opportunityId: a.assessment.opportunityId, savedAt: new Date().toISOString(), tracking: "Qualifying" as const } };
      return { ...s, saved, assessments: { ...s.assessments, [a.assessment.opportunityId]: a.assessment } };
    }
    case "deleteAssessment": {
      const assessments = { ...s.assessments };
      delete assessments[a.opportunityId];
      return { ...s, assessments };
    }
    case "createSupplier": return { ...s, newSuppliers: [...s.newSuppliers, a.supplier], newContacts: a.contact ? [...s.newContacts, a.contact] : s.newContacts };
    case "updateSupplier": {
      if (s.newSuppliers.some((x) => x.id === a.id)) return { ...s, newSuppliers: s.newSuppliers.map((x) => (x.id === a.id ? { ...x, ...a.patch } : x)) };
      return { ...s, supplierEdits: { ...s.supplierEdits, [a.id]: { ...s.supplierEdits[a.id], ...a.patch } } };
    }
    case "addContact": return { ...s, newContacts: [...s.newContacts, a.contact] };
    case "logInteraction": return { ...s, interactions: [...s.interactions, a.interaction] };
    case "scheduleMeeting": return { ...s, meetings: [...s.meetings, a.meeting] };
    case "updateMeeting": {
      if (s.meetings.some((m) => m.id === a.id)) return { ...s, meetings: s.meetings.map((m) => (m.id === a.id ? { ...m, ...a.patch } : m)) };
      return { ...s, meetingEdits: { ...s.meetingEdits, [a.id]: { ...s.meetingEdits[a.id], ...a.patch } } };
    }
    case "register": return { ...s, registrations: [...s.registrations, a.registration], newSuppliers: [...s.newSuppliers, a.supplier], newContacts: [...s.newContacts, a.contact] };
    case "apply": return { ...s, talents: [...s.talents, a.talent], applications: [...s.applications, a.application] };
    case "setApplicationStatus": {
      if (s.applications.some((x) => x.id === a.id)) return { ...s, applications: s.applications.map((x) => (x.id === a.id ? { ...x, status: a.status } : x)) };
      return { ...s, applicationEdits: { ...s.applicationEdits, [a.id]: a.status } };
    }
    case "logReport": return { ...s, reports: [a.report, ...s.reports].slice(0, 50) };
    case "markRead": return { ...s, readNotifications: [...new Set([...s.readNotifications, ...a.ids])] };
  }
}

interface WorkspaceApi {
  state: WorkspaceState;
  hydrated: boolean;
  dispatch: (a: Action) => void;
  toast: (msg: string) => void;
  toasts: { id: number; msg: string }[];
}

const Ctx = createContext<WorkspaceApi | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const seq = useRef(0);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.version === 1) dispatch({ type: "hydrate", state: parsed });
      }
    } catch {
      /* storage unavailable: run in memory */
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore quota / private mode */
    }
  }, [state, hydrated]);
  const toast = useCallback((msg: string) => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  const api = useMemo(() => ({ state, hydrated, dispatch, toast, toasts }), [state, hydrated, toast, toasts]);
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useWorkspace(): WorkspaceApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWorkspace outside provider");
  return v;
}

/* ---------------- merged selectors ---------------- */

export function useSuppliers(): Supplier[] {
  const { state } = useWorkspace();
  return useMemo(() => {
    const base = getDataset().suppliers.map((s) => (state.supplierEdits[s.id] ? { ...s, ...state.supplierEdits[s.id] } : s));
    return [...base, ...state.newSuppliers];
  }, [state.supplierEdits, state.newSuppliers]);
}

export function useContacts(): Contact[] {
  const { state } = useWorkspace();
  return useMemo(() => [...getDataset().contacts, ...state.newContacts], [state.newContacts]);
}

export function useInteractions(): Interaction[] {
  const { state } = useWorkspace();
  return useMemo(() => [...getDataset().interactions, ...state.interactions].sort((a, b) => b.date.localeCompare(a.date)), [state.interactions]);
}

export function useMeetings(): Meeting[] {
  const { state } = useWorkspace();
  return useMemo(
    () => [...getDataset().meetings.map((m) => (state.meetingEdits[m.id] ? { ...m, ...state.meetingEdits[m.id] } : m)), ...state.meetings].sort((a, b) => a.date.localeCompare(b.date)),
    [state.meetings, state.meetingEdits],
  );
}

export function useTalentData() {
  const { state } = useWorkspace();
  return useMemo(() => {
    const ds = getDataset();
    return {
      jobs: ds.jobs,
      talents: [...ds.talents, ...state.talents],
      applications: [...ds.applications.map((a) => (state.applicationEdits[a.id] ? { ...a, status: state.applicationEdits[a.id] } : a)), ...state.applications],
    };
  }, [state.talents, state.applications, state.applicationEdits]);
}

export function useAnalytics() {
  return getContext();
}

export function nextId(prefix: string, existing: { id: string }[]): string {
  const n = existing.reduce((m, x) => {
    const k = Number(x.id.replace(/\D/g, ""));
    return Number.isFinite(k) ? Math.max(m, k) : m;
  }, 0);
  return `${prefix}-${String(n + 1).padStart(3, "0")}`;
}

export function stageIndex(s: RelationshipStage): number {
  return ["Identified", "Not contacted", "Contacted", "Responded", "Meeting scheduled", "Negotiation", "Active partner", "Inactive", "Rejected"].indexOf(s);
}
