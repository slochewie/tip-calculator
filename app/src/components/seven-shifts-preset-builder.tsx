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

export function SevenShiftsPresetBuilder({
  organizationId,
  onApply,
}: {
  organizationId: string;
  onApply: (staff: TipClaimRoleState) => void;
}) {
  const [date, setDate] = useState(() => localDateValue(new Date()));
  const [shifts, setShifts] = useState<SevenShiftsScheduleShift[]>([]);
  const [selectedGroupKey, setSelectedGroupKey] = useState("");
  const [roles, setRoles] = useState<Record<string, TipClaimRoleKey | "">>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    setPending(true);
    setError(null);
    setSelectedGroupKey("");
    setRoles({});

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
  const assignedRoleCount = rows.filter((row) => roles[row.key]).length;
  const canApply =
    rows.length > 0 && assignedRoleCount === rows.length && !pending;

  function selectShiftGroup(groupKey: string) {
    const group = shiftGroups.find((candidate) => candidate.key === groupKey);
    const nextRows = staffingRows(group?.shifts ?? []);

    setSelectedGroupKey(groupKey);
    setRoles(
      Object.fromEntries(
        nextRows.map((row) => [row.key, defaultTipRole(row)]),
      ),
    );
  }

  function applyStaffing() {
    if (!canApply) return;

    const staff: TipClaimRoleState = {
      manager: 0,
      bartender: 0,
      barback: 0,
      door: 0,
    };

    for (const row of rows) {
      const role = roles[row.key];
      if (role) staff[role] += 1;
    }

    onApply(staff);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDaysIcon />
          7Shifts staffing
        </CardTitle>
        <CardDescription>
          Choose a date, then select a crew grouped by its scheduled end time.
          Matching 7Shifts roles are prefilled for review.
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
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                <UsersIcon data-icon="inline-start" />
                {rows.length} {rows.length === 1 ? "employee" : "employees"}
              </Badge>
              <Badge variant="outline">{endTimeLabel(selectedGroup)}</Badge>
              <span className="text-xs text-muted-foreground">
                {assignedRoleCount} of {rows.length} Tip Calculator roles selected
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
                          value={roles[row.key] || ""}
                          onValueChange={(role) =>
                            setRoles((current) => ({
                              ...current,
                              [row.key]: role as TipClaimRoleKey,
                            }))
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
                              {TIP_ROLES.map((role) => (
                                <SelectItem key={role} value={role}>
                                  {TIP_CLAIM_ROLE_LABELS[role]}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
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
              Use this staffing
            </Button>
            {!canApply ? (
              <p className="text-xs text-muted-foreground">
                Choose a Tip Calculator role for every employee. Manager
                defaults to Bartender; unmatched 7Shifts roles remain blank.
              </p>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
