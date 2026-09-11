import { authBaseURL } from "#/lib/auth-client.ts";

type SevenShiftsLocationPermission = {
  app: "counter" | "unifi" | "schedules";
  organizationId: string;
};

type SevenShiftsAccessResponse = {
  permissions?: SevenShiftsLocationPermission[];
  error?: string;
};

export type SevenShiftsScheduleShift = {
  sevenShiftsShiftId: number;
  sevenShiftsUserId: number | null;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  role: {
    id: number;
    name: string | null;
  } | null;
  station: {
    number: number | null;
    id: number | null;
    name: string | null;
  };
  timezone: string;
  scheduleDate: string;
  start: string;
  end: string | null;
  closesLocation: boolean;
  endsAtBusinessDecline: boolean;
  notes: string | null;
  draft: boolean;
  open: boolean;
  unassigned: boolean;
  publishStatus: string | null;
  attendanceStatus: string | null;
  lateMinutes: number | null;
  deleted: boolean;
};

export type SevenShiftsScheduleWeek = {
  organization: {
    id: string;
    name: string;
    sevenShiftsLocationId: number | null;
    sevenShiftsLocationName: string | null;
    timezone: string | null;
  };
  week: {
    start: string;
    end: string;
  };
  includeDeleted: boolean;
  summary: {
    shifts: number;
    assignedShifts: number;
    openShifts: number;
    deletedShifts: number;
  };
  shifts: SevenShiftsScheduleShift[];
};

function scheduleError(body: unknown) {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "string"
  ) {
    return body.error;
  }

  return "Unable to load the 7Shifts schedule.";
}
export async function getSevenShiftsScheduleAccess(organizationId: string) {
  const response = await fetch(
    new URL("/api/auth/seven-shifts/access", authBaseURL),
    { credentials: "include" },
  );
  const body = (await response.json()) as SevenShiftsAccessResponse;

  if (!response.ok) {
    throw new Error(scheduleError(body));
  }

  return (body.permissions ?? []).some(
    (permission) =>
      permission.app === "schedules" &&
      permission.organizationId === organizationId,
  );
}

export async function getSevenShiftsScheduleWeek({
  organizationId,
  weekStart,
  signal,
}: {
  organizationId: string;
  weekStart: string;
  signal?: AbortSignal;
}) {
  const url = new URL(
    "/api/auth/seven-shifts-schedules/week",
    authBaseURL,
  );
  url.searchParams.set("organizationId", organizationId);
  url.searchParams.set("weekStart", weekStart);
  url.searchParams.set("includeDeleted", "false");

  const response = await fetch(url, {
    credentials: "include",
    signal,
  });
  const body = (await response.json()) as unknown;

  if (!response.ok) {
    throw new Error(scheduleError(body));
  }

  return body as SevenShiftsScheduleWeek;
}
