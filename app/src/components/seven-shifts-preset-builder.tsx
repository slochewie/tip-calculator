import { useEffect, useMemo, useState } from "react";
import { CalendarDaysIcon, UsersIcon } from "lucide-react";

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

export type SevenShiftsClaimsSetup = {
  registerCount: number;
  staff: TipClaimRoleState;
  memberAssignments: Array<{
    userId: string | null;
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

function weekStartFor(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - date.getDay());
  return localDateValue(date);
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

  return Array.from(rows.values());
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
  onApply,
}: {
  organizationId: string;
  onApply: (setup: SevenShiftsClaimsSetup) => void;
}) {
  const [date, setDate] = useState(() => localDateValue(new Date()));
  const [shifts, setShifts] = useState<SevenShiftsScheduleShift[]>([]);
  const [selectedGroupKey, setSelectedGroupKey] = useState("");
  const [roles, setRoles] = useState<Record<string, TipClaimRoleKey | "">>({});
  const [registerCount, setRegisterCount] = useState(1);
  const [registerAssignments, setRegisterAssignments] = useState<
    Record<string, number | null>
  >({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    setPending(true);
    setError(null);
    setSelectedGroupKey("");
    setRoles({});
    setRegisterCount(1);
    setRegisterAssignments({});

    void getSevenShiftsScheduleWeek({
      organizationId,
      weekStart: weekStartFor(date),
      signal: controller.signal,
    })
      .then((week) => {
        setShifts(
          week.shifts.filter(
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
    !pending;

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

  function applyStaffing() {
    if (!canApply) return;

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
      memberAssignments.push({
        userId: row.userId,
        role,
        registerId:
          role === "bartender"
            ? (registerAssignments[row.key] ?? null)
            : null,
      });
    }

    onApply({
      registerCount,
      staff,
      memberAssignments,
    });
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
          its registers before opening Claims.
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
            onChange={(event) => setDate(event.currentTarget.value)}
          />
          <FieldDescription>
            The persisted Sunday–Saturday schedule week containing this date
            will be loaded.
          </FieldDescription>
        </Field>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

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
              <Input
                id="seven-shifts-register-count"
                type="number"
                inputMode="numeric"
                min={1}
                max={50}
                step={1}
                className="w-full sm:max-w-32"
                value={registerCount}
                onChange={(event) =>
                  updateRegisterCount(event.currentTarget.valueAsNumber)
                }
              />
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
              {rows.map((row) => {
                const roleHints = Array.from(
                  new Set(
                    row.shifts.map(
                      (shift) => shift.role?.name || "No 7Shifts role",
                    ),
                  ),
                ).join(", ");
                const role = roles[row.key] || "";
                const assignedRegister = registerAssignments[row.key] ?? null;

                return (
                  <Card key={row.key}>
                    <CardHeader>
                      <CardTitle className="text-base">{row.name}</CardTitle>
                      <CardDescription>
                        {row.shifts.map(timeLabel).join(", ")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary">{roleHints}</Badge>
                        {!row.linked ? (
                          <Badge variant="outline">Unlinked</Badge>
                        ) : null}
                        {row.open ? (
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

            <Button
              type="button"
              className="self-start"
              disabled={!canApply}
              onClick={applyStaffing}
            >
              Open Claims with this staffing
            </Button>
            {!canApply ? (
              <p className="text-xs text-muted-foreground">
                Choose every employee role and assign each register to one
                bartender before opening Claims.
              </p>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
