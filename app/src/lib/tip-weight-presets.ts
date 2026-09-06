import { authBaseURL } from "#/lib/auth-client.ts";
import {
  DEFAULT_TIP_CLAIM_WEIGHTS,
  type TipClaimRoleState,
  type TipClaimWeightState,
} from "#/lib/tip-claim-allocation.ts";

export type TipWeightPreset = {
  id: string;
  organizationId: string;
  name: string;
  registerCount: number;
  claimPercent: number;
  staff: TipClaimRoleState;
  weights: TipClaimWeightState;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
};

type WeightPresetResponse = {
  preset?: TipWeightPreset;
  error?: string;
};

type WeightPresetListResponse = {
  presets?: TipWeightPreset[];
  canManage?: boolean;
  error?: string;
};

type WeightPresetDeleteResponse = {
  success?: boolean;
  error?: string;
};

let weightPresetsCanManage = false;

export function canManageTipWeightPresets() {
  return weightPresetsCanManage;
}

export const DEFAULT_TIP_WEIGHT_PRESET_STAFF: TipClaimRoleState = {
  manager: 0,
  bartender: 3,
  barback: 2,
  door: 2,
};

export const DEFAULT_TIP_WEIGHT_PRESET_WEIGHTS: TipClaimWeightState = {
  ...DEFAULT_TIP_CLAIM_WEIGHTS,
};

function endpoint() {
  return new URL("/api/auth/tip-claim/weight-presets", authBaseURL);
}

export async function listTipWeightPresets(organizationId: string) {
  const url = endpoint();
  url.searchParams.set("organizationId", organizationId);

  const response = await fetch(url, {
    credentials: "include",
  });
  const result = (await response.json()) as WeightPresetListResponse;

  if (!response.ok) {
    throw new Error(
      typeof result.error === "string"
        ? result.error
        : "Unable to load weight presets.",
    );
  }

  weightPresetsCanManage = result.canManage === true;
  return Array.isArray(result.presets) ? result.presets : [];
}

export async function saveTipWeightPreset(
  organizationId: string,
  input: {
    id?: string;
    name: string;
    registerCount: number;
    claimPercent?: number;
    staff: TipClaimRoleState;
    weights: TipClaimWeightState;
  },
) {
  if (!weightPresetsCanManage) {
    throw new Error("You do not have permission to manage weight presets.");
  }

  const response = await fetch(endpoint(), {
    method: input.id ? "PATCH" : "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      organizationId,
      ...(input.id ? { presetId: input.id } : {}),
      name: input.name,
      registerCount: input.registerCount,
      claimPercent: input.claimPercent ?? 8,
      staff: input.staff,
      weights: input.weights,
    }),
  });
  const result = (await response.json()) as WeightPresetResponse;

  if (!response.ok) {
    throw new Error(
      typeof result.error === "string"
        ? result.error
        : input.id
          ? "Unable to update weight preset."
          : "Unable to save weight preset.",
    );
  }

  if (!result.preset) {
    throw new Error("Weight preset response did not include the saved preset.");
  }

  return result.preset;
}

export async function deleteTipWeightPreset(
  organizationId: string,
  presetId: string,
) {
  if (!weightPresetsCanManage) {
    throw new Error("You do not have permission to manage weight presets.");
  }

  const response = await fetch(endpoint(), {
    method: "DELETE",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ organizationId, presetId }),
  });
  const result = (await response.json()) as WeightPresetDeleteResponse;

  if (!response.ok) {
    throw new Error(
      typeof result.error === "string"
        ? result.error
        : "Unable to delete weight preset.",
    );
  }

  if (result.success !== true) {
    throw new Error("Weight preset deletion did not complete successfully.");
  }

  return { success: true };
}
