import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PencilIcon, ReceiptTextIcon, Trash2Icon } from "lucide-react";

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
import { authBaseURL, authClient } from "#/lib/auth-client.ts";
import { saveTipClaimCorrectionDraft } from "#/lib/tip-claim-draft.ts";
import {
  deleteTipClaimShift,
  listTipClaimShifts,
  type TipClaimShiftReport,
} from "#/lib/tip-claim.ts";
import {
  deleteTipPoolShift,
  listTipPoolShifts,
  type TipPoolShiftReport,
} from "#/lib/tip-pool.ts";
import { saveTipPoolCorrectionDraft } from "#/lib/use-tip-pool-draft.ts";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Tip Reports" }] }),
  component: Reports,
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

function Reports() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const { data: organizations, isPending: areOrganizationsPending } =
    authClient.useListOrganizations();
  const { data: activeOrganization, isPending: isActiveOrganizationPending } =
    authClient.useActiveOrganization();

  const [claimShifts, setClaimShifts] = useState<TipClaimShiftReport[]>([]);
  const [poolShifts, setPoolShifts] = useState<TipPoolShiftReport[]>([]);
  const [reportsPending, setReportsPending] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

    void authClient.organization.setActive({ organizationId: organizations[0].id });
  }, [
    activeOrganization,
    areOrganizationsPending,
    isActiveOrganizationPending,
    organizations,
    session,
  ]);

  useEffect(() => {
    if (!session || !activeOrganization?.id) {
      setClaimShifts([]);
      setPoolShifts([]);
      setReportsError(null);
      setReportsPending(false);
      setDeleteError(null);
      setDeletingKey(null);
      return;
    }

    let cancelled = false;

    async function loadReports() {
      setReportsPending(true);
      setReportsError(null);
      setDeleteError(null);

      try {
        const [claims, pools] = await Promise.all([
          listTipClaimShifts(activeOrganization.id),
          listTipPoolShifts(activeOrganization.id),
        ]);

        if (!cancelled) {
          setClaimShifts(claims);
          setPoolShifts(pools);
          setReportsPending(false);
        }
      } catch (error) {
        if (!cancelled) {
          setClaimShifts([]);
          setPoolShifts([]);
          setReportsError(
            error instanceof Error ? error.message : "Unable to load reports.",
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

  async function handleDeleteClaim(shift: TipClaimShiftReport) {
    if (!activeOrganization?.id || deletingKey) return;

    const key = `claim:${shift.id}`;
    setDeletingKey(key);
    setDeleteError(null);

    try {
      await deleteTipClaimShift(activeOrganization.id, shift.id);
      setClaimShifts((current) => current.filter((item) => item.id !== shift.id));
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Unable to delete report.",
      );
    } finally {
      setDeletingKey(null);
    }
  }

  async function handleDeletePool(shift: TipPoolShiftReport) {
    if (!activeOrganization?.id || deletingKey) return;

    const key = `pool:${shift.id}`;
    setDeletingKey(key);
    setDeleteError(null);

    try {
      await deleteTipPoolShift(activeOrganization.id, shift.id);
      setPoolShifts((current) => current.filter((item) => item.id !== shift.id));
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Unable to delete report.",
      );
    } finally {
      setDeletingKey(null);
    }
  }

  function handleCorrectClaim(shift: TipClaimShiftReport) {
    saveTipClaimCorrectionDraft(shift);
    void navigate({ to: "/app" });
  }

  function handleCorrectPool(shift: TipPoolShiftReport) {
    saveTipPoolCorrectionDraft(shift);
    void navigate({ to: "/tips" });
  }

  if (isPending || !session) {
    return null;
  }

  const organizationsPending =
    areOrganizationsPending || isActiveOrganizationPending;
  const noReports = claimShifts.length === 0 && poolShifts.length === 0;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6 lg:p-8">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm">
          <ReceiptTextIcon className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Saved Tip Claim and Tip Pool reports
            {activeOrganization?.name ? ` for ${activeOrganization.name}` : ""}.
          </p>
        </div>
      </div>

      {!activeOrganization && !organizationsPending ? (
        <Card>
          <CardHeader>
            <CardTitle>Select an organization</CardTitle>
            <CardDescription>
              Select an organization from the account controls to view its reports.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {reportsPending ? (
        <Card>
          <CardHeader>
            <CardTitle>Loading reports…</CardTitle>
            <CardDescription>Reading saved Tip Claim and Tip Pool reports.</CardDescription>
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
            <CardTitle>Unable to delete report</CardTitle>
            <CardDescription>{deleteError}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {!reportsPending && !reportsError && activeOrganization && noReports ? (
        <Card>
          <CardHeader>
            <CardTitle>No saved reports yet</CardTitle>
            <CardDescription>
              Saved Tip Claim and Tip Pool reports will appear here.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {!reportsPending && !reportsError && poolShifts.length > 0 ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Tip Pool Reports</h2>
            <p className="text-sm text-muted-foreground">
              Saved weighted tip-pool allocations.
            </p>
          </div>

          {poolShifts.map((shift) => {
            const key = `pool:${shift.id}`;
            const isDeleting = deletingKey === key;

            return (
              <Card key={key}>
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle>{formatDate(shift.completedAt)}</CardTitle>
                        <Badge variant="secondary">Tip Pool</Badge>
                      </div>
                      <CardDescription>
                        {shift.staff.length} {shift.staff.length === 1 ? "staff member" : "staff members"}
                      </CardDescription>
                    </div>

                    <div className="flex flex-col gap-3 sm:items-end">
                      <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-sm sm:text-right">
                        <span className="text-muted-foreground">Tips</span>
                        <span className="font-medium">{formatMoney(shift.totalTipsCents)}</span>
                        <span className="text-muted-foreground">Weight units</span>
                        <span className="font-medium">{shift.totalWeightTenths / 10}</span>
                      </div>

                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        {shift.canCorrect ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={deletingKey !== null}
                              >
                                <PencilIcon data-icon="inline-start" />
                                Correct report
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reopen saved Tip Pool report?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Load the {formatDate(shift.completedAt)} report into the Tip Pool Calculator for correction? The saved report remains unchanged until you save the correction.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleCorrectPool(shift)}>
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
                              disabled={deletingKey !== null}
                            >
                              <Trash2Icon data-icon="inline-start" />
                              {isDeleting ? "Deleting…" : "Delete report"}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Tip Pool report?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Delete the {formatDate(shift.completedAt)} report with {formatMoney(shift.totalTipsCents)} in tips? This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                disabled={isDeleting}
                                onClick={() => void handleDeletePool(shift)}
                              >
                                {isDeleting ? "Deleting…" : "Delete report"}
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
                      View report details
                    </summary>
                    <div className="space-y-2 border-t p-4">
                      {shift.staff.map((staffMember) => (
                        <div
                          key={staffMember.id}
                          className="flex items-start justify-between gap-4 rounded-md bg-muted/40 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">{staffMember.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatRole(staffMember.role)} · {staffMember.weightTenths / 10}× weight
                            </p>
                          </div>
                          <span className="shrink-0 font-medium tabular-nums">
                            {formatMoney(staffMember.shareCents)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                </CardContent>
              </Card>
            );
          })}
        </section>
      ) : null}

      {!reportsPending && !reportsError && claimShifts.length > 0 ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Tip Claim Reports</h2>
            <p className="text-sm text-muted-foreground">
              Saved end-of-shift sales and claim allocations.
            </p>
          </div>

          {claimShifts.map((shift) => {
            const registerNames = new Map(
              shift.registers.map((register) => [register.registerKey, register.name]),
            );
            const key = `claim:${shift.id}`;
            const isDeleting = deletingKey === key;

            return (
              <Card key={key}>
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle>{formatDate(shift.completedAt)}</CardTitle>
                        <Badge variant="secondary">Tip Claim</Badge>
                      </div>
                      <CardDescription>
                        {shift.staff.length} staff · {shift.registers.length} {shift.registers.length === 1 ? "register" : "registers"}
                      </CardDescription>
                    </div>

                    <div className="flex flex-col gap-3 sm:items-end">
                      <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-sm sm:text-right">
                        <span className="text-muted-foreground">Sales</span>
                        <span className="font-medium">{formatMoney(shift.totalSalesCents)}</span>
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
                                disabled={deletingKey !== null}
                              >
                                <PencilIcon data-icon="inline-start" />
                                Correct report
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reopen saved Tip Claim report?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Load the {formatDate(shift.completedAt)} report into the Tip Claim Calculator for correction? The saved report remains unchanged until you save the correction.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleCorrectClaim(shift)}>
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
                              disabled={deletingKey !== null}
                            >
                              <Trash2Icon data-icon="inline-start" />
                              {isDeleting ? "Deleting…" : "Delete report"}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Tip Claim report?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Delete the {formatDate(shift.completedAt)} report with {formatMoney(shift.totalSalesCents)} in sales? This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                disabled={isDeleting}
                                onClick={() => void handleDeleteClaim(shift)}
                              >
                                {isDeleting ? "Deleting…" : "Delete report"}
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
                      View report details
                    </summary>
                    <div className="grid gap-6 border-t p-4 lg:grid-cols-2">
                      <section className="space-y-3">
                        <h3 className="font-medium">Registers</h3>
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
                        <h3 className="font-medium">On-duty staff</h3>
                        <div className="space-y-2">
                          {shift.staff.map((staffMember) => (
                            <div
                              key={staffMember.id}
                              className="rounded-md bg-muted/40 px-3 py-2"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <p className="truncate font-medium">{staffMember.name}</p>
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
                  </details>
                </CardContent>
              </Card>
            );
          })}
        </section>
      ) : null}
    </main>
  );
}
