import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type { TipClaimMember } from "#/components/tip-claim-calculator.tsx";
import type { TipPoolAllocationMode } from "#/components/tip-pool-allocation-settings.tsx";
import {
  DEFAULT_TIP_CLAIM_WEIGHTS,
  TIP_CLAIM_ROLE_ORDER,
  type TipClaimRoleKey,
  type TipClaimWeightState,
} from "#/lib/tip-claim-allocation.ts";
import {
  DEFAULT_TIP_POOL_PERCENTAGES,
  getTipPoolActualPercentages,
  type TipPoolPercentageTargets,
} from "#/lib/tip-pool-percentage-allocation.ts";
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
  allocationMode?: TipPoolAllocationMode;
  percentageTargets?: TipPoolPercentageTargets;
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
  allocationMode: TipPoolAllocationMode;
  setAllocationMode: Dispatch<SetStateAction<TipPoolAllocationMode>>;
  percentageTargets: TipPoolPercentageTargets;
  setPercentageTargets: Dispatch<SetStateAction<TipPoolPercentageTargets>>;
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

function validPercentageTargets(value: unknown): value is TipPoolPercentageTargets {
  if (!value || typeof value !== "object") return false;
  const targets = value as Partial<TipPoolPercentageTargets>;

  return TIP_CLAIM_ROLE_ORDER.every(
    (role) =>
      typeof targets[role] === "number" && Number.isFinite(targets[role]),
  );
}

function hasAnyPositiveWeight(weights: TipClaimWeightState) {
  return TIP_CLAIM_ROLE_ORDER.some((role) => weights[role] > 0);
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
  const staff = shift.staff.reduce(
    (counts, staffMember) => ({
      ...counts,
      [staffMember.role]: counts[staffMember.role] + 1,
    }),
    { bartender: 0, manager: 0, barback: 0, door: 0 },
  );
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
    allocationMode: "weights",
    percentageTargets: getTipPoolActualPercentages(staff, weights),
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
  allocationMode,
  setAllocationMode,
  percentageTargets,
  setPercentageTargets,
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
      setAllocationMode("weights");
      setPercentageTargets({ ...DEFAULT_TIP_POOL_PERCENTAGES });
      setEditingShiftId(null);
      setEditingCompletedAt(null);
      setDraftStatus(null);
      setDraftUpdatedAt(null);
      return;
    }

    const reconciledAssignments = reconcileAssignments(draft.assignments, members);
    const restoredMode =
      draft.allocationMode === "percentages" ? "percentages" : "weights";
    const restoredWeights =
      restoredMode === "weights" && !hasAnyPositiveWeight(draft.weights)
        ? { ...DEFAULT_TIP_CLAIM_WEIGHTS }
        : draft.weights;

    setTotalTips(draft.totalTips);
    setAssignments(reconciledAssignments);
    setWeights(restoredWeights);
    setAllocationMode(restoredMode);
    setPercentageTargets(
      validPercentageTargets(draft.percentageTargets)
        ? draft.percentageTargets
        : { ...DEFAULT_TIP_POOL_PERCENTAGES },
    );
    setEditingShiftId(draft.editingShiftId ?? null);
    setEditingCompletedAt(draft.editingCompletedAt ?? null);
    setDraftStatus("saved");
    setDraftUpdatedAt(draft.updatedAt);
  }, [
    members,
    membersPending,
    organizationId,
    setAllocationMode,
    setAssignments,
    setEditingCompletedAt,
    setEditingShiftId,
    setPercentageTargets,
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
        allocationMode,
        percentageTargets,
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
    allocationMode,
    assignments,
    editingCompletedAt,
    editingShiftId,
    membersPending,
    organizationId,
    percentageTargets,
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
    setAllocationMode("weights");
    setPercentageTargets({ ...DEFAULT_TIP_POOL_PERCENTAGES });
    setEditingShiftId(null);
    setEditingCompletedAt(null);
    setDraftStatus(null);
    setDraftUpdatedAt(null);
  }, [
    organizationId,
    setAllocationMode,
    setAssignments,
    setEditingCompletedAt,
    setEditingShiftId,
    setPercentageTargets,
    setTotalTips,
    setWeights,
  ]);

  return {
    draftStatus,
    draftUpdatedAt,
    resetDraft,
  };
}
