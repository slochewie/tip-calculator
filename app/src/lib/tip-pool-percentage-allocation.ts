import {
  TIP_CLAIM_ROLE_ORDER,
  type TipClaimRoleKey,
  type TipClaimRoleState,
  type TipClaimWeightState,
} from "#/lib/tip-claim-allocation.ts";

export type TipPoolPercentageTargets = Record<TipClaimRoleKey, number>;

export const DEFAULT_TIP_POOL_PERCENTAGES: TipPoolPercentageTargets = {
  bartender: 50,
  manager: 0,
  barback: 30,
  door: 20,
};

const MAX_WEIGHT_TENTHS = 100;
const SEARCH_RADIUS = 2;
const EPSILON = 1e-9;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizedTarget(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function candidateTenths(center: number, allowZero: boolean) {
  const minimum = allowZero ? 0 : 1;
  const values = new Set<number>();

  for (let offset = -SEARCH_RADIUS; offset <= SEARCH_RADIUS; offset += 1) {
    values.add(clamp(Math.round(center) + offset, minimum, MAX_WEIGHT_TENTHS));
  }

  return [...values];
}

export function getTipPoolActualPercentages(
  staff: TipClaimRoleState,
  weights: TipClaimWeightState,
): TipPoolPercentageTargets {
  const weightedRoleTotals = TIP_CLAIM_ROLE_ORDER.reduce(
    (totals, role) => ({
      ...totals,
      [role]: Math.max(0, staff[role]) * Math.max(0, weights[role]),
    }),
    { bartender: 0, manager: 0, barback: 0, door: 0 } as TipPoolPercentageTargets,
  );

  const totalWeight = TIP_CLAIM_ROLE_ORDER.reduce(
    (sum, role) => sum + weightedRoleTotals[role],
    0,
  );

  if (totalWeight <= 0) {
    return { bartender: 0, manager: 0, barback: 0, door: 0 };
  }

  return TIP_CLAIM_ROLE_ORDER.reduce(
    (percentages, role) => ({
      ...percentages,
      [role]: (weightedRoleTotals[role] / totalWeight) * 100,
    }),
    { bartender: 0, manager: 0, barback: 0, door: 0 } as TipPoolPercentageTargets,
  );
}

function scoreWeights(
  staff: TipClaimRoleState,
  targets: TipPoolPercentageTargets,
  weights: TipClaimWeightState,
) {
  const actual = getTipPoolActualPercentages(staff, weights);
  const squaredError = TIP_CLAIM_ROLE_ORDER.reduce((sum, role) => {
    const difference = actual[role] - normalizedTarget(targets[role]);
    return sum + difference * difference;
  }, 0);
  const absoluteError = TIP_CLAIM_ROLE_ORDER.reduce(
    (sum, role) => sum + Math.abs(actual[role] - normalizedTarget(targets[role])),
    0,
  );
  const totalWeightTenths = TIP_CLAIM_ROLE_ORDER.reduce(
    (sum, role) => sum + Math.round(weights[role] * 10),
    0,
  );

  return { squaredError, absoluteError, totalWeightTenths };
}

function isBetterScore(
  candidate: ReturnType<typeof scoreWeights>,
  current: ReturnType<typeof scoreWeights> | null,
) {
  if (!current) return true;
  if (candidate.squaredError < current.squaredError - EPSILON) return true;
  if (candidate.squaredError > current.squaredError + EPSILON) return false;
  if (candidate.absoluteError < current.absoluteError - EPSILON) return true;
  if (candidate.absoluteError > current.absoluteError + EPSILON) return false;
  return candidate.totalWeightTenths < current.totalWeightTenths;
}

export function optimizeTipPoolWeightsForPercentages(
  staff: TipClaimRoleState,
  targets: TipPoolPercentageTargets,
): TipClaimWeightState {
  const positiveRoles = TIP_CLAIM_ROLE_ORDER.filter(
    (role) => staff[role] > 0 && normalizedTarget(targets[role]) > 0,
  );

  if (positiveRoles.length === 0) {
    return { bartender: 0, manager: 0, barback: 0, door: 0 };
  }

  const baseRole = [...positiveRoles].sort((a, b) => {
    const aPerPerson = normalizedTarget(targets[a]) / staff[a];
    const bPerPerson = normalizedTarget(targets[b]) / staff[b];
    return bPerPerson - aPerPerson;
  })[0];
  const baseRatio = normalizedTarget(targets[baseRole]) / staff[baseRole];

  let bestWeights: TipClaimWeightState | null = null;
  let bestScore: ReturnType<typeof scoreWeights> | null = null;

  for (let baseTenths = 1; baseTenths <= MAX_WEIGHT_TENTHS; baseTenths += 1) {
    const candidatesByRole = TIP_CLAIM_ROLE_ORDER.map((role) => {
      if (staff[role] <= 0 || normalizedTarget(targets[role]) <= 0) {
        return [0];
      }
      if (role === baseRole) return [baseTenths];

      const roleRatio = normalizedTarget(targets[role]) / staff[role];
      const idealTenths = baseTenths * (roleRatio / baseRatio);
      return candidateTenths(idealTenths, false);
    });

    for (const bartender of candidatesByRole[0]) {
      for (const manager of candidatesByRole[1]) {
        for (const barback of candidatesByRole[2]) {
          for (const door of candidatesByRole[3]) {
            const candidateWeights: TipClaimWeightState = {
              bartender: bartender / 10,
              manager: manager / 10,
              barback: barback / 10,
              door: door / 10,
            };
            const candidateScore = scoreWeights(staff, targets, candidateWeights);

            if (isBetterScore(candidateScore, bestScore)) {
              bestWeights = candidateWeights;
              bestScore = candidateScore;
            }
          }
        }
      }
    }
  }

  return bestWeights ?? { bartender: 0, manager: 0, barback: 0, door: 0 };
}
