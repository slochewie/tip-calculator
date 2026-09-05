import {
  DEFAULT_TIP_CLAIM_WEIGHTS,
  type TipClaimRoleState,
  type TipClaimWeightState,
} from "#/lib/tip-claim-allocation.ts";

export type TipWeightPreset = {
  id: string;
  organizationId: string;
  name: string;
  staff: TipClaimRoleState;
  weights: TipClaimWeightState;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_PREFIX = "niteowl:tip-weight-presets:";

export const DEFAULT_TIP_WEIGHT_PRESET_STAFF: TipClaimRoleState = {
  manager: 0,
  bartender: 3,
  barback: 2,
  door: 2,
};

export const DEFAULT_TIP_WEIGHT_PRESET_WEIGHTS: TipClaimWeightState = {
  ...DEFAULT_TIP_CLAIM_WEIGHTS,
};

function storageKey(organizationId: string) {
  return `${STORAGE_PREFIX}${organizationId}`;
}

function parsePresets(value: string | null): TipWeightPreset[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as TipWeightPreset[]) : [];
  } catch {
    return [];
  }
}

export function listTipWeightPresets(organizationId: string) {
  if (typeof window === "undefined") return [];
  return parsePresets(window.localStorage.getItem(storageKey(organizationId)));
}

export function saveTipWeightPreset(
  organizationId: string,
  input: {
    id?: string;
    name: string;
    staff: TipClaimRoleState;
    weights: TipClaimWeightState;
  },
) {
  if (typeof window === "undefined") {
    throw new Error("Weight presets can only be saved in the browser.");
  }

  const now = new Date().toISOString();
  const current = listTipWeightPresets(organizationId);
  const existing = input.id
    ? current.find((preset) => preset.id === input.id)
    : undefined;
  const preset: TipWeightPreset = {
    id: existing?.id ?? crypto.randomUUID(),
    organizationId,
    name: input.name.trim(),
    staff: { ...input.staff },
    weights: { ...input.weights },
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const next = existing
    ? current.map((candidate) =>
        candidate.id === preset.id ? preset : candidate,
      )
    : [...current, preset];

  window.localStorage.setItem(storageKey(organizationId), JSON.stringify(next));
  return preset;
}

export function deleteTipWeightPreset(
  organizationId: string,
  presetId: string,
) {
  if (typeof window === "undefined") return;

  const next = listTipWeightPresets(organizationId).filter(
    (preset) => preset.id !== presetId,
  );
  window.localStorage.setItem(storageKey(organizationId), JSON.stringify(next));
}
