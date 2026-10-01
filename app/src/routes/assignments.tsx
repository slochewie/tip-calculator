import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  UsersIcon,
} from "lucide-react";

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
  type TipClaimAssignmentRole,
  type TipClaimEmployeeAssignment,
  updateTipClaimAccess,
  updateTipClaimAssignment,
  updateTipClaimManager,
} from "#/lib/tip-claim.ts";

export const Route = createFileRoute("/assignments")({
  component: TipClaimAssignments,
});

const PAGE_SIZE = 10;

const ROLE_OPTIONS: Array<{
  role: TipClaimAssignmentRole;
  label: string;
  key: keyof Pick<
    TipClaimEmployeeAssignment,
    | "bartenderEnabled"
    | "managerEnabled"
    | "barbackEnabled"
    | "doorEnabled"
    | "sevenShiftsEnabled"
  >;
  sevenShiftsOnly?: boolean;
}> = [
  { role: "bartender", label: "Bartender", key: "bartenderEnabled" },
  { role: "manager", label: "Manager", key: "managerEnabled" },
  { role: "barback", label: "Barback", key: "barbackEnabled" },
  { role: "door", label: "Door", key: "doorEnabled" },
  {
    role: "seven-shifts",
    label: "7Shifts",
    key: "sevenShiftsEnabled",
    sevenShiftsOnly: true,
  },
];

type AccessFilter = "all" | "enabled" | "disabled" | "managers";
type RoleFilter =
  | "all"
  | "bartender"
  | "manager"
  | "barback"
  | "door"
  | "seven-shifts"
  | "none";

function TipClaimAssignments() {
  const { data: session, isPending } = authClient.useSession();
  const { data: organizations, isPending: areOrganizationsPending } =
    authClient.useListOrganizations();
  const { data: activeOrganization, isPending: isActiveOrganizationPending } =
    authClient.useActiveOrganization();
  const [assignments, setAssignments] = useState<TipClaimEmployeeAssignment[]>([]);
  const [sevenShiftsConfigured, setSevenShiftsConfigured] = useState(false);
  const [assignmentsPending, setAssignmentsPending] = useState(false);
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [accessSearch, setAccessSearch] = useState("");
  const [rolesSearch, setRolesSearch] = useState("");
  const [accessFilter, setAccessFilter] = useState<AccessFilter>("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [accessPage, setAccessPage] = useState(1);
  const [rolesPage, setRolesPage] = useState(1);
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
    ) return;

    void authClient.organization.setActive({ organizationId: organizations[0].id });
  }, [activeOrganization, areOrganizationsPending, isActiveOrganizationPending, organizations, session]);

  useEffect(() => {
    if (!session || !activeOrganization?.id) {
      setAssignments([]);
      setSevenShiftsConfigured(false);
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
          setAssignments(result.assignments);
          setSevenShiftsConfigured(result.sevenShiftsConfigured);
          setAssignmentsPending(false);
        }
      } catch (error) {
        if (!cancelled) {
          setAssignments([]);
          setSevenShiftsConfigured(false);
          setAssignmentsError(error instanceof Error ? error.message : "Unable to load employee assignments.");
          setAssignmentsPending(false);
        }
      }
    }
    void loadAssignments();
    return () => { cancelled = true; };
  }, [activeOrganization?.id, session]);

  const visibleRoleOptions = useMemo(
    () =>
      ROLE_OPTIONS.filter(
        (option) => !option.sevenShiftsOnly || sevenShiftsConfigured,
      ),
    [sevenShiftsConfigured],
  );

  const accessAssignments = useMemo(() => {
    const query = accessSearch.trim().toLowerCase();

    return assignments.filter((assignment) => {
      if (
        query &&
        !assignment.name.toLowerCase().includes(query) &&
        !assignment.email.toLowerCase().includes(query)
      ) {
        return false;
      }

      if (accessFilter === "enabled") return assignment.accessEnabled;
      if (accessFilter === "disabled") return !assignment.accessEnabled;
      if (accessFilter === "managers") {
        return assignment.assignmentManagerEnabled;
      }
      return true;
    });
  }, [accessFilter, accessSearch, assignments]);

  const roleAssignments = useMemo(() => {
    const query = rolesSearch.trim().toLowerCase();

    return assignments.filter((assignment) => {
      if (
        query &&
        !assignment.name.toLowerCase().includes(query) &&
        !assignment.email.toLowerCase().includes(query)
      ) {
        return false;
      }

      if (roleFilter === "bartender") return assignment.bartenderEnabled;
      if (roleFilter === "manager") return assignment.managerEnabled;
      if (roleFilter === "barback") return assignment.barbackEnabled;
      if (roleFilter === "door") return assignment.doorEnabled;
      if (roleFilter === "seven-shifts") {
        return sevenShiftsConfigured && assignment.sevenShiftsEnabled;
      }
      if (roleFilter === "none") {
        return visibleRoleOptions.every(({ key }) => !assignment[key]);
      }
      return true;
    });
  }, [
    assignments,
    roleFilter,
    rolesSearch,
    sevenShiftsConfigured,
    visibleRoleOptions,
  ]);

  useEffect(() => {
    setAccessPage(1);
  }, [accessFilter, accessSearch, activeOrganization?.id]);

  useEffect(() => {
    setRolesPage(1);
  }, [roleFilter, rolesSearch, activeOrganization?.id]);

  const accessPageCount = Math.max(
    1,
    Math.ceil(accessAssignments.length / PAGE_SIZE),
  );
  const rolesPageCount = Math.max(
    1,
    Math.ceil(roleAssignments.length / PAGE_SIZE),
  );
  const safeAccessPage = Math.min(accessPage, accessPageCount);
  const safeRolesPage = Math.min(rolesPage, rolesPageCount);
  const accessRows = accessAssignments.slice(
    (safeAccessPage - 1) * PAGE_SIZE,
    safeAccessPage * PAGE_SIZE,
  );
  const roleRows = roleAssignments.slice(
    (safeRolesPage - 1) * PAGE_SIZE,
    safeRolesPage * PAGE_SIZE,
  );

  function mergeAssignment(updated: TipClaimEmployeeAssignment) {
    setAssignments((current) =>
      current.map((item) =>
        item.userId === updated.userId ? { ...item, ...updated } : item,
      ),
    );
  }

  async function handleAccessToggle(assignment: TipClaimEmployeeAssignment) {
    if (!activeOrganization?.id || updatingKey || !assignment.canUpdateAccess) return;
    const key = `${assignment.userId}:access`;
    setUpdatingKey(key);
    setAssignmentsError(null);
    try {
      mergeAssignment(await updateTipClaimAccess(activeOrganization.id, assignment.userId, !assignment.accessEnabled));
    } catch (error) {
      setAssignmentsError(error instanceof Error ? error.message : "Unable to update Tip Calculator access.");
    } finally {
      setUpdatingKey(null);
    }
  }

  async function handleManagerToggle(assignment: TipClaimEmployeeAssignment) {
    if (!activeOrganization?.id || updatingKey || !assignment.canUpdateManager) return;
    const key = `${assignment.userId}:assignment-manager`;
    setUpdatingKey(key);
    setAssignmentsError(null);
    try {
      mergeAssignment(await updateTipClaimManager(activeOrganization.id, assignment.userId, !assignment.assignmentManagerEnabled));
    } catch (error) {
      setAssignmentsError(error instanceof Error ? error.message : "Unable to update Tip Calculator manager.");
    } finally {
      setUpdatingKey(null);
    }
  }

  async function handleRoleToggle(
    assignment: TipClaimEmployeeAssignment,
    role: TipClaimAssignmentRole,
    field: (typeof ROLE_OPTIONS)[number]["key"],
  ) {
    if (!activeOrganization?.id || updatingKey || !assignment.canUpdateRoles) return;
    const key = `${assignment.userId}:${role}`;
    setUpdatingKey(key);
    setAssignmentsError(null);
    try {
      mergeAssignment(await updateTipClaimAssignment(activeOrganization.id, assignment.userId, role, !assignment[field]));
    } catch (error) {
      setAssignmentsError(error instanceof Error ? error.message : "Unable to update employee assignment.");
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

  const employeeTableState = assignmentsPending ? (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  ) : !activeOrganization ? null : assignments.length === 0 ? (
    <p className="text-sm text-muted-foreground">No eligible organization employees are available.</p>
  ) : filteredAssignments.length === 0 ? (
    <p className="text-sm text-muted-foreground">No employees match your search.</p>
  ) : null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6 lg:p-8">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm"><UsersIcon /></div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assignments</h1>
          <p className="text-sm text-muted-foreground">Manage Tip Calculator access and employee role eligibility.</p>
        </div>
      </div>

      {assignmentsError ? <p className="text-sm text-destructive">{assignmentsError}</p> : null}

      <Collapsible open={accessOpen} onOpenChange={setAccessOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <button type="button" className="flex w-full items-center text-left">
              <CardHeader className="flex-1">
                <CardTitle>Access</CardTitle>
                <CardDescription>Choose who can use the Tip Calculator and who can manage its assignments.</CardDescription>
              </CardHeader>
              <ChevronDownIcon className={`mr-6 size-5 shrink-0 text-muted-foreground transition-transform ${accessOpen ? "rotate-180" : ""}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="flex flex-col gap-3">
              <TableControls
                search={accessSearch}
                onSearchChange={setAccessSearch}
                filter={accessFilter}
                onFilterChange={(value) => setAccessFilter(value as AccessFilter)}
                options={[
                  ["all", "All access"],
                  ["enabled", "Tip Calculator enabled"],
                  ["disabled", "Tip Calculator disabled"],
                  ["managers", "Assignment managers"],
                ]}
              />
              {employeeTableState}
              {!assignmentsPending && accessAssignments.length > 0 ? (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Access</TableHead><TableHead>Manager</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {accessRows.map((assignment) => {
                        const accessUpdating = updatingKey === `${assignment.userId}:access`;
                        const managerUpdating = updatingKey === `${assignment.userId}:assignment-manager`;
                        return (
                          <TableRow key={assignment.userId}>
                            <TableCell>
                              <div className="min-w-44">
                                <p className="font-medium">{assignment.name}</p>
                                <p className="text-xs text-muted-foreground">{assignment.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge asChild variant={assignment.accessEnabled ? "default" : "outline"}>
                                <button
                                  type="button"
                                  disabled={updatingKey !== null || !assignment.canUpdateAccess}
                                  aria-pressed={assignment.accessEnabled}
                                  onClick={() => void handleAccessToggle(assignment)}
                                  className={assignment.canUpdateAccess ? (assignment.accessEnabled ? "cursor-pointer" : "cursor-pointer opacity-45") : "cursor-not-allowed opacity-45"}
                                >
                                  {accessUpdating ? "Saving…" : "Tip Calculator"}
                                </button>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge asChild variant={assignment.assignmentManagerEnabled ? "default" : "outline"}>
                                <button
                                  type="button"
                                  disabled={updatingKey !== null || !assignment.canUpdateManager}
                                  aria-pressed={assignment.assignmentManagerEnabled}
                                  onClick={() => void handleManagerToggle(assignment)}
                                  className={assignment.canUpdateManager ? (assignment.assignmentManagerEnabled ? "cursor-pointer" : "cursor-pointer opacity-45") : "cursor-not-allowed opacity-45"}
                                >
                                  {managerUpdating ? "Saving…" : "Manager"}
                                </button>
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <Pagination
                  page={safeAccessPage}
                  pageCount={accessPageCount}
                  total={accessAssignments.length}
                  onPageChange={setAccessPage}
                />
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
                  Active staffing roles appear in the calculator. 7Shifts access
                  grants schedule features without changing the employee's roles
                  in 7shifts.
                </CardDescription>
              </CardHeader>
              <ChevronDownIcon className={`mr-6 size-5 shrink-0 text-muted-foreground transition-transform ${rolesOpen ? "rotate-180" : ""}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="flex flex-col gap-3">
              <TableControls
                search={rolesSearch}
                onSearchChange={setRolesSearch}
                filter={roleFilter}
                onFilterChange={(value) => setRoleFilter(value as RoleFilter)}
                options={[
                  ["all", "All roles"],
                  ["bartender", "Bartender"],
                  ["manager", "Manager"],
                  ["barback", "Barback"],
                  ["door", "Door"],
                  ...(sevenShiftsConfigured
                    ? [["seven-shifts", "7Shifts"]]
                    : []),
                  ["none", "No enabled roles"],
                ]}
              />
              {employeeTableState}
              {!assignmentsPending && roleAssignments.length > 0 ? (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Roles</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {roleRows.map((assignment) => (
                        <TableRow key={assignment.userId}>
                          <TableCell>
                            <div className="min-w-44">
                              <p className="font-medium">{assignment.name}</p>
                              <p className="text-xs text-muted-foreground">{assignment.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex min-w-max flex-wrap gap-2">
                              {visibleRoleOptions.map(({ role, label, key }) => {
                                const enabled = assignment[key];
                                const roleUpdating = updatingKey === `${assignment.userId}:${role}`;
                                return (
                                  <Badge key={role} asChild variant={enabled ? "default" : "outline"}>
                                    <button
                                      type="button"
                                      disabled={updatingKey !== null || !assignment.canUpdateRoles}
                                      aria-pressed={enabled}
                                      onClick={() => void handleRoleToggle(assignment, role, key)}
                                      className={assignment.canUpdateRoles ? (enabled ? "cursor-pointer" : "cursor-pointer opacity-45") : "cursor-not-allowed opacity-45"}
                                    >
                                      {roleUpdating ? "Saving…" : label}
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
                <Pagination
                  page={safeRolesPage}
                  pageCount={rolesPageCount}
                  total={roleAssignments.length}
                  onPageChange={setRolesPage}
                />
              ) : null}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </main>
  );
}


function TableControls({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  options,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  filter: string;
  onFilterChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="relative min-w-0 flex-1">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search employees"
          className="pl-9"
        />
      </div>
      <select
        value={filter}
        onChange={(event) => onFilterChange(event.target.value)}
        className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Pagination({
  page,
  pageCount,
  total,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>{start}–{end} of {total}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center rounded-md border bg-background disabled:opacity-40"
          disabled={page <= 1}
          aria-label="Previous page"
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <span className="min-w-20 text-center">
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center rounded-md border bg-background disabled:opacity-40"
          disabled={page >= pageCount}
          aria-label="Next page"
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}
