import { authBaseURL } from "#/lib/auth-client.ts";
import type { TipClaimRole } from "#/lib/tip-claim.ts";

export type TipPoolSaveStaff = {
  userId: string;
  name: string;
  email: string;
  role: TipClaimRole;
  weightTenths: number;
  shareCents: number;
};

export type TipPoolSavePayload = {
  organizationId: string;
  totalTipsCents: number;
  totalWeightTenths: number;
  weights: {
    managerTenths: number;
    bartenderTenths: number;
    barbackTenths: number;
    doorTenths: number;
  };
  completedAt: Date;
  staff: TipPoolSaveStaff[];
};

export type TipPoolReportStaff = TipPoolSaveStaff & {
  id: string;
  shiftId: string;
  createdAt: string;
};

export type TipPoolShiftReport = {
  id: string;
  organizationId: string;
  savedByUserId: string;
  totalTipsCents: number;
  totalWeightTenths: number;
  managerWeightTenths: number;
  bartenderWeightTenths: number;
  barbackWeightTenths: number;
  doorWeightTenths: number;
  completedAt: string;
  createdAt: string;
  canCorrect: boolean;
  staff: TipPoolReportStaff[];
};

type TipPoolSaveResponse = {
  shiftId?: string;
  error?: string;
};

type TipPoolReportsResponse = {
  shifts?: TipPoolShiftReport[];
  error?: string;
};

type TipPoolDeleteResponse = {
  success?: boolean;
  error?: string;
};

export async function saveTipPoolShift(payload: TipPoolSavePayload) {
  const url = new URL("/api/auth/tip-claim/tip-pool-shifts", authBaseURL);
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = (await response.json()) as TipPoolSaveResponse;
  if (!response.ok) {
    throw new Error(
      typeof result.error === "string" ? result.error : "Unable to save Tip Pool report.",
    );
  }
  if (typeof result.shiftId !== "string" || result.shiftId.length === 0) {
    throw new Error("Tip Pool report was saved without a shift ID.");
  }
  return { shiftId: result.shiftId };
}

export async function correctTipPoolShift(
  shiftId: string,
  payload: TipPoolSavePayload,
) {
  const url = new URL("/api/auth/tip-claim/tip-pool-shifts", authBaseURL);
  const response = await fetch(url, {
    method: "PATCH",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...payload, shiftId }),
  });
  const result = (await response.json()) as TipPoolSaveResponse;
  if (!response.ok) {
    throw new Error(
      typeof result.error === "string" ? result.error : "Unable to save Tip Pool correction.",
    );
  }
  if (result.shiftId !== shiftId) {
    throw new Error("Corrected Tip Pool response did not match the requested report.");
  }
  return { shiftId: result.shiftId };
}

export async function listTipPoolShifts(organizationId: string) {
  const url = new URL("/api/auth/tip-claim/tip-pool-shifts", authBaseURL);
  url.searchParams.set("organizationId", organizationId);
  const response = await fetch(url, { credentials: "include" });
  const result = (await response.json()) as TipPoolReportsResponse;
  if (!response.ok) {
    throw new Error(
      typeof result.error === "string" ? result.error : "Unable to load Tip Pool reports.",
    );
  }
  return Array.isArray(result.shifts) ? result.shifts : [];
}

export async function deleteTipPoolShift(organizationId: string, shiftId: string) {
  const url = new URL("/api/auth/tip-claim/tip-pool-shifts", authBaseURL);
  const response = await fetch(url, {
    method: "DELETE",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ organizationId, shiftId }),
  });
  const result = (await response.json()) as TipPoolDeleteResponse;
  if (!response.ok) {
    throw new Error(
      typeof result.error === "string" ? result.error : "Unable to delete Tip Pool report.",
    );
  }
  if (result.success !== true) {
    throw new Error("Tip Pool report deletion did not complete successfully.");
  }
  return { success: true };
}
