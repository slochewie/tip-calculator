import {
	allocateTipClaims,
	getTipClaimTotalWeight,
	TIP_CLAIM_ROLE_ORDER,
	type TipClaimRoleKey,
	type TipClaimRoleState,
	type TipClaimWeightState,
} from "#/lib/tip-claim-allocation.ts";
import type { TipClaimSaveStaff } from "#/lib/tip-claim.ts";

export type TipClaimResolvedStaff = {
	userId: string;
	name: string;
	email: string;
	role: TipClaimRoleKey;
	registerKey: string | null;
};

function getRoleCounts(staff: TipClaimResolvedStaff[]): TipClaimRoleState {
	return staff.reduce<TipClaimRoleState>(
		(counts, person) => ({
			...counts,
			[person.role]: counts[person.role] + 1,
		}),
		{
			bartender: 0,
			manager: 0,
			barback: 0,
			door: 0,
		},
	);
}

export function buildTipClaimShiftAllocation(
	requiredClaimCents: number,
	staff: TipClaimResolvedStaff[],
	weights: TipClaimWeightState,
): {
	staff: TipClaimSaveStaff[];
	totalWeightUnits: number;
	allocatedClaimCents: number;
} {
	const roleCounts = getRoleCounts(staff);
	const allocations = allocateTipClaims(requiredClaimCents, roleCounts, weights);
	const allocationByRoleAndPerson = new Map(
		allocations.map((allocation) => [
			`${allocation.role}:${allocation.person}`,
			allocation.cents,
		]),
	);
	const roleIndexes: TipClaimRoleState = {
		bartender: 0,
		manager: 0,
		barback: 0,
		door: 0,
	};

	const savedStaff = staff.map<TipClaimSaveStaff>((person) => {
		roleIndexes[person.role] += 1;
		return {
			...person,
			weight: weights[person.role],
			claimCents:
				allocationByRoleAndPerson.get(
					`${person.role}:${roleIndexes[person.role]}`,
				) ?? 0,
		};
	});

	return {
		staff: savedStaff,
		totalWeightUnits: getTipClaimTotalWeight(roleCounts, weights),
		allocatedClaimCents: savedStaff.reduce(
			(sum, person) => sum + person.claimCents,
			0,
		),
	};
}

export function orderTipClaimStaffByRole(staff: TipClaimResolvedStaff[]) {
	return TIP_CLAIM_ROLE_ORDER.flatMap((role) =>
		staff.filter((person) => person.role === role),
	);
}
