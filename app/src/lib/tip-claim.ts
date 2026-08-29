import { authBaseURL } from "#/lib/auth-client.ts";

export type TipClaimSaveRegister = {
  registerKey: string;
  name: string;
  salesCents: number;
};

export type TipClaimSaveStaff = {
  userId: string;
  name: string;
  email: string;
  role: "bartender" | "barback" | "door";
  registerKey: string | null;
  weight: number;
  claimCents: number;
};

export type TipClaimSavePayload = {
  organizationId: string;
  claimPercent: number;
  totalSalesCents: number;
  requiredClaimCents: number;
  totalWeightUnits: number;
  weights: {
    bartender: number;
    barback: number;
    door: number;
  };
  completedAt: Date;
  registers: TipClaimSaveRegister[];
  staff: TipClaimSaveStaff[];
};

type TipClaimSaveResponse = {
  shiftId?: string;
  error?: string;
};

export async function saveTipClaimShift(payload: TipClaimSavePayload) {
  const url = new URL("/api/auth/tip-claim/shifts", authBaseURL);

  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = (await response.json()) as TipClaimSaveResponse;

  if (!response.ok) {
    throw new Error(
      typeof result.error === "string"
        ? result.error
        : "Unable to save end-of-shift sales.",
    );
  }

  if (typeof result.shiftId !== "string" || result.shiftId.length === 0) {
    throw new Error("Tip claim shift was saved without a shift ID.");
  }

  return {
    shiftId: result.shiftId,
  };
}
