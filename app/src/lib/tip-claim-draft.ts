import type {
	TipClaimRoleState,
	TipClaimWeightState,
} from "#/lib/tip-claim-allocation.ts";
import type { TipClaimShiftReport } from "#/lib/tip-claim.ts";

export type TipClaimDraftRegister = {
	id: number;
	name: string;
	sales: string;
};

export type TipClaimDraftStaffAssignment = {
	userId: string;
	role: "bartender" | "manager" | "barback" | "door";
	registerId: number | null;
};

export type TipClaimDraft = {
	version: 1;
	updatedAt: string;
	claimPercent: string;
	nextRegisterId: number;
	registers: TipClaimDraftRegister[];
	staff: TipClaimRoleState;
	memberAssignments: TipClaimDraftStaffAssignment[];
	weights: TipClaimWeightState;
	editingShiftId?: string | null;
	editingCompletedAt?: string | null;
};

const DRAFT_KEY_PREFIX = "niteowl:tip-claim:draft:v1:";

function draftKey(organizationId: string) {
	return `${DRAFT_KEY_PREFIX}${organizationId}`;
}

export function loadTipClaimDraft(organizationId: string): TipClaimDraft | null {
	if (typeof window === "undefined") return null;

	try {
		const stored = window.localStorage.getItem(draftKey(organizationId));
		if (!stored) return null;

		const draft = JSON.parse(stored) as Partial<TipClaimDraft>;
		if (
			draft.version !== 1 ||
			typeof draft.claimPercent !== "string" ||
			!Array.isArray(draft.registers) ||
			!Array.isArray(draft.memberAssignments) ||
			!draft.staff ||
			!draft.weights
		) {
			return null;
		}

		return draft as TipClaimDraft;
	} catch {
		return null;
	}
}

export function saveTipClaimDraft(
	organizationId: string,
	draft: Omit<TipClaimDraft, "version" | "updatedAt">,
) {
	if (typeof window === "undefined") return;

	const stored: TipClaimDraft = {
		...draft,
		version: 1,
		updatedAt: new Date().toISOString(),
	};

	window.localStorage.setItem(draftKey(organizationId), JSON.stringify(stored));
}

export function saveTipClaimCorrectionDraft(shift: TipClaimShiftReport) {
	const usedIds = new Set<number>();
	const registerIds = new Map<string, number>();
	let nextFallbackId = 1;

	const registers = shift.registers.map((register) => {
		const parsedId = Number.parseInt(register.registerKey, 10);
		let id =
			Number.isSafeInteger(parsedId) && parsedId > 0 && !usedIds.has(parsedId)
				? parsedId
				: nextFallbackId;

		while (usedIds.has(id)) id += 1;
		usedIds.add(id);
		nextFallbackId = Math.max(nextFallbackId, id + 1);
		registerIds.set(register.registerKey, id);

		return {
			id,
			name: register.name,
			sales: (register.salesCents / 100).toFixed(2),
		};
	});

	const memberAssignments = shift.staff.map((staffMember) => ({
		userId: staffMember.userId,
		role: staffMember.role,
		registerId:
			staffMember.registerKey == null
				? null
				: (registerIds.get(staffMember.registerKey) ?? null),
	}));

	const staff = memberAssignments.reduce<TipClaimRoleState>(
		(counts, assignment) => ({
			...counts,
			[assignment.role]: counts[assignment.role] + 1,
		}),
		{ bartender: 0, manager: 0, barback: 0, door: 0 },
	);

	saveTipClaimDraft(shift.organizationId, {
		claimPercent: String(shift.claimPercent),
		nextRegisterId: Math.max(1, ...registers.map((register) => register.id + 1)),
		registers,
		staff,
		memberAssignments,
		weights: {
			bartender: shift.bartenderWeight,
			manager: shift.managerWeight,
			barback: shift.barbackWeight,
			door: shift.doorWeight,
		},
		editingShiftId: shift.id,
		editingCompletedAt: shift.completedAt,
	});
}

export function clearTipClaimDraft(organizationId: string) {
	if (typeof window === "undefined") return;
	window.localStorage.removeItem(draftKey(organizationId));
}
