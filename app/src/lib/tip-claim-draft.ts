import type {
	TipClaimRoleState,
	TipClaimWeightState,
} from "#/lib/tip-claim-allocation.ts";

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

export function clearTipClaimDraft(organizationId: string) {
	if (typeof window === "undefined") return;
	window.localStorage.removeItem(draftKey(organizationId));
}
