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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table.tsx";
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

function timeLabel(shift: SevenShiftsScheduleShift) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: shift.timezone,
    hour: "numeric",
    minute: "2-digit",
  });
  const start = formatter.format(new Date(shift.start));
  const end = shift.end ? formatter.format(new Date(shift.end)) : "close";

  return `${start}–${end}`;
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

export function SevenShiftsPresetBuilder({
  organizationId,
  onApply,
}: {
  organizationId: string;
  onApply: (staff: TipClaimRoleState) => void;
}) {
  const [date, setDate] = useState(() => localDateValue(new Date()));
  const [shifts, setShifts] = useState<SevenShiftsScheduleShift[]>([]);
  const [roles, setRoles] = useState<Record<string, TipClaimRoleKey | "">>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    setPending(true);
    setError(null);

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
        setRoles({});
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        setShifts([]);
        setRoles({});
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

  const rows = useMemo(() => staffingRows(shifts), [shifts]);
  const assignedRoleCount = rows.filter((row) => roles[row.key]).length;
  const canApply =
    rows.length > 0 && assignedRoleCount === rows.length && !pending;

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
          Choose a date, review everyone scheduled, and assign each staffing
          slot a Tip Calculator role before creating the preset.
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
        ) : rows.length === 0 && !error ? (
          <p className="text-sm text-muted-foreground">
            No scheduled shifts were found for this date.
          </p>
        ) : rows.length > 0 ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                <UsersIcon data-icon="inline-start" />
                {rows.length} staffing {rows.length === 1 ? "slot" : "slots"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {assignedRoleCount} of {rows.length} Tip Calculator roles selected
              </span>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Scheduled shift</TableHead>
                    <TableHead>7Shifts role</TableHead>
                    <TableHead>Tip Calculator role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const roleHints = Array.from(
                      new Set(
                        row.shifts.map(
                          (shift) => shift.role?.name || "No role",
                        ),
                      ),
                    ).join(", ");

                    return (
                      <TableRow key={row.key}>
                        <TableCell>
                          <div className="flex min-w-44 flex-col gap-1">
                            <span className="font-medium">{row.name}</span>
                            <div className="flex flex-wrap gap-1">
                              {!row.linked ? (
                                <Badge variant="outline">Unlinked</Badge>
                              ) : null}
                              {row.open ? (
                                <Badge variant="outline">Open</Badge>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {row.shifts.map(timeLabel).join(", ")}
                        </TableCell>
                        <TableCell>{roleHints}</TableCell>
                        <TableCell>
                          <Select
                            value={roles[row.key] || ""}
                            onValueChange={(role) =>
                              setRoles((current) => ({
                                ...current,
                                [row.key]: role as TipClaimRoleKey,
                              }))
                            }
                          >
                            <SelectTrigger className="w-44">
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
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
                Choose a Tip Calculator role for every staffing slot. The
                7Shifts role is shown only as a hint.
              </p>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
