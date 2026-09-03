export type TipClaimRoleKey = "bartender" | "manager" | "barback" | "door";

export type TipClaimRoleState = Record<TipClaimRoleKey, number>;
export type TipClaimWeightState = Record<TipClaimRoleKey, number>;

export type TipClaimAllocation = {
	role: TipClaimRoleKey;
	person: number;
	cents: number;
};

export const TIP_CLAIM_ROLE_LABELS: Record<TipClaimRoleKey, string> = {
	bartender: "Bartender",
	manager: "Manager",
	barback: "Barback",
	door: "Door",
};

export const TIP_CLAIM_ROLE_ORDER: TipClaimRoleKey[] = [
	"bartender",
	"manager",
	"barback",
	"door",
];

export const TIP_CLAIM_REGISTER_ROLE_ORDER: TipClaimRoleKey[] = [
	"bartender",
	"manager",
];

export const DEFAULT_TIP_CLAIM_WEIGHTS: TipClaimWeightState = {
	bartender: 5,
	manager: 5,
	barback: 3,
	door: 1,
};

export function allocateTipClaims(
	totalCents: number,
	staff: TipClaimRoleState,
	weights: TipClaimWeightState,
): TipClaimAllocation[] {
	const people = TIP_CLAIM_ROLE_ORDER.flatMap((role) =>
		Array.from({ length: staff[role] }, (_, index) => ({
			role,
			person: index + 1,
			weight: weights[role],
		})),
	).filter((person) => person.weight > 0);

	const totalWeight = people.reduce((sum, person) => sum + person.weight, 0);

	if (totalCents <= 0 || totalWeight <= 0 || people.length === 0) {
		return [];
	}

	const provisional = people.map((person, index) => {
		const exact = (totalCents * person.weight) / totalWeight;
		const cents = Math.floor(exact);

		return {
			...person,
			index,
			cents,
			remainder: exact - cents,
		};
	});

	const remaining =
		totalCents - provisional.reduce((sum, item) => sum + item.cents, 0);

	const remainderOrder = [...provisional].sort(
		(a, b) => b.remainder - a.remainder || a.index - b.index,
	);

	for (let index = 0; index < remaining; index += 1) {
		remainderOrder[index % remainderOrder.length].cents += 1;
	}

	return provisional.map(({ role, person, cents }) => ({
		role,
		person,
		cents,
	}));
}

export function getTipClaimTotalWeight(
	staff: TipClaimRoleState,
	weights: TipClaimWeightState,
) {
	return TIP_CLAIM_ROLE_ORDER.reduce(
		(sum, role) => sum + staff[role] * Math.max(0, weights[role]),
		0,
	);
}
