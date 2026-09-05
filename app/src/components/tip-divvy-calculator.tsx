import { useMemo, useState, type ReactNode } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card.tsx";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "#/components/ui/field.tsx";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "#/components/ui/input-group.tsx";
import {
  Select,
  SelectContent,
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
  allocateTipClaims,
  DEFAULT_TIP_CLAIM_WEIGHTS,
  getTipClaimTotalWeight,
  TIP_CLAIM_ROLE_LABELS,
  TIP_CLAIM_ROLE_ORDER,
  type TipClaimRoleKey,
  type TipClaimRoleState,
  type TipClaimWeightState,
} from "#/lib/tip-claim-allocation.ts";
import type { TipClaimMember } from "#/components/tip-claim-calculator.tsx";

type StaffAssignment = {
  userId: string;
  role: TipClaimRoleKey;
};

type TipDivvyCalculatorProps = {
  organizationName?: string;
  organizationSelector?: ReactNode;
  members?: TipClaimMember[];
  membersPending?: boolean;
  membersError?: string | null;
};

const ROLE_ENABLED_FIELDS: Record<
  TipClaimRoleKey,
  keyof Pick<
    TipClaimMember,
    "bartenderEnabled" | "managerEnabled" | "barbackEnabled" | "doorEnabled"
  >
> = {
  bartender: "bartenderEnabled",
  manager: "managerEnabled",
  barback: "barbackEnabled",
  door: "doorEnabled",
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function parseMoney(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function isRoleEnabled(member: TipClaimMember, role: TipClaimRoleKey) {
  return member[ROLE_ENABLED_FIELDS[role]];
}

function enabledRoles(member: TipClaimMember) {
  return TIP_CLAIM_ROLE_ORDER.filter((role) => isRoleEnabled(member, role));
}

function clampWeight(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(10, Math.max(0, Math.round(value * 10) / 10));
}

export function TipDivvyCalculator({
  organizationName,
  organizationSelector,
  members = [],
  membersPending = false,
  membersError = null,
}: TipDivvyCalculatorProps) {
  const [totalTips, setTotalTips] = useState("");
  const [assignments, setAssignments] = useState<StaffAssignment[]>([]);
  const [weights, setWeights] = useState<TipClaimWeightState>({
    ...DEFAULT_TIP_CLAIM_WEIGHTS,
  });

  const eligibleMembers = members.filter((member) => enabledRoles(member).length > 0);
  const assignedUserIds = new Set(assignments.map((assignment) => assignment.userId));
  const unassignedMembers = eligibleMembers.filter(
    (member) => !assignedUserIds.has(member.id),
  );

  const staff = useMemo<TipClaimRoleState>(
    () =>
      assignments.reduce<TipClaimRoleState>(
        (counts, assignment) => ({
          ...counts,
          [assignment.role]: counts[assignment.role] + 1,
        }),
        { bartender: 0, manager: 0, barback: 0, door: 0 },
      ),
    [assignments],
  );

  const totalTipsCents = Math.round(parseMoney(totalTips) * 100);
  const allocations = useMemo(
    () => allocateTipClaims(totalTipsCents, staff, weights),
    [staff, totalTipsCents, weights],
  );
  const totalWeight = getTipClaimTotalWeight(staff, weights);

  const employeeAllocations = useMemo(() => {
    const roleIndexes: Record<TipClaimRoleKey, number> = {
      bartender: 0,
      manager: 0,
      barback: 0,
      door: 0,
    };

    return assignments.map((assignment) => {
      roleIndexes[assignment.role] += 1;
      const allocation = allocations.find(
        (candidate) =>
          candidate.role === assignment.role &&
          candidate.person === roleIndexes[assignment.role],
      );
      const member = members.find((candidate) => candidate.id === assignment.userId);

      return {
        ...assignment,
        name: member?.name || member?.email || assignment.userId,
        cents: allocation?.cents ?? 0,
      };
    });
  }, [allocations, assignments, members]);

  function addMember() {
    const member = unassignedMembers[0];
    if (!member) return;

    const role = enabledRoles(member)[0];
    if (!role) return;

    setAssignments((current) => [...current, { userId: member.id, role }]);
  }

  function updateAssignment(index: number, changes: Partial<StaffAssignment>) {
    setAssignments((current) => {
      const assignment = current[index];
      if (!assignment) return current;

      const userId = changes.userId ?? assignment.userId;
      const member = members.find((candidate) => candidate.id === userId);
      if (!member) return current;

      let role = changes.role ?? assignment.role;
      if (!isRoleEnabled(member, role)) {
        const fallbackRole = enabledRoles(member)[0];
        if (!fallbackRole) return current;
        role = fallbackRole;
      }

      return current.map((item, itemIndex) =>
        itemIndex === index ? { userId, role } : item,
      );
    });
  }

  function removeAssignment(index: number) {
    setAssignments((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function updateWeight(role: TipClaimRoleKey, value: string) {
    setWeights((current) => ({
      ...current,
      [role]: clampWeight(Number(value)),
    }));
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Tip Divvy</h1>
          <Badge variant="secondary">Weighted roles</Badge>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
          Split the full tip pool across on-duty staff using the same weighted role logic as the Tip Claim Calculator.
        </p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          {organizationSelector}

          <Card>
            <CardHeader>
              <CardTitle>Total tips</CardTitle>
              <CardDescription>
                Enter the complete tip pool to distribute{organizationName ? ` for ${organizationName}` : ""}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Field>
                <FieldLabel htmlFor="total-tips">Tip pool</FieldLabel>
                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <InputGroupText>$</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    id="total-tips"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={totalTips}
                    onChange={(event) => setTotalTips(event.target.value)}
                  />
                </InputGroup>
                <FieldDescription>The entire amount entered here will be allocated.</FieldDescription>
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>On-duty staff</CardTitle>
              <CardDescription>
                Add each employee sharing the tip pool and choose the role they worked.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {membersError ? <p className="text-sm text-destructive">{membersError}</p> : null}
              {assignments.map((assignment, index) => {
                const member = members.find((candidate) => candidate.id === assignment.userId);
                const availableMembers = eligibleMembers.filter(
                  (candidate) =>
                    candidate.id === assignment.userId || !assignedUserIds.has(candidate.id),
                );

                return (
                  <div key={`${assignment.userId}-${index}`} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
                    <Select
                      value={assignment.userId}
                      onValueChange={(userId) => updateAssignment(index, { userId })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMembers.map((candidate) => (
                          <SelectItem key={candidate.id} value={candidate.id}>
                            {candidate.name || candidate.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={assignment.role}
                      onValueChange={(role) =>
                        updateAssignment(index, { role: role as TipClaimRoleKey })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(member ? enabledRoles(member) : []).map((role) => (
                          <SelectItem key={role} value={role}>
                            {TIP_CLAIM_ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAssignment(index)}
                      aria-label="Remove employee"
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                className="self-start"
                disabled={membersPending || unassignedMembers.length === 0}
                onClick={addMember}
              >
                <PlusIcon data-icon="inline-start" />
                Add employee
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Role weights</CardTitle>
              <CardDescription>Adjust each role from 0 to 10 weight units.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {TIP_CLAIM_ROLE_ORDER.map((role) => (
                <Field key={role}>
                  <FieldLabel htmlFor={`divvy-weight-${role}`}>
                    {TIP_CLAIM_ROLE_LABELS[role]}
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id={`divvy-weight-${role}`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="10"
                      step="0.1"
                      value={weights[role]}
                      onChange={(event) => updateWeight(role, event.target.value)}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>×</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribution</CardTitle>
              <CardDescription>
                {assignments.length} staff · {totalWeight} total weight units
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between gap-4 rounded-lg bg-muted/40 px-4 py-3">
                <span className="text-sm text-muted-foreground">Total tips</span>
                <span className="text-2xl font-semibold tabular-nums">
                  {currency.format(totalTipsCents / 100)}
                </span>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeAllocations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Add staff to calculate the split.
                      </TableCell>
                    </TableRow>
                  ) : (
                    employeeAllocations.map((employee) => (
                      <TableRow key={employee.userId}>
                        <TableCell className="font-medium">{employee.name}</TableCell>
                        <TableCell>{TIP_CLAIM_ROLE_LABELS[employee.role]}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {currency.format(employee.cents / 100)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
