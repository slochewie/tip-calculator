import {
	type Dispatch,
	type SetStateAction,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

import {
	DEFAULT_TIP_CLAIM_WEIGHTS,
	type TipClaimRoleKey,
	type TipClaimRoleState,
	type TipClaimWeightState,
} from "#/lib/tip-claim-allocation.ts";
import {
	clearTipClaimDraft,
	loadTipClaimDraft,
	saveTipClaimDraft,
	type TipClaimDraftRegister,
	type TipClaimDraftStaffAssignment,
} from "#/lib/tip-claim-draft.ts";

type DraftMember = {
	id: string;
	bartenderEnabled: boolean;
	managerEnabled: boolean;
	barbackEnabled: boolean;
	doorEnabled: boolean;
};

type UseTipClaimDraftOptions = {
	organizationId?: string;
	members?: DraftMember[];
	membersPending: boolean;
	claimPercent: string;
	setClaimPercent: Dispatch<SetStateAction<string>>;
	nextRegisterId: number;
	setNextRegisterId: Dispatch<SetStateAction<number>>;
	registers: TipClaimDraftRegister[];
	setRegisters: Dispatch<SetStateAction<TipClaimDraftRegister[]>>;
	staff: TipClaimRoleState;
	setStaff: Dispatch<SetStateAction<TipClaimRoleState>>;
	memberAssignments: TipClaimDraftStaffAssignment[];
	setMemberAssignments: Dispatch<SetStateAction<TipClaimDraftStaffAssignment[]>>;
	weights: TipClaimWeightState;
	setWeights: Dispatch<SetStateAction<TipClaimWeightState>>;
};

const DEFAULT_STAFF: TipClaimRoleState = {
	bartender: 1,
	manager: 0,
	barback: 0,
	door: 0,
};

const DEFAULT_REGISTERS: TipClaimDraftRegister[] = [
	{ id: 1, name: "Register A", sales: "0" },
];

function isRoleEnabled(member: DraftMember, role: TipClaimRoleKey) {
	return member[`${role}Enabled` as keyof DraftMember] === true;
}

function reconcileAssignments(
	assignments: TipClaimDraftStaffAssignment[],
	members: DraftMember[],
	registers: TipClaimDraftRegister[],
) {
	const validRegisterIds = new Set(registers.map((register) => register.id));
	const usedUsers = new Set<string>();
	const usedRegisters = new Set<number>();

	return assignments.flatMap((assignment) => {
		if (usedUsers.has(assignment.userId)) return [];

		const member = members.find((candidate) => candidate.id === assignment.userId);
		if (!member || !isRoleEnabled(member, assignment.role)) return [];

		let registerId = assignment.registerId;
		if (
			registerId !== null &&
			(!validRegisterIds.has(registerId) ||
				usedRegisters.has(registerId) ||
				(assignment.role !== "bartender" && assignment.role !== "manager"))
		) {
			registerId = null;
		}

		usedUsers.add(assignment.userId);
		if (registerId !== null) usedRegisters.add(registerId);

		return [{ ...assignment, registerId }];
	});
}

export function useTipClaimDraft({
	organizationId,
	members,
	membersPending,
	claimPercent,
	setClaimPercent,
	nextRegisterId,
	setNextRegisterId,
	registers,
	setRegisters,
	staff,
	setStaff,
	memberAssignments,
	setMemberAssignments,
	weights,
	setWeights,
}: UseTipClaimDraftOptions) {
	const hydratedOrganizationRef = useRef<string | null>(null);
	const skipNextAutosaveRef = useRef(false);
	const autosaveTimeoutRef = useRef<number | null>(null);
	const [draftStatus, setDraftStatus] = useState<"saving" | "saved" | null>(null);
	const [draftUpdatedAt, setDraftUpdatedAt] = useState<string | null>(null);

	useEffect(() => {
		if (!organizationId || members === undefined || membersPending) return;
		if (hydratedOrganizationRef.current === organizationId) return;

		if (autosaveTimeoutRef.current !== null) {
			window.clearTimeout(autosaveTimeoutRef.current);
			autosaveTimeoutRef.current = null;
		}

		const draft = loadTipClaimDraft(organizationId);
		hydratedOrganizationRef.current = organizationId;
		skipNextAutosaveRef.current = true;

		if (!draft) {
			setClaimPercent("8");
			setNextRegisterId(2);
			setRegisters(DEFAULT_REGISTERS.map((register) => ({ ...register })));
			setStaff({ ...DEFAULT_STAFF });
			setMemberAssignments([]);
			setWeights({ ...DEFAULT_TIP_CLAIM_WEIGHTS });
			setDraftStatus(null);
			setDraftUpdatedAt(null);
			return;
		}

		const restoredRegisters =
			draft.registers.length > 0
				? draft.registers
				: DEFAULT_REGISTERS.map((register) => ({ ...register }));

		setClaimPercent(draft.claimPercent);
		setNextRegisterId(
			Math.max(
				draft.nextRegisterId,
				...restoredRegisters.map((register) => register.id + 1),
			),
		);
		setRegisters(restoredRegisters);
		setStaff(draft.staff);
		setMemberAssignments(
			reconcileAssignments(draft.memberAssignments, members, restoredRegisters),
		);
		setWeights(draft.weights);
		setDraftStatus("saved");
		setDraftUpdatedAt(draft.updatedAt);
	}, [
		members,
		membersPending,
		organizationId,
		setClaimPercent,
		setMemberAssignments,
		setNextRegisterId,
		setRegisters,
		setStaff,
		setWeights,
	]);

	useEffect(() => {
		if (!organizationId || members === undefined || membersPending) return;
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
			saveTipClaimDraft(organizationId, {
				claimPercent,
				nextRegisterId,
				registers,
				staff,
				memberAssignments,
				weights,
			});
			autosaveTimeoutRef.current = null;
			setDraftStatus("saved");
			setDraftUpdatedAt(new Date().toISOString());
		}, 600);

		return () => {
			if (autosaveTimeoutRef.current !== null) {
				window.clearTimeout(autosaveTimeoutRef.current);
				autosaveTimeoutRef.current = null;
			}
		};
	}, [
		claimPercent,
		memberAssignments,
		members,
		membersPending,
		nextRegisterId,
		organizationId,
		registers,
		staff,
		weights,
	]);

	const clearDraft = useCallback(() => {
		if (!organizationId) return;
		if (autosaveTimeoutRef.current !== null) {
			window.clearTimeout(autosaveTimeoutRef.current);
			autosaveTimeoutRef.current = null;
		}
		clearTipClaimDraft(organizationId);
		setDraftStatus(null);
		setDraftUpdatedAt(null);
	}, [organizationId]);

	const resetDraft = useCallback(() => {
		if (!organizationId) return;
		if (autosaveTimeoutRef.current !== null) {
			window.clearTimeout(autosaveTimeoutRef.current);
			autosaveTimeoutRef.current = null;
		}

		skipNextAutosaveRef.current = true;
		clearTipClaimDraft(organizationId);
		setClaimPercent("8");
		setNextRegisterId(2);
		setRegisters(DEFAULT_REGISTERS.map((register) => ({ ...register })));
		setStaff({ ...DEFAULT_STAFF });
		setMemberAssignments([]);
		setWeights({ ...DEFAULT_TIP_CLAIM_WEIGHTS });
		setDraftStatus(null);
		setDraftUpdatedAt(null);
	}, [
		organizationId,
		setClaimPercent,
		setMemberAssignments,
		setNextRegisterId,
		setRegisters,
		setStaff,
		setWeights,
	]);

	return {
		draftStatus,
		draftUpdatedAt,
		clearDraft,
		resetDraft,
	};
}
