import { useMemo, useState, type ReactNode } from "react";
import { PlusIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "#/components/ui/accordion.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "#/components/ui/alert-dialog.tsx";
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
  FieldGroup,
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
import type { TipClaimMember } from "#/components/tip-claim-calculator.tsx";
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
import {
  type TipPoolStaffAssignment,
  useTipPoolDraft,
} from "#/lib/use-tip-pool-draft.ts";

type TipDivvyCalculatorProps = {
  organizationId?: string;
  organizationName?: string;
  organizationSelector?: ReactNode;
  members?: TipClaimMember[];
  membersPending?: boolean;
  membersError?: string | null;
};

const ROLE_ENABLED_FIELDS: Record<TipClaimRoleKey, keyof Pick<TipClaimMember, "bartenderEnabled" | "managerEnabled" | "barbackEnabled" | "doorEnabled">> = {
  bartender: "bartenderEnabled",
  manager: "managerEnabled",
  barback: "barbackEnabled",
  door: "doorEnabled",
};

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

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

function formatWeight(value: number) {
  return Number(value.toFixed(1)).toLocaleString("en-US", { maximumFractionDigits: 1 });
}

export function TipDivvyCalculator({ organizationId, organizationName, organizationSelector, members = [], membersPending = false, membersError = null }: TipDivvyCalculatorProps) {
  const [totalTips, setTotalTips] = useState("");
  const [assignments, setAssignments] = useState<TipPoolStaffAssignment[]>([]);
  const [weights, setWeights] = useState<TipClaimWeightState>({ ...DEFAULT_TIP_CLAIM_WEIGHTS });

  const { draftStatus, draftUpdatedAt, resetDraft } = useTipPoolDraft({ organizationId, members, membersPending, totalTips, setTotalTips, assignments, setAssignments, weights, setWeights });

  const eligibleMembers = members.filter((member) => enabledRoles(member).length > 0);
  const assignedUserIds = new Set(assignments.map((assignment) => assignment.userId));
  const unassignedMembers = eligibleMembers.filter((member) => !assignedUserIds.has(member.id));

  const staff = useMemo<TipClaimRoleState>(() => assignments.reduce<TipClaimRoleState>((counts, assignment) => ({ ...counts, [assignment.role]: counts[assignment.role] + 1 }), { bartender: 0, manager: 0, barback: 0, door: 0 }), [assignments]);

  const totalTipsCents = Math.round(parseMoney(totalTips) * 100);
  const allocations = useMemo(() => allocateTipClaims(totalTipsCents, staff, weights), [staff, totalTipsCents, weights]);
  const totalWeight = getTipClaimTotalWeight(staff, weights);

  const employeeAllocations = useMemo(() => {
    const roleIndexes: Record<TipClaimRoleKey, number> = { bartender: 0, manager: 0, barback: 0, door: 0 };
    return assignments.map((assignment) => {
      roleIndexes[assignment.role] += 1;
      const allocation = allocations.find((candidate) => candidate.role === assignment.role && candidate.person === roleIndexes[assignment.role]);
      const member = members.find((candidate) => candidate.id === assignment.userId);
      return { ...assignment, name: member?.name || member?.email || assignment.userId, cents: allocation?.cents ?? 0 };
    });
  }, [allocations, assignments, members]);

  const roleBreakdown = TIP_CLAIM_ROLE_ORDER.map((role) => {
    const roleEmployees = employeeAllocations.filter((employee) => employee.role === role);
    const amounts = roleEmployees.map((employee) => employee.cents);
    return {
      role,
      count: roleEmployees.length,
      weight: weights[role],
      totalCents: roleEmployees.reduce((sum, employee) => sum + employee.cents, 0),
      minimum: amounts.length ? Math.min(...amounts) : 0,
      maximum: amounts.length ? Math.max(...amounts) : 0,
    };
  });

  const allocatedCents = employeeAllocations.reduce((sum, employee) => sum + employee.cents, 0);
  const draftTime = draftUpdatedAt ? new Date(draftUpdatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : null;

  function addMember() {
    const member = unassignedMembers[0];
    if (!member) return;
    const role = enabledRoles(member)[0];
    if (!role) return;
    setAssignments((current) => [...current, { userId: member.id, role }]);
  }

  function updateAssignment(index: number, changes: Partial<TipPoolStaffAssignment>) {
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
      return current.map((item, itemIndex) => itemIndex === index ? { userId, role } : item);
    });
  }

  function removeAssignment(index: number) {
    setAssignments((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function updateWeight(role: TipClaimRoleKey, value: string) {
    setWeights((current) => ({ ...current, [role]: clampWeight(Number(value)) }));
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Tip Pool Calculator</h1>
          <Badge variant="secondary">Weighted roles</Badge>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground md:text-base">Split the full tip pool across on-duty staff using the same weighted role logic as the Tip Claim Calculator.</p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          {organizationSelector}
          <Card>
            <CardHeader><CardTitle>Total tips</CardTitle><CardDescription>Enter the complete tip pool to distribute{organizationName ? ` for ${organizationName}` : ""}.</CardDescription></CardHeader>
            <CardContent><Field><FieldLabel htmlFor="total-tips">Tip pool</FieldLabel><InputGroup><InputGroupAddon align="inline-start"><InputGroupText>$</InputGroupText></InputGroupAddon><InputGroupInput id="total-tips" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00" value={totalTips} onChange={(event) => setTotalTips(event.target.value)} /></InputGroup><FieldDescription>The entire amount entered here will be allocated.</FieldDescription></Field></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>On-duty staff</CardTitle><CardDescription>Add each employee sharing the tip pool and choose the role they worked.</CardDescription></CardHeader>
            <CardContent className="flex flex-col gap-3">
              {membersError ? <p className="text-sm text-destructive">{membersError}</p> : null}
              <div className="flex flex-col gap-2">
                {assignments.map((assignment, index) => {
                  const member = members.find((candidate) => candidate.id === assignment.userId);
                  const availableMembers = eligibleMembers.filter((candidate) => candidate.id === assignment.userId || !assignedUserIds.has(candidate.id));
                  const availableRoles = member ? enabledRoles(member) : [];
                  return (
                    <div key={`${assignment.userId}-${index}`} className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(140px,0.45fr)_auto]">
                      <Select value={assignment.userId} onValueChange={(userId) => updateAssignment(index, { userId })}><SelectTrigger className="w-full"><SelectValue placeholder="Select member" /></SelectTrigger><SelectContent>{availableMembers.map((candidate) => <SelectItem key={candidate.id} value={candidate.id}>{candidate.name || candidate.email}</SelectItem>)}</SelectContent></Select>
                      <Select value={assignment.role} onValueChange={(role) => updateAssignment(index, { role: role as TipClaimRoleKey })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{availableRoles.map((role) => <SelectItem key={role} value={role}>{TIP_CLAIM_ROLE_LABELS[role]}</SelectItem>)}</SelectContent></Select>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeAssignment(index)} aria-label="Remove staff member"><Trash2Icon /></Button>
                    </div>
                  );
                })}
                <Button type="button" variant="outline" className="self-start" disabled={membersPending || unassignedMembers.length === 0} onClick={addMember}><PlusIcon data-icon="inline-start" />Add staff member</Button>
              </div>
              <Accordion type="single" collapsible className="mt-3"><AccordionItem value="weights"><AccordionTrigger>Allocation settings</AccordionTrigger><AccordionContent className="flex flex-col gap-4"><p className="text-muted-foreground">Higher weights receive a larger share. Defaults are Bartender 5, Manager 5, Barback 3, Door 1.</p><FieldGroup>{TIP_CLAIM_ROLE_ORDER.map((role) => <Field key={role} orientation="responsive"><FieldLabel htmlFor={`pool-weight-${role}`}>{TIP_CLAIM_ROLE_LABELS[role]} weight</FieldLabel><InputGroup className="sm:max-w-32"><InputGroupInput id={`pool-weight-${role}`} type="number" inputMode="decimal" min="0" max="10" step="0.1" value={weights[role]} onChange={(event) => updateWeight(role, event.target.value)} /><InputGroupAddon align="inline-end"><InputGroupText>×</InputGroupText></InputGroupAddon></InputGroup></Field>)}</FieldGroup></AccordionContent></AccordionItem></Accordion>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Draft</CardTitle><CardDescription>Your current tip pool is stored locally for this organization while you work.</CardDescription></CardHeader>
            <CardContent className="flex flex-col gap-3">
              {draftStatus ? <p className="text-xs text-muted-foreground">{draftStatus === "saving" ? "Saving draft…" : draftTime ? `Draft saved at ${draftTime}` : "Draft saved"}</p> : <p className="text-xs text-muted-foreground">No saved draft yet.</p>}
              <AlertDialog><AlertDialogTrigger asChild><Button type="button" variant="ghost" className="self-start text-destructive hover:text-destructive" disabled={!organizationId}><RotateCcwIcon data-icon="inline-start" />Reset calculator</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Reset Tip Pool Calculator?</AlertDialogTitle><AlertDialogDescription>This deletes the locally saved tip pool draft for this organization and clears the current calculator.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={resetDraft}>Reset calculator</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-6 lg:self-start">
          <Card><CardHeader><CardTitle>Tip pool</CardTitle><CardDescription>{assignments.length} staff · {formatWeight(totalWeight)} active weight units</CardDescription></CardHeader><CardContent className="grid grid-cols-2 gap-4"><div className="flex flex-col gap-1"><span className="text-sm text-muted-foreground">Total tips</span><span className="text-2xl font-semibold tabular-nums">{currency.format(totalTipsCents / 100)}</span></div><div className="flex flex-col gap-1"><span className="text-sm text-muted-foreground">Allocated</span><span className="text-2xl font-semibold tabular-nums">{currency.format(allocatedCents / 100)}</span></div></CardContent></Card>

          <Card>
            <CardHeader><CardTitle>Role breakdown</CardTitle><CardDescription>Amount each role receives based on active staff and weights.</CardDescription></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Role</TableHead><TableHead className="text-right">Staff</TableHead><TableHead className="text-right">Each</TableHead><TableHead className="whitespace-nowrap text-right">Total</TableHead></TableRow></TableHeader>
                <TableBody>{roleBreakdown.map((row) => {
                  const each = row.count === 0 ? "—" : row.minimum === row.maximum ? currency.format(row.minimum / 100) : `${currency.format(row.minimum / 100)}–${currency.format(row.maximum / 100)}`;
                  return <TableRow key={row.role}><TableCell><div className="flex items-center gap-2"><span className="font-medium">{TIP_CLAIM_ROLE_LABELS[row.role]}</span><Badge variant="outline">{formatWeight(row.weight)}×</Badge></div></TableCell><TableCell className="text-right tabular-nums">{row.count}</TableCell><TableCell className="whitespace-nowrap text-right tabular-nums">{each}</TableCell><TableCell className="whitespace-nowrap text-right font-medium tabular-nums">{currency.format(row.totalCents / 100)}</TableCell></TableRow>;
                })}</TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card><CardHeader><CardTitle>Distribution</CardTitle><CardDescription>Exact share for each employee in the tip pool.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Role</TableHead><TableHead className="text-right">Share</TableHead></TableRow></TableHeader><TableBody>{employeeAllocations.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Add staff to calculate the split.</TableCell></TableRow> : employeeAllocations.map((employee) => <TableRow key={employee.userId}><TableCell className="font-medium">{employee.name}</TableCell><TableCell>{TIP_CLAIM_ROLE_LABELS[employee.role]}</TableCell><TableCell className="text-right font-medium tabular-nums">{currency.format(employee.cents / 100)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
        </div>
      </div>
    </main>
  );
}
