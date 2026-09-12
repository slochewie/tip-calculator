import { authBaseURL } from "#/lib/auth-client.ts";

type SevenShiftsScheduleOrganization = {
  id: string;
  enabled: boolean;
};

type SevenShiftsScheduleOrganizationsResponse = {
  organizations?: SevenShiftsScheduleOrganization[];
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

export type SevenShiftsScheduleSyncControls = {
  canManage: boolean;
  configured: boolean;
  lastSyncedAt: string | null;
  location: {
    id: number | null;
    name: string | null;
  };
};

export type SevenShiftsScheduleUpdateCheck = {
  organization: {
    id: string;
    name: string;
  };
  location: {
    id: number;
    name: string;
    timezone: string;
  };
  week: {
    start: string;
    end: string;
  };
  updatesAvailable: boolean;
  remoteShiftCount: number;
  localShiftCount: number;
};

export type SevenShiftsOrganizationSyncResult = {
  organization: {
    id: string;
    name: string;
  };
  location: {
    id: number;
    name: string;
    timezone: string;
  };
  week: {
    start: string;
    end: string;
  };
  summary: {
    fetchedShifts: number;
    importedShifts: number;
    inserted: number;
    updated: number;
    linkedShifts: number;
    deletedShifts: number;
  };
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

async function scheduleJson<T>(response: Response) {
  const body = (await response.json()) as unknown;

  if (!response.ok) {
    throw new Error(scheduleError(body));
  }

  return body as T;
}

export async function getSevenShiftsScheduleAccess(organizationId: string) {
  const response = await fetch(
    new URL("/api/auth/seven-shifts-schedules/organizations", authBaseURL),
    { credentials: "include" },
  );
  const body = (await response.json()) as SevenShiftsScheduleOrganizationsResponse;

  if (!response.ok) {
    throw new Error(scheduleError(body));
  }

  return (body.organizations ?? []).some(
    (organization) =>
      organization.id === organizationId && organization.enabled,
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

  return scheduleJson<SevenShiftsScheduleWeek>(response);
}

export async function getSevenShiftsScheduleSyncControls(
  organizationId: string,
) {
  const url = new URL(
    "/api/auth/seven-shifts-schedules/sync-controls",
    authBaseURL,
  );
  url.searchParams.set("organizationId", organizationId);

  const response = await fetch(url, {
    credentials: "include",
  });

  return scheduleJson<SevenShiftsScheduleSyncControls>(response);
}

export async function checkSevenShiftsScheduleUpdates({
  organizationId,
  weekStart,
}: {
  organizationId: string;
  weekStart: string;
}) {
  const response = await fetch(
    new URL("/api/auth/seven-shifts-schedules/check-updates", authBaseURL),
    {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ organizationId, weekStart }),
    },
  );

  return scheduleJson<SevenShiftsScheduleUpdateCheck>(response);
}

export async function syncSevenShiftsOrganizationSchedule({
  organizationId,
  weekStart,
}: {
  organizationId: string;
  weekStart: string;
}) {
  const response = await fetch(
    new URL("/api/auth/seven-shifts-schedules/sync-organization", authBaseURL),
    {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ organizationId, weekStart }),
    },
  );

  return scheduleJson<SevenShiftsOrganizationSyncResult>(response);
}
