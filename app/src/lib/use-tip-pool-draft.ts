import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type { TipClaimMember } from "#/components/tip-claim-calculator.tsx";
import {
  DEFAULT_TIP_CLAIM_WEIGHTS,
  TIP_CLAIM_ROLE_ORDER,
  type TipClaimRoleKey,
  type TipClaimWeightState,
} from "#/lib/tip-claim-allocation.ts";
import type { TipPoolShiftReport } from "#/lib/tip-pool.ts";

export type TipPoolStaffAssignment = {
  userId: string;
  role: TipClaimRoleKey;
};

type TipPoolDraft = {
  version: 1;
  organizationId: string;
  updatedAt: string;
  totalTips: string;
  assignments: TipPoolStaffAssignment[];
  weights: TipClaimWeightState;
  editingShiftId?: string | null;
  editingCompletedAt?: string | null;
};

type UseTipPoolDraftOptions = {
  organizationId?: string;
  members: TipClaimMember[];
  membersPending: boolean;
  totalTips: string;
  setTotalTips: Dispatch<SetStateAction<string>>;
  assignments: TipPoolStaffAssignment[];
  setAssignments: Dispatch<SetStateAction<TipPoolStaffAssignment[]>>;
  weights: TipClaimWeightState;
  setWeights: Dispatch<SetStateAction<TipClaimWeightState>>;
  editingShiftId: string | null;
  setEditingShiftId: Dispatch<SetStateAction<string | null>>;
  editingCompletedAt: string | null;
  setEditingCompletedAt: Dispatch<SetStateAction<string | null>>;
};

const DRAFT_VERSION = 1;

function storageKey(organizationId: string) {
  return `tip-pool-draft:${organizationId}`;
}

function isRoleEnabled(member: TipClaimMember, role: TipClaimRoleKey) {
  return member[`${role}Enabled` as keyof TipClaimMember] === true;
}

function loadDraft(organizationId: string): TipPoolDraft | null {
  try {
    const raw = window.localStorage.getItem(storageKey(organizationId));
    if (!raw) return null;

    const draft = JSON.parse(raw) as Partial<TipPoolDraft>;
    if (
      draft.version !== DRAFT_VERSION ||
      draft.organizationId !== organizationId ||
      typeof draft.totalTips !== "string" ||
      !Array.isArray(draft.assignments) ||
      !draft.weights
    ) {
      return null;
    }

    const validWeights = TIP_CLAIM_ROLE_ORDER.every(
      (role) =>
        typeof draft.weights?.[role] === "number" &&
        Number.isFinite(draft.weights[role]),
    );
    if (!validWeights) return null;

    const validAssignments = draft.assignments.every(
      (assignment) =>
        assignment &&
        typeof assignment.userId === "string" &&
        TIP_CLAIM_ROLE_ORDER.includes(assignment.role),
    );
    if (!validAssignments) return null;

    return draft as TipPoolDraft;
  } catch {
    return null;
  }
}

function reconcileAssignments(
  assignments: TipPoolStaffAssignment[],
  members: TipClaimMember[],
) {
  const usedUsers = new Set<string>();

  return assignments.flatMap((assignment) => {
    if (usedUsers.has(assignment.userId)) return [];

    const member = members.find((candidate) => candidate.id === assignment.userId);
    if (!member || !isRoleEnabled(member, assignment.role)) return [];

    usedUsers.add(assignment.userId);
    return [assignment];
  });
}

export function saveTipPoolCorrectionDraft(shift: TipPoolShiftReport) {
  const weights: TipClaimWeightState = {
    manager: shift.managerWeightTenths / 10,
    bartender: shift.bartenderWeightTenths / 10,
    barback: shift.barbackWeightTenths / 10,
    door: shift.doorWeightTenths / 10,
  };
  const updatedAt = new Date().toISOString();
  const draft: TipPoolDraft = {
    version: DRAFT_VERSION,
    organizationId: shift.organizationId,
    updatedAt,
    totalTips: (shift.totalTipsCents / 100).toFixed(2),
    assignments: shift.staff.map((staffMember) => ({
      userId: staffMember.userId,
      role: staffMember.role,
    })),
    weights,
    editingShiftId: shift.id,
    editingCompletedAt: shift.completedAt,
  };

  window.localStorage.setItem(storageKey(shift.organizationId), JSON.stringify(draft));
}

export function useTipPoolDraft({
  organizationId,
  members,
  membersPending,
  totalTips,
  setTotalTips,
  assignments,
  setAssignments,
  weights,
  setWeights,
  editingShiftId,
  setEditingShiftId,
  editingCompletedAt,
  setEditingCompletedAt,
}: UseTipPoolDraftOptions) {
  const hydratedOrganizationRef = useRef<string | null>(null);
  const skipNextAutosaveRef = useRef(false);
  const autosaveTimeoutRef = useRef<number | null>(null);
  const [draftStatus, setDraftStatus] = useState<"saving" | "saved" | null>(null);
  const [draftUpdatedAt, setDraftUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId || membersPending) return;
    if (hydratedOrganizationRef.current === organizationId) return;

    if (autosaveTimeoutRef.current !== null) {
      window.clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }

    const draft = loadDraft(organizationId);
    hydratedOrganizationRef.current = organizationId;
    skipNextAutosaveRef.current = true;

    if (!draft) {
      setTotalTips("");
      setAssignments([]);
      setWeights({ ...DEFAULT_TIP_CLAIM_WEIGHTS });
      setEditingShiftId(null);
      setEditingCompletedAt(null);
      setDraftStatus(null);
      setDraftUpdatedAt(null);
      return;
    }

    setTotalTips(draft.totalTips);
    setAssignments(reconcileAssignments(draft.assignments, members));
    setWeights(draft.weights);
    setEditingShiftId(draft.editingShiftId ?? null);
    setEditingCompletedAt(draft.editingCompletedAt ?? null);
    setDraftStatus("saved");
    setDraftUpdatedAt(draft.updatedAt);
  }, [
    members,
    membersPending,
    organizationId,
    setAssignments,
    setEditingCompletedAt,
    setEditingShiftId,
    setTotalTips,
    setWeights,
  ]);

  useEffect(() => {
    if (!organizationId || membersPending) return;
    if (hydratedOrganizationRef.current !== organizationId) return;

    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return;
    }

    if (autosaveTimeoutRef.current !== null) {
      window.clearTimeout(autosaveTimeoutRef.current);
    }

    setDraftStatus("saving");
    autosaveTimeoutRef.current = window.setTimeout(() => {
      const updatedAt = new Date().toISOString();
      const draft: TipPoolDraft = {
        version: DRAFT_VERSION,
        organizationId,
        updatedAt,
        totalTips,
        assignments,
        weights,
        editingShiftId,
        editingCompletedAt,
      };
      window.localStorage.setItem(storageKey(organizationId), JSON.stringify(draft));
      autosaveTimeoutRef.current = null;
      setDraftStatus("saved");
      setDraftUpdatedAt(updatedAt);
    }, 600);

    return () => {
      if (autosaveTimeoutRef.current !== null) {
        window.clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }
    };
  }, [
    assignments,
    editingCompletedAt,
    editingShiftId,
    membersPending,
    organizationId,
    totalTips,
    weights,
  ]);

  const resetDraft = useCallback(() => {
    if (!organizationId) return;

    if (autosaveTimeoutRef.current !== null) {
      window.clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }

    skipNextAutosaveRef.current = true;
    window.localStorage.removeItem(storageKey(organizationId));
    setTotalTips("");
    setAssignments([]);
    setWeights({ ...DEFAULT_TIP_CLAIM_WEIGHTS });
    setEditingShiftId(null);
    setEditingCompletedAt(null);
    setDraftStatus(null);
    setDraftUpdatedAt(null);
  }, [
    organizationId,
    setAssignments,
    setEditingCompletedAt,
    setEditingShiftId,
    setTotalTips,
    setWeights,
  ]);

  return {
    draftStatus,
    draftUpdatedAt,
    resetDraft,
  };
}
