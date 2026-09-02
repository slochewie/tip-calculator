import { authBaseURL } from "#/lib/auth-client.ts";

export type TipClaimRole = "bartender" | "manager" | "barback" | "door";

export type TipClaimSaveRegister = {
  registerKey: string;
  name: string;
  salesCents: number;
};

export type TipClaimSaveStaff = {
  userId: string;
  name: string;
  email: string;
  role: TipClaimRole;
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

export type TipClaimEmployeeAssignment = {
  memberId: string;
  userId: string;
  name: string;
  email: string;
  accessEnabled: boolean;
  bartenderEnabled: boolean;
  managerEnabled: boolean;
  barbackEnabled: boolean;
  doorEnabled: boolean;
};

export type TipClaimEmployee = {
  userId: string;
  name: string;
  email: string;
  bartenderEnabled: boolean;
  managerEnabled: boolean;
  barbackEnabled: boolean;
  doorEnabled: boolean;
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

type TipClaimAssignmentsResponse = {
  assignments?: TipClaimEmployeeAssignment[];
  error?: string;
};

type TipClaimEmployeesResponse = {
  employees?: TipClaimEmployee[];
  error?: string;
};

type TipClaimAssignmentUpdateResponse = {
  assignment?: TipClaimEmployeeAssignment;
  error?: string;
};

type TipClaimAccessResponse = {
  allowed?: boolean;
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

export async function listTipClaimAssignments(organizationId: string) {
  const url = new URL("/api/auth/tip-claim/assignments", authBaseURL);
  url.searchParams.set("organizationId", organizationId);

  const response = await fetch(url, {
    credentials: "include",
  });

  const result = (await response.json()) as TipClaimAssignmentsResponse;

  if (!response.ok) {
    throw new Error(
      typeof result.error === "string"
        ? result.error
        : "Unable to load employee assignments.",
    );
  }

  return Array.isArray(result.assignments) ? result.assignments : [];
}

export async function listTipClaimEmployees(organizationId: string) {
  const url = new URL("/api/auth/tip-claim/employees", authBaseURL);
  url.searchParams.set("organizationId", organizationId);

  const response = await fetch(url, {
    credentials: "include",
  });

  const result = (await response.json()) as TipClaimEmployeesResponse;

  if (!response.ok) {
    throw new Error(
      typeof result.error === "string"
        ? result.error
        : "Unable to load employees.",
    );
  }

  return Array.isArray(result.employees) ? result.employees : [];
}

export async function getTipClaimAccess(organizationId: string) {
  const url = new URL("/api/auth/tip-claim/access", authBaseURL);
  url.searchParams.set("organizationId", organizationId);

  const response = await fetch(url, {
    credentials: "include",
  });

  const result = (await response.json()) as TipClaimAccessResponse;

  if (!response.ok) {
    throw new Error(
      typeof result.error === "string"
        ? result.error
        : "Unable to check Tip Calculator access.",
    );
  }

  return result.allowed === true;
}

export async function updateTipClaimAccess(
  organizationId: string,
  userId: string,
  enabled: boolean,
) {
  const url = new URL("/api/auth/tip-claim/access", authBaseURL);

  const response = await fetch(url, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ organizationId, userId, enabled }),
  });

  const result = (await response.json()) as TipClaimAssignmentUpdateResponse;

  if (!response.ok) {
    throw new Error(
      typeof result.error === "string"
        ? result.error
        : "Unable to update Tip Calculator access.",
    );
  }

  if (!result.assignment) {
    throw new Error("Access update completed without an assignment.");
  }

  return result.assignment;
}

export async function updateTipClaimAssignment(
  organizationId: string,
  userId: string,
  role: TipClaimRole,
  enabled: boolean,
) {
  const url = new URL("/api/auth/tip-claim/assignments", authBaseURL);

  const response = await fetch(url, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      organizationId,
      userId,
      role,
      enabled,
    }),
  });

  const result = (await response.json()) as TipClaimAssignmentUpdateResponse;

  if (!response.ok) {
    throw new Error(
      typeof result.error === "string"
        ? result.error
        : "Unable to update employee assignment.",
    );
  }

  if (!result.assignment) {
    throw new Error("Assignment update completed without an assignment.");
  }

  return result.assignment;
}
