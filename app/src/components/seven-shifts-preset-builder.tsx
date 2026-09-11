import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PencilIcon,
  UsersIcon,
} from "lucide-react";

import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card.tsx";
import { Field, FieldDescription, FieldLabel } from "#/components/ui/field.tsx";
import { Input } from "#/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select.tsx";
import {
  TIP_CLAIM_ROLE_LABELS,
  type TipClaimRoleKey,
  type TipClaimRoleState,
} from "#/lib/tip-claim-allocation.ts";
import {
  getSevenShiftsScheduleWeek,
  type SevenShiftsScheduleShift,
} from "#/lib/seven-shifts-schedules.ts";
import {
  listTipClaimEmployees,
  type TipClaimEmployee,
} from "#/lib/tip-claim.ts";

const TIP_ROLES: TipClaimRoleKey[] = [
  "manager",
  "bartender",
  "barback",
  "door",
];

type StaffingRow = {
  key: string;
  userId: string | null;
  name: string;
  linked: boolean;
  open: boolean;
  shifts: SevenShiftsScheduleShift[];
};

type ShiftGroup = {
  key: string;
  end: string | null;
  shifts: SevenShiftsScheduleShift[];
};

const SCHEDULE_ROLE_ORDER = new Map([
  ["manager", 0],
  ["bartender", 1],
  ["barback", 2],
  ["door", 3],
]);

const TIP_ROLE_ORDER_INDEX: Record<TipClaimRoleKey, number> = {
  manager: 0,
  bartender: 1,
  barback: 2,
  door: 3,
};

function scheduledRoleIndex(row: StaffingRow) {
  let index = Number.MAX_SAFE_INTEGER;

  for (const shift of row.shifts) {
    const roleName = shift.role?.name?.trim().toLowerCase();
    const roleIndex = roleName ? SCHEDULE_ROLE_ORDER.get(roleName) : undefined;

    if (roleIndex !== undefined) index = Math.min(index, roleIndex);
  }

  return index;
}

export type SevenShiftsClaimsSetup = {
  name: string;
  registerCount: number;
  staff: TipClaimRoleState;
  memberAssignments: Array<{
    userId: string | null;
    name: string;
    role: TipClaimRoleKey;
    registerId: number | null;
  }>;
};

function localDateValue(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatScheduleDate(dateValue: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateValue}T12:00:00Z`));
}

function weekStartFor(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - date.getDay());
  return localDateValue(date);
}

function addDateValueDays(dateValue: string, days: number) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function operationalScheduleDate(
  shifts: SevenShiftsScheduleShift[],
  now: Date,
) {
  const timezone = shifts.find((shift) => shift.timezone)?.timezone;
  const parts = timezone
    ? Object.fromEntries(
        new Intl.DateTimeFormat("en-US", {
          timeZone: timezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          hourCycle: "h23",
        })
          .formatToParts(now)
          .filter((part) => part.type !== "literal")
          .map((part) => [part.type, part.value]),
      )
    : {
        year: String(now.getFullYear()),
        month: String(now.getMonth() + 1).padStart(2, "0"),
        day: String(now.getDate()).padStart(2, "0"),
        hour: String(now.getHours()),
      };
  const calendarDate = [parts.year, parts.month, parts.day].join("-");
  const hour = Number(parts.hour);

  return hour < 5 ? addDateValueDays(calendarDate, -1) : calendarDate;
}

function formatTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function timeLabel(shift: SevenShiftsScheduleShift) {
  const start = formatTime(shift.start, shift.timezone);
  const end = shift.end ? formatTime(shift.end, shift.timezone) : "close";

  return `${start}–${end}`;
}

function endTimeLabel(group: ShiftGroup) {
  if (!group.end) return "Ends at close";

  return `Ends ${formatTime(group.end, group.shifts[0].timezone)}`;
}

function groupShiftsByEndTime(shifts: SevenShiftsScheduleShift[]) {
  const groups = new Map<string, ShiftGroup>();

  for (const shift of shifts) {
    const key = shift.end ?? `close:${shift.scheduleDate}`;
    const current = groups.get(key);

    if (current) {
      current.shifts.push(shift);
      continue;
    }

    groups.set(key, {
      key,
      end: shift.end,
      shifts: [shift],
    });
  }

  return Array.from(groups.values()).sort((left, right) => {
    if (left.end === null) return 1;
    if (right.end === null) return -1;
    return new Date(left.end).getTime() - new Date(right.end).getTime();
  });
}

function staffingRows(shifts: SevenShiftsScheduleShift[]) {
  const rows = new Map<string, StaffingRow>();

  for (const shift of shifts) {
    const key = shift.user
      ? `user:${shift.user.id}`
      : shift.sevenShiftsUserId !== null
        ? `seven-shifts:${shift.sevenShiftsUserId}`
        : `open:${shift.sevenShiftsShiftId}`;
    const current = rows.get(key);

    if (current) {
      current.shifts.push(shift);
      continue;
    }

    rows.set(key, {
      key,
      userId: shift.user?.id ?? null,
      name:
        shift.user?.name ||
        (shift.sevenShiftsUserId !== null
          ? `7Shifts employee #${shift.sevenShiftsUserId}`
          : "Open shift"),
      linked: shift.user !== null,
      open: shift.open || shift.unassigned,
      shifts: [shift],
    });
  }

  return Array.from(rows.values()).sort(
    (left, right) =>
      scheduledRoleIndex(left) - scheduledRoleIndex(right) ||
      left.name.localeCompare(right.name),
  );
}

function matchingTipRole(roleName: string | null | undefined) {
  const normalized = roleName?.trim().toLowerCase();

  if (normalized === "manager") return "bartender";
  if (normalized === "bartender") return "bartender";
  if (normalized === "barback") return "barback";
  if (normalized === "door") return "door";

  return "";
}

function defaultTipRole(row: StaffingRow): TipClaimRoleKey | "" {
  const matches = new Set(
    row.shifts
      .map((shift) => matchingTipRole(shift.role?.name))
      .filter((role): role is TipClaimRoleKey => role !== ""),
  );

  return matches.size === 1 ? Array.from(matches)[0] : "";
}

function clampRegisterCount(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(50, Math.max(1, Math.trunc(value)));
}

function normalizeRegisterAssignments(
  rows: StaffingRow[],
  roles: Record<string, TipClaimRoleKey | "">,
  registerCount: number,
  assignments: Record<string, number | null>,
) {
  const bartenderRows = rows.filter((row) => roles[row.key] === "bartender");
  const usedRegisters = new Set<number>();
  const next: Record<string, number | null> = {};

  for (const row of bartenderRows) {
    const registerId = assignments[row.key] ?? null;

    if (
      registerId !== null &&
      registerId <= registerCount &&
      !usedRegisters.has(registerId)
    ) {
      next[row.key] = registerId;
      usedRegisters.add(registerId);
    } else {
      next[row.key] = null;
    }
  }

  if (bartenderRows.length === 1) {
    next[bartenderRows[0].key] = 1;
  }

  return next;
}

export function SevenShiftsPresetBuilder({
  organizationId,
  onApplyClaims,
  onApplyTips,
}: {
  organizationId: string;
  onApplyClaims: (setup: SevenShiftsClaimsSetup) => Promise<void> | void;
  onApplyTips: (setup: SevenShiftsClaimsSetup) => Promise<void> | void;
}) {
  const [date, setDate] = useState(() =>
    operationalScheduleDate([], new Date()),
  );
  const [shifts, setShifts] = useState<SevenShiftsScheduleShift[]>([]);
  const [selectedGroupKey, setSelectedGroupKey] = useState("");
  const [roles, setRoles] = useState<Record<string, TipClaimRoleKey | "">>({});
  const [registerCount, setRegisterCount] = useState(1);
  const [registerAssignments, setRegisterAssignments] = useState<
    Record<string, number | null>
  >({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applyPending, setApplyPending] = useState<"claims" | "tips" | null>(
    null,
  );
  const [employees, setEmployees] = useState<TipClaimEmployee[]>([]);
  const [employeesPending, setEmployeesPending] = useState(false);
  const [employeesError, setEmployeesError] = useState<string | null>(null);
  const [replacementUserIds, setReplacementUserIds] = useState<
    Record<string, string>
  >({});
  const [editingEmployeeKey, setEditingEmployeeKey] = useState<string | null>(
    null,
  );
  const initialScheduleDateResolved = useRef(false);

  useEffect(() => {
    let cancelled = false;

    setEmployees([]);
    setEmployeesPending(true);
    setEmployeesError(null);

    void listTipClaimEmployees(organizationId)
      .then((nextEmployees) => {
        if (!cancelled) setEmployees(nextEmployees);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setEmployeesError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load replacement employees.",
        );
      })
      .finally(() => {
        if (!cancelled) setEmployeesPending(false);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  useEffect(() => {
    const controller = new AbortController();

    setPending(true);
    setError(null);
    setSelectedGroupKey("");
    setRoles({});
    setRegisterCount(1);
    setRegisterAssignments({});
    setReplacementUserIds({});
    setEditingEmployeeKey(null);

    const weekStarts = [weekStartFor(date)];

    if (!initialScheduleDateResolved.current) {
      const previousWeekStart = weekStartFor(addDateValueDays(date, -1));
      if (previousWeekStart !== weekStarts[0]) {
        weekStarts.push(previousWeekStart);
      }
    }

    void Promise.all(
      weekStarts.map((weekStart) =>
        getSevenShiftsScheduleWeek({
          organizationId,
          weekStart,
          signal: controller.signal,
        }),
      ),
    )
      .then((weeks) => {
        if (controller.signal.aborted) return;

        const availableShifts = weeks.flatMap((week) => week.shifts);

        if (!initialScheduleDateResolved.current) {
          initialScheduleDateResolved.current = true;

          const currentScheduleDate = operationalScheduleDate(
            availableShifts,
            new Date(),
          );

          if (currentScheduleDate !== date) {
            setShifts([]);
            setDate(currentScheduleDate);
            return;
          }
        }

        setShifts(
          availableShifts.filter(
            (shift) => shift.scheduleDate === date && !shift.deleted,
          ),
        );
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        setShifts([]);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load the 7Shifts schedule.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setPending(false);
      });

    return () => controller.abort();
  }, [date, organizationId]);

  const shiftGroups = useMemo(() => groupShiftsByEndTime(shifts), [shifts]);
  const selectedGroup = useMemo(
    () => shiftGroups.find((group) => group.key === selectedGroupKey) ?? null,
    [selectedGroupKey, shiftGroups],
  );
  const rows = useMemo(
    () => staffingRows(selectedGroup?.shifts ?? []),
    [selectedGroup],
  );
  const employeeById = useMemo(
    () => new Map(employees.map((employee) => [employee.userId, employee])),
    [employees],
  );
  const scheduledUserIds = useMemo(
    () =>
      new Set(
        shifts.flatMap((shift) =>
          shift.user?.id ? [shift.user.id] : [],
        ),
      ),
    [shifts],
  );
  const selectedReplacementIds = new Set(Object.values(replacementUserIds));
  const displayedRows = useMemo(
    () =>
      [...rows].sort((left, right) => {
        const leftIsScheduledManager = scheduledRoleIndex(left) === 0;
        const rightIsScheduledManager = scheduledRoleIndex(right) === 0;

        if (leftIsScheduledManager !== rightIsScheduledManager) {
          return leftIsScheduledManager ? -1 : 1;
        }

        const leftRole = roles[left.key];
        const rightRole = roles[right.key];
        const roleDifference =
          (leftRole ? TIP_ROLE_ORDER_INDEX[leftRole] : Number.MAX_SAFE_INTEGER) -
          (rightRole
            ? TIP_ROLE_ORDER_INDEX[rightRole]
            : Number.MAX_SAFE_INTEGER);

        if (roleDifference !== 0) return roleDifference;

        const leftName =
          employeeById.get(replacementUserIds[left.key] ?? "")?.name ??
          left.name;
        const rightName =
          employeeById.get(replacementUserIds[right.key] ?? "")?.name ??
          right.name;

        return leftName.localeCompare(rightName);
      }),
    [employeeById, replacementUserIds, roles, rows],
  );
  const bartenderRows = rows.filter((row) => roles[row.key] === "bartender");
  const assignedRoleCount = rows.filter((row) => roles[row.key]).length;
  const assignedRegisterIds = new Set(
    Object.values(registerAssignments).filter(
      (registerId): registerId is number => registerId !== null,
    ),
  );
  const allRegistersAssigned =
    bartenderRows.length > 0 && assignedRegisterIds.size === registerCount;
  const canApply =
    rows.length > 0 &&
    assignedRoleCount === rows.length &&
    allRegistersAssigned &&
    !pending &&
    applyPending === null;

  function selectShiftGroup(groupKey: string) {
    const group = shiftGroups.find((candidate) => candidate.key === groupKey);
    const nextRows = staffingRows(group?.shifts ?? []);
    const nextRoles = Object.fromEntries(
      nextRows.map((row) => [row.key, defaultTipRole(row)]),
    );

    setSelectedGroupKey(groupKey);
    setRoles(nextRoles);
    setRegisterCount(1);
    setRegisterAssignments(
      normalizeRegisterAssignments(nextRows, nextRoles, 1, {}),
    );
    setReplacementUserIds({});
    setEditingEmployeeKey(null);
    setApplyError(null);
  }

  function replaceEmployee(rowKey: string, userId: string) {
    setReplacementUserIds((current) => {
      if (userId === "scheduled") {
        const remaining = { ...current };
        delete remaining[rowKey];
        return remaining;
      }

      return { ...current, [rowKey]: userId };
    });
    setEditingEmployeeKey(null);
  }

  function updateRole(rowKey: string, role: TipClaimRoleKey) {
    const nextRoles = {
      ...roles,
      [rowKey]: role,
    };

    setRoles(nextRoles);
    setRegisterAssignments((current) =>
      normalizeRegisterAssignments(
        rows,
        nextRoles,
        registerCount,
        current,
      ),
    );
  }

  function updateRegisterCount(value: number) {
    const nextCount = clampRegisterCount(value);

    setRegisterCount(nextCount);
    setRegisterAssignments((current) =>
      normalizeRegisterAssignments(rows, roles, nextCount, current),
    );
  }

  function assignRegister(rowKey: string, registerId: number | null) {
    setRegisterAssignments((current) => {
      const next = Object.fromEntries(
        Object.entries(current).map(([key, currentRegisterId]) => [
          key,
          key !== rowKey && currentRegisterId === registerId
            ? null
            : currentRegisterId,
        ]),
      );

      next[rowKey] = registerId;
      return next;
    });
  }

  async function applyStaffing(destination: "claims" | "tips") {
    if (!canApply) return;

    setApplyPending(destination);
    setApplyError(null);

    const staff: TipClaimRoleState = {
      manager: 0,
      bartender: 0,
      barback: 0,
      door: 0,
    };
    const memberAssignments: SevenShiftsClaimsSetup["memberAssignments"] = [];

    for (const row of rows) {
      const role = roles[row.key];
      if (!role) continue;

      staff[role] += 1;
      const replacementEmployee = employeeById.get(
        replacementUserIds[row.key] ?? "",
      );

      memberAssignments.push({
        userId: replacementUserIds[row.key] ?? row.userId,
        name: replacementEmployee?.name ?? row.name,
        role,
        registerId:
          role === "bartender"
            ? (registerAssignments[row.key] ?? null)
            : null,
      });
    }

    const setup = {
      name: selectedGroup
        ? `7Shifts · ${formatScheduleDate(date)} · ${endTimeLabel(selectedGroup)}`
        : `7Shifts · ${formatScheduleDate(date)}`,
      registerCount,
      staff,
      memberAssignments,
    };

    try {
      if (destination === "claims") {
        await onApplyClaims(setup);
      } else {
        await onApplyTips(setup);
      }
    } catch (applyFailure) {
      setApplyError(
        applyFailure instanceof Error
          ? applyFailure.message
          : "Unable to save temporary staffing.",
      );
      setApplyPending(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDaysIcon />
          7Shifts staffing
        </CardTitle>
        <CardDescription>
          Choose a date, select a crew grouped by its end time, and configure
          its registers before opening Claims or Tips.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <Field>
          <FieldLabel htmlFor="seven-shifts-preset-date">
            Schedule date
          </FieldLabel>
          <Input
            id="seven-shifts-preset-date"
            type="date"
            className="w-full sm:max-w-56"
            value={date}
            onChange={(event) => {
              initialScheduleDateResolved.current = true;
              setDate(event.currentTarget.value);
            }}
          />
          <FieldDescription>
            Before 5:00 AM, defaults to the previous schedule date in the
            location timezone. The Sunday–Saturday week containing this date
            will be loaded.
          </FieldDescription>
        </Field>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {employeesError ? (
          <p className="text-sm text-destructive">
            Replacement employees unavailable: {employeesError}
          </p>
        ) : null}

        {pending ? (
          <p className="text-sm text-muted-foreground">Loading schedule…</p>
        ) : shiftGroups.length === 0 && !error ? (
          <p className="text-sm text-muted-foreground">
            No scheduled shifts were found for this date.
          </p>
        ) : shiftGroups.length > 0 ? (
          <Field>
            <FieldLabel htmlFor="seven-shifts-preset-shift">
              Scheduled shift
            </FieldLabel>
            <Select
              value={selectedGroupKey}
              onValueChange={selectShiftGroup}
            >
              <SelectTrigger
                id="seven-shifts-preset-shift"
                className="w-full"
              >
                <SelectValue placeholder="Select shift by end time" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {shiftGroups.map((group) => {
                    const groupRows = staffingRows(group.shifts);

                    return (
                      <SelectItem key={group.key} value={group.key}>
                        {endTimeLabel(group)} · {groupRows.length}{" "}
                        {groupRows.length === 1 ? "employee" : "employees"}
                      </SelectItem>
                    );
                  })}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription>
              Employees with the same scheduled end time are treated as one
              shift.
            </FieldDescription>
          </Field>
        ) : null}

        {selectedGroup ? (
          <>
            <Field>
              <FieldLabel htmlFor="seven-shifts-register-count">
                Number of registers
              </FieldLabel>
              <div className="flex w-full items-stretch gap-2 sm:max-w-56">
                <Input
                  id="seven-shifts-register-count"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={50}
                  step={1}
                  className="min-w-0 flex-1"
                  value={registerCount}
                  onChange={(event) =>
                    updateRegisterCount(event.currentTarget.valueAsNumber)
                  }
                />
                <div className="flex shrink-0 overflow-hidden rounded-md border">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-10 rounded-none border-r"
                    aria-label="Decrease register count"
                    disabled={registerCount <= 1}
                    onClick={() => updateRegisterCount(registerCount - 1)}
                  >
                    <ChevronDownIcon className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-10 rounded-none"
                    aria-label="Increase register count"
                    disabled={registerCount >= 50}
                    onClick={() => updateRegisterCount(registerCount + 1)}
                  >
                    <ChevronUpIcon className="size-4" />
                  </Button>
                </div>
              </div>
              <FieldDescription>
                Assign each register to one bartender. Additional bartenders
                may work without a register.
              </FieldDescription>
            </Field>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                <UsersIcon data-icon="inline-start" />
                {rows.length} {rows.length === 1 ? "employee" : "employees"}
              </Badge>
              <Badge variant="outline">{endTimeLabel(selectedGroup)}</Badge>
              <span className="text-xs text-muted-foreground">
                {assignedRoleCount} of {rows.length} roles ·{" "}
                {assignedRegisterIds.size} of {registerCount} registers assigned
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {displayedRows.map((row) => {
                const roleHints = Array.from(
                  new Set(
                    row.shifts.map(
                      (shift) => shift.role?.name || "No 7Shifts role",
                    ),
                  ),
                ).join(", ");
                const role = roles[row.key] || "";
                const assignedRegister = registerAssignments[row.key] ?? null;
                const replacementUserId = replacementUserIds[row.key];
                const replacementEmployee = replacementUserId
                  ? employeeById.get(replacementUserId)
                  : undefined;
                const displayedName = replacementEmployee?.name ?? row.name;
                const replacementOptions = employees.filter(
                  (employee) =>
                    !scheduledUserIds.has(employee.userId) &&
                    (employee.userId === replacementUserId ||
                      !selectedReplacementIds.has(employee.userId)),
                );
                const canEditEmployee =
                  !employeesPending &&
                  !employeesError &&
                  (replacementOptions.length > 0 ||
                    replacementEmployee !== undefined);

                return (
                  <Card key={row.key}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        {editingEmployeeKey === row.key ? (
                          <Select
                            value={replacementUserId ?? "scheduled"}
                            onValueChange={(userId) =>
                              replaceEmployee(row.key, userId)
                            }
                          >
                            <SelectTrigger
                              className="min-w-0 flex-1"
                              aria-label={`Replacement for ${row.name}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectItem value="scheduled">
                                  Keep {row.name}
                                </SelectItem>
                                {replacementOptions.map((employee) => (
                                  <SelectItem
                                    key={employee.userId}
                                    value={employee.userId}
                                  >
                                    {employee.name}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="min-w-0 flex-1">{displayedName}</span>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-9 shrink-0"
                          aria-label={`Replace ${displayedName}`}
                          disabled={!canEditEmployee}
                          onClick={() =>
                            setEditingEmployeeKey((current) =>
                              current === row.key ? null : row.key,
                            )
                          }
                        >
                          <PencilIcon className="size-4" />
                        </Button>
                      </CardTitle>
                      <CardDescription className="flex flex-col gap-1">
                        <span>{row.shifts.map(timeLabel).join(", ")}</span>
                        {replacementEmployee ? (
                          <span>Covering for {row.name}</span>
                        ) : null}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary">{roleHints}</Badge>
                        {replacementEmployee ? (
                          <Badge variant="outline">Replacement</Badge>
                        ) : !row.linked ? (
                          <Badge variant="outline">Unlinked</Badge>
                        ) : null}
                        {!replacementEmployee && row.open ? (
                          <Badge variant="outline">Open</Badge>
                        ) : null}
                      </div>

                      <Field>
                        <FieldLabel htmlFor={`tip-role-${row.key}`}>
                          Tip Calculator role
                        </FieldLabel>
                        <Select
                          value={role}
                          onValueChange={(nextRole) =>
                            updateRole(row.key, nextRole as TipClaimRoleKey)
                          }
                        >
                          <SelectTrigger
                            id={`tip-role-${row.key}`}
                            className="w-full"
                          >
                            <SelectValue placeholder="Choose role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {TIP_ROLES.map((tipRole) => (
                                <SelectItem key={tipRole} value={tipRole}>
                                  {TIP_CLAIM_ROLE_LABELS[tipRole]}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>

                      {role === "bartender" ? (
                        <Field>
                          <FieldLabel htmlFor={`tip-register-${row.key}`}>
                            Register
                          </FieldLabel>
                          <Select
                            value={
                              assignedRegister === null
                                ? "none"
                                : String(assignedRegister)
                            }
                            disabled={bartenderRows.length === 1}
                            onValueChange={(value) =>
                              assignRegister(
                                row.key,
                                value === "none" ? null : Number(value),
                              )
                            }
                          >
                            <SelectTrigger
                              id={`tip-register-${row.key}`}
                              className="w-full"
                            >
                              <SelectValue placeholder="Choose register" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectItem value="none">No register</SelectItem>
                                {Array.from(
                                  { length: registerCount },
                                  (_, index) => index + 1,
                                ).map((registerId) => (
                                  <SelectItem
                                    key={registerId}
                                    value={String(registerId)}
                                  >
                                    Register {registerId}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                          {bartenderRows.length === 1 ? (
                            <FieldDescription>
                              The only bartender is assigned to Register 1
                              automatically.
                            </FieldDescription>
                          ) : null}
                        </Field>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                disabled={!canApply}
                onClick={() => void applyStaffing("claims")}
              >
                {applyPending === "claims"
                  ? "Saving staffing…"
                  : "Open Claims with this staffing"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!canApply}
                onClick={() => void applyStaffing("tips")}
              >
                {applyPending === "tips"
                  ? "Saving staffing…"
                  : "Open Tips with this staffing"}
              </Button>
            </div>
            {applyError ? (
              <p className="text-sm text-destructive">{applyError}</p>
            ) : null}
            {!canApply && applyPending === null ? (
              <p className="text-xs text-muted-foreground">
                Choose every employee role and assign each register to one
                bartender before continuing.
              </p>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
