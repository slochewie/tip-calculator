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
  role: "bartender" | "manager" | "barback" | "door";
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
    manager: number;
    barback: number;
    door: number;
  };
  completedAt: Date;
  registers: TipClaimSaveRegister[];
  staff: TipClaimSaveStaff[];
};

export type TipClaimReportRegister = TipClaimSaveRegister & {
  id: string;
  shiftId: string;
  createdAt: string;
};

export type TipClaimReportStaff = TipClaimSaveStaff & {
  id: string;
  shiftId: string;
  createdAt: string;
};

export type TipClaimShiftReport = {
  id: string;
  organizationId: string;
  savedByUserId: string;
  claimPercent: number;
  totalSalesCents: number;
  requiredClaimCents: number;
  totalWeightUnits: number;
  bartenderWeight: number;
  managerWeight: number;
  barbackWeight: number;
  doorWeight: number;
  completedAt: string;
  createdAt: string;
  registers: TipClaimReportRegister[];
  staff: TipClaimReportStaff[];
};

type TipClaimSaveResponse = {
  shiftId?: string;
  error?: string;
};

type TipClaimReportsResponse = {
  shifts?: TipClaimShiftReport[];
  error?: string;
};

type TipClaimDeleteResponse = {
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

export async function listTipClaimShifts(organizationId: string) {
  const url = new URL("/api/auth/tip-claim/shifts", authBaseURL);
  url.searchParams.set("organizationId", organizationId);

  const response = await fetch(url, {
    credentials: "include",
  });

  const result = (await response.json()) as TipClaimReportsResponse;

  if (!response.ok) {
    throw new Error(
      typeof result.error === "string"
        ? result.error
        : "Unable to load tip claim reports.",
    );
  }

  return Array.isArray(result.shifts) ? result.shifts : [];
}

export async function deleteTipClaimShift(
  organizationId: string,
  shiftId: string,
) {
  const url = new URL("/api/auth/tip-claim/shifts", authBaseURL);

  const response = await fetch(url, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      organizationId,
      shiftId,
    }),
  });

  const result = (await response.json()) as TipClaimDeleteResponse;

  if (!response.ok) {
    throw new Error(
      typeof result.error === "string"
        ? result.error
        : "Unable to delete shift.",
    );
  }

  if (result.shiftId !== shiftId) {
    throw new Error("Deleted shift response did not match the requested shift.");
  }

  return {
    shiftId: result.shiftId,
  };
}
