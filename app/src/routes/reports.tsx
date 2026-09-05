import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Building2Icon,
  CalculatorIcon,
  LogOutIcon,
  PencilIcon,
  ReceiptTextIcon,
  Trash2Icon,
  UserRoundIcon,
} from "lucide-react";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select.tsx";
import { authBaseURL, authClient } from "#/lib/auth-client.ts";
import { saveTipClaimCorrectionDraft } from "#/lib/tip-claim-draft.ts";
import {
  deleteTipClaimShift,
  listTipClaimShifts,
  type TipClaimShiftReport,
} from "#/lib/tip-claim.ts";

export const Route = createFileRoute("/reports")({
  component: TipClaimReports,
});

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatMoney(cents: number) {
  return moneyFormatter.format(cents / 100);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function formatRole(role: string) {
  if (role === "barback") return "Barback";
  if (role === "door") return "Door";
  if (role === "bartender") return "Bartender";
  if (role === "manager") return "Manager";
  return role;
}

function TipClaimReports() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const {
    data: organizations,
    isPending: areOrganizationsPending,
  } = authClient.useListOrganizations();
  const {
    data: activeOrganization,
    isPending: isActiveOrganizationPending,
  } = authClient.useActiveOrganization();
  const [shifts, setShifts] = useState<TipClaimShiftReport[]>([]);
  const [reportsPending, setReportsPending] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [deletingShiftId, setDeletingShiftId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (isPending || session) {
      return;
    }

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
      setShifts([]);
      setReportsError(null);
      setReportsPending(false);
      setDeleteError(null);
      setDeletingShiftId(null);
      return;
    }

    let cancelled = false;

    async function loadReports() {
      setReportsPending(true);
      setReportsError(null);
      setDeleteError(null);

      try {
        const result = await listTipClaimShifts(activeOrganization.id);

        if (!cancelled) {
          setShifts(result);
          setReportsPending(false);
        }
      } catch (error) {
        if (!cancelled) {
          setShifts([]);
          setReportsError(
            error instanceof Error
              ? error.message
              : "Unable to load tip claim reports.",
          );
          setReportsPending(false);
        }
      }
    }

    void loadReports();

    return () => {
      cancelled = true;
    };
  }, [activeOrganization?.id, session]);

  async function handleDeleteShift(shift: TipClaimShiftReport) {
    if (!activeOrganization?.id || deletingShiftId) {
      return;
    }

    setDeletingShiftId(shift.id);
    setDeleteError(null);

    try {
      await deleteTipClaimShift(activeOrganization.id, shift.id);
      setShifts((current) => current.filter((item) => item.id !== shift.id));
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Unable to delete shift.",
      );
    } finally {
      setDeletingShiftId(null);
    }
  }

  function handleCorrectShift(shift: TipClaimShiftReport) {
    saveTipClaimCorrectionDraft(shift);
    void navigate({ to: "/app" });
  }

  if (isPending || !session) {
    return (
      <main className="mx-auto flex w-full max-w-md p-4 md:p-6 lg:p-8">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Tip Claim Reports</CardTitle>
            <CardDescription>
              {isPending ? "Checking your session…" : "Redirecting to sign in…"}
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  const displayName = session.user.name || session.user.email;
  const showEmail = Boolean(session.user.name && session.user.email);
  const organizationList = organizations ?? [];
  const organizationsPending =
    areOrganizationsPending || isActiveOrganizationPending;

  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 pr-16 pt-4 md:flex-row md:items-center md:justify-between md:px-6 md:pr-20 md:pt-6 lg:px-8 lg:pr-24 lg:pt-8">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm">
              <UserRoundIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium">{displayName}</p>
                <Badge variant="secondary">Signed in</Badge>
              </div>
              {showEmail ? (
                <p className="truncate text-sm text-muted-foreground">
                  {session.user.email}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2 sm:border-l sm:pl-3">
            <Building2Icon className="size-4 shrink-0 text-muted-foreground" />
            <Select
              value={activeOrganization?.id}
              disabled={organizationsPending || organizationList.length === 0}
              onValueChange={(organizationId) => {
                void authClient.organization.setActive({ organizationId });
              }}
            >
              <SelectTrigger className="w-full min-w-48 sm:w-auto">
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
          </div>
        </div>

        <div className="flex flex-wrap gap-2 md:justify-end">
          <Button variant="outline" asChild>
            <Link to="/app">
              <CalculatorIcon data-icon="inline-start" />
              Calculator
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => authClient.signOut()}
          >
            <LogOutIcon data-icon="inline-start" />
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6 lg:p-8">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm">
            <ReceiptTextIcon className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Tip Claim Reports
            </h1>
            <p className="text-sm text-muted-foreground">
              Saved end-of-shift sales and tip claim allocations
              {activeOrganization?.name ? ` for ${activeOrganization.name}` : ""}.
            </p>
          </div>
        </div>

        {!activeOrganization && !organizationsPending ? (
          <Card>
            <CardHeader>
              <CardTitle>Select an organization</CardTitle>
              <CardDescription>
                Choose an organization above to view its saved shifts.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {reportsPending ? (
          <Card>
            <CardHeader>
              <CardTitle>Loading reports…</CardTitle>
              <CardDescription>Reading saved end-of-shift sales.</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {reportsError ? (
          <Card>
            <CardHeader>
              <CardTitle>Unable to load reports</CardTitle>
              <CardDescription>{reportsError}</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {deleteError ? (
          <Card>
            <CardHeader>
              <CardTitle>Unable to delete shift</CardTitle>
              <CardDescription>{deleteError}</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {!reportsPending && !reportsError && activeOrganization && shifts.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No saved shifts yet</CardTitle>
              <CardDescription>
                Save End of Shift Sales from the calculator and it will appear
                here.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {!reportsPending && !reportsError
          ? shifts.map((shift) => {
              const registerNames = new Map(
                shift.registers.map((register) => [
                  register.registerKey,
                  register.name,
                ]),
              );
              const isDeleting = deletingShiftId === shift.id;

              return (
                <Card key={shift.id}>
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <CardTitle>{formatDate(shift.completedAt)}</CardTitle>
                        <CardDescription>
                          {shift.staff.length} staff · {shift.registers.length}{" "}
                          {shift.registers.length === 1 ? "register" : "registers"}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col gap-3 sm:items-end">
                        <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-sm sm:text-right">
                          <span className="text-muted-foreground">Sales</span>
                          <span className="font-medium">
                            {formatMoney(shift.totalSalesCents)}
                          </span>
                          <span className="text-muted-foreground">Claim</span>
                          <span className="font-medium">
                            {formatMoney(shift.requiredClaimCents)} ({shift.claimPercent}%)
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          {shift.canCorrect ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={deletingShiftId !== null}
                                >
                                  <PencilIcon data-icon="inline-start" />
                                  Correct report
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Reopen saved report?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Load the {formatDate(shift.completedAt)} report into the
                                    calculator for correction? This replaces the current local
                                    calculator draft. The saved report is unchanged until you
                                    save the correction.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleCorrectShift(shift)}>
                                    Reopen in calculator
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : null}

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                disabled={deletingShiftId !== null}
                              >
                                <Trash2Icon data-icon="inline-start" />
                                {isDeleting ? "Deleting…" : "Delete shift"}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete saved shift?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Delete the {formatDate(shift.completedAt)} shift with{" "}
                                  {formatMoney(shift.totalSalesCents)} in sales? This cannot
                                  be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeleting}>
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  variant="destructive"
                                  disabled={isDeleting}
                                  onClick={() => void handleDeleteShift(shift)}
                                >
                                  {isDeleting ? "Deleting…" : "Delete shift"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <details className="group rounded-lg border">
                      <summary className="cursor-pointer select-none px-4 py-3 font-medium">
                        View shift details
                      </summary>

                      <div className="grid gap-6 border-t p-4 lg:grid-cols-2">
                        <section className="space-y-3">
                          <h2 className="font-medium">Registers</h2>
                          <div className="space-y-2">
                            {shift.registers.map((register) => (
                              <div
                                key={register.id}
                                className="flex items-center justify-between gap-4 rounded-md bg-muted/40 px-3 py-2"
                              >
                                <span>{register.name}</span>
                                <span className="font-medium tabular-nums">
                                  {formatMoney(register.salesCents)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </section>

                        <section className="space-y-3">
                          <h2 className="font-medium">On-duty staff</h2>
                          <div className="space-y-2">
                            {shift.staff.map((staffMember) => (
                              <div
                                key={staffMember.id}
                                className="rounded-md bg-muted/40 px-3 py-2"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="min-w-0">
                                    <p className="truncate font-medium">
                                      {staffMember.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatRole(staffMember.role)}
                                      {staffMember.registerKey
                                        ? ` · ${registerNames.get(staffMember.registerKey) ?? staffMember.registerKey}`
                                        : ""}
                                      {` · ${staffMember.weight}× weight`}
                                    </p>
                                  </div>
                                  <span className="shrink-0 font-medium tabular-nums">
                                    {formatMoney(staffMember.claimCents)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      </div>

                      <div className="grid gap-2 border-t px-4 py-3 text-sm sm:grid-cols-4">
                        <div>
                          <span className="text-muted-foreground">Weight units: </span>
                          <span className="font-medium">{shift.totalWeightUnits}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Bartender: </span>
                          <span className="font-medium">{shift.bartenderWeight}×</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Manager: </span>
                          <span className="font-medium">{shift.managerWeight}×</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Barback / Door:{" "}
                          </span>
                          <span className="font-medium">
                            {shift.barbackWeight}× / {shift.doorWeight}×
                          </span>
                        </div>
                      </div>
                    </details>
                  </CardContent>
                </Card>
              );
            })
          : null}
      </main>
    </>
  );
}
