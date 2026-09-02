import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDownIcon, SearchIcon, UsersIcon } from "lucide-react";

import { Badge } from "#/components/ui/badge.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "#/components/ui/collapsible.tsx";
import { Input } from "#/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select.tsx";
import { Skeleton } from "#/components/ui/skeleton.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table.tsx";
import { authBaseURL, authClient } from "#/lib/auth-client.ts";
import {
  listTipClaimAssignments,
  type TipClaimEmployeeAssignment,
  type TipClaimRole,
  updateTipClaimAccess,
  updateTipClaimAssignment,
} from "#/lib/tip-claim.ts";

export const Route = createFileRoute("/assignments")({
  component: TipClaimAssignments,
});

const ROLE_OPTIONS: Array<{
  role: TipClaimRole;
  label: string;
  key: keyof Pick<
    TipClaimEmployeeAssignment,
    "bartenderEnabled" | "managerEnabled" | "barbackEnabled" | "doorEnabled"
  >;
}> = [
  { role: "bartender", label: "Bartender", key: "bartenderEnabled" },
  { role: "manager", label: "Manager", key: "managerEnabled" },
  { role: "barback", label: "Barback", key: "barbackEnabled" },
  { role: "door", label: "Door", key: "doorEnabled" },
];

function TipClaimAssignments() {
  const { data: session, isPending } = authClient.useSession();
  const { data: organizations, isPending: areOrganizationsPending } =
    authClient.useListOrganizations();
  const { data: activeOrganization, isPending: isActiveOrganizationPending } =
    authClient.useActiveOrganization();
  const [assignments, setAssignments] = useState<TipClaimEmployeeAssignment[]>([]);
  const [assignmentsPending, setAssignmentsPending] = useState(false);
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [accessOpen, setAccessOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(true);

  useEffect(() => {
    if (isPending || session) return;

    const redirectTo = encodeURIComponent(window.location.href);
    const signInURL = `${authBaseURL.replace(/\/$/, "")}/auth/sign-in?redirectTo=${redirectTo}`;
    window.location.replace(signInURL);
  }, [isPending, session]);

  useEffect(() => {
    if (
      !session ||
      areOrganizationsPending ||
      isActiveOrganizationPending ||
      activeOrganization ||
      organizations?.length !== 1
    ) {
      return;
    }

    void authClient.organization.setActive({
      organizationId: organizations[0].id,
    });
  }, [
    activeOrganization,
    areOrganizationsPending,
    isActiveOrganizationPending,
    organizations,
    session,
  ]);

  useEffect(() => {
    if (!session || !activeOrganization?.id) {
      setAssignments([]);
      setAssignmentsError(null);
      setAssignmentsPending(false);
      return;
    }

    let cancelled = false;

    async function loadAssignments() {
      setAssignmentsPending(true);
      setAssignmentsError(null);

      try {
        const result = await listTipClaimAssignments(activeOrganization.id);
        if (!cancelled) {
          setAssignments(result);
          setAssignmentsPending(false);
        }
      } catch (error) {
        if (!cancelled) {
          setAssignments([]);
          setAssignmentsError(
            error instanceof Error
              ? error.message
              : "Unable to load employee assignments.",
          );
          setAssignmentsPending(false);
        }
      }
    }

    void loadAssignments();

    return () => {
      cancelled = true;
    };
  }, [activeOrganization?.id, session]);

  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return assignments;

    return assignments.filter(
      (assignment) =>
        assignment.name.toLowerCase().includes(query) ||
        assignment.email.toLowerCase().includes(query),
    );
  }, [assignments, search]);

  async function handleAccessToggle(assignment: TipClaimEmployeeAssignment) {
    if (!activeOrganization?.id || updatingKey) return;

    const key = `${assignment.userId}:access`;
    setUpdatingKey(key);
    setAssignmentsError(null);

    try {
      const updated = await updateTipClaimAccess(
        activeOrganization.id,
        assignment.userId,
        !assignment.accessEnabled,
      );

      setAssignments((current) =>
        current.map((item) => (item.userId === updated.userId ? updated : item)),
      );
    } catch (error) {
      setAssignmentsError(
        error instanceof Error
          ? error.message
          : "Unable to update Tip Calculator access.",
      );
    } finally {
      setUpdatingKey(null);
    }
  }

  async function handleRoleToggle(
    assignment: TipClaimEmployeeAssignment,
    role: TipClaimRole,
    field: (typeof ROLE_OPTIONS)[number]["key"],
  ) {
    if (!activeOrganization?.id || updatingKey) return;

    const key = `${assignment.userId}:${role}`;
    const enabled = !assignment[field];
    setUpdatingKey(key);
    setAssignmentsError(null);

    try {
      const updated = await updateTipClaimAssignment(
        activeOrganization.id,
        assignment.userId,
        role,
        enabled,
      );

      setAssignments((current) =>
        current.map((item) => (item.userId === updated.userId ? updated : item)),
      );
    } catch (error) {
      setAssignmentsError(
        error instanceof Error
          ? error.message
          : "Unable to update employee assignment.",
      );
    } finally {
      setUpdatingKey(null);
    }
  }

  if (isPending || !session) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6 lg:p-8">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-80 w-full" />
      </main>
    );
  }

  const organizationList = organizations ?? [];
  const organizationsPending =
    areOrganizationsPending || isActiveOrganizationPending;

  const employeeTableState = assignmentsPending ? (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  ) : !activeOrganization ? null : assignments.length === 0 ? (
    <p className="text-sm text-muted-foreground">
      No eligible organization employees are available.
    </p>
  ) : filteredAssignments.length === 0 ? (
    <p className="text-sm text-muted-foreground">No employees match your search.</p>
  ) : null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6 lg:p-8">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm">
          <UsersIcon />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assignments</h1>
          <p className="text-sm text-muted-foreground">
            Manage Tip Calculator access and employee role eligibility.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>
            Assignments are stored separately for each organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={activeOrganization?.id ?? ""}
            disabled={organizationsPending || organizationList.length === 0}
            onValueChange={(organizationId) => {
              if (organizationId) {
                void authClient.organization.setActive({ organizationId });
              }
            }}
          >
            <SelectTrigger className="w-full sm:max-w-sm">
              <SelectValue
                placeholder={
                  organizationsPending
                    ? "Loading organizations…"
                    : organizationList.length === 0
                      ? "No organizations"
                      : "Select organization"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {organizationList.map((organization) => (
                <SelectItem key={organization.id} value={organization.id}>
                  {organization.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="relative sm:max-w-sm">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search employees"
          className="pl-9"
        />
      </div>

      {assignmentsError ? (
        <p className="text-sm text-destructive">{assignmentsError}</p>
      ) : null}

      <Collapsible open={accessOpen} onOpenChange={setAccessOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <button type="button" className="flex w-full items-center text-left">
              <CardHeader className="flex-1">
                <CardTitle>Access</CardTitle>
                <CardDescription>
                  Choose which organization users can open and use the Tip Calculator.
                </CardDescription>
              </CardHeader>
              <ChevronDownIcon
                className={`mr-6 size-5 shrink-0 text-muted-foreground transition-transform ${accessOpen ? "rotate-180" : ""}`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {employeeTableState}
              {!assignmentsPending && filteredAssignments.length > 0 ? (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Access</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAssignments.map((assignment) => {
                        const isUpdating =
                          updatingKey === `${assignment.userId}:access`;
                        return (
                          <TableRow key={assignment.userId}>
                            <TableCell>
                              <div className="min-w-44">
                                <p className="font-medium">{assignment.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {assignment.email}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                asChild
                                variant={assignment.accessEnabled ? "default" : "outline"}
                              >
                                <button
                                  type="button"
                                  disabled={updatingKey !== null}
                                  aria-pressed={assignment.accessEnabled}
                                  onClick={() => void handleAccessToggle(assignment)}
                                  className={
                                    assignment.accessEnabled
                                      ? "cursor-pointer"
                                      : "cursor-pointer opacity-45"
                                  }
                                >
                                  {isUpdating ? "Saving…" : "Tip Calculator"}
                                </button>
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : null}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible open={rolesOpen} onOpenChange={setRolesOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <button type="button" className="flex w-full items-center text-left">
              <CardHeader className="flex-1">
                <CardTitle>Roles</CardTitle>
                <CardDescription>
                  Active roles appear in the calculator. Employees with every role disabled are hidden from its employee selectors.
                </CardDescription>
              </CardHeader>
              <ChevronDownIcon
                className={`mr-6 size-5 shrink-0 text-muted-foreground transition-transform ${rolesOpen ? "rotate-180" : ""}`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {employeeTableState}
              {!assignmentsPending && filteredAssignments.length > 0 ? (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Roles</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAssignments.map((assignment) => (
                        <TableRow key={assignment.userId}>
                          <TableCell>
                            <div className="min-w-44">
                              <p className="font-medium">{assignment.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {assignment.email}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex min-w-max flex-wrap gap-2">
                              {ROLE_OPTIONS.map(({ role, label, key }) => {
                                const enabled = assignment[key];
                                const isUpdating =
                                  updatingKey === `${assignment.userId}:${role}`;

                                return (
                                  <Badge
                                    key={role}
                                    asChild
                                    variant={enabled ? "default" : "outline"}
                                  >
                                    <button
                                      type="button"
                                      disabled={updatingKey !== null}
                                      aria-pressed={enabled}
                                      onClick={() =>
                                        void handleRoleToggle(assignment, role, key)
                                      }
                                      className={
                                        enabled
                                          ? "cursor-pointer"
                                          : "cursor-pointer opacity-45"
                                      }
                                    >
                                      {isUpdating ? "Saving…" : label}
                                    </button>
                                  </Badge>
                                );
                              })}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </main>
  );
}
