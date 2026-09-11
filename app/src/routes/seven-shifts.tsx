import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { CalculatorTabs } from "#/components/calculator-tabs.tsx";
import { SevenShiftsScheduleConfigurator } from "#/components/seven-shifts-schedule-configurator.tsx";
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
import { Skeleton } from "#/components/ui/skeleton.tsx";
import { authBaseURL, authClient } from "#/lib/auth-client.ts";
import { getSevenShiftsScheduleAccess } from "#/lib/seven-shifts-schedules.ts";

export const Route = createFileRoute("/seven-shifts")({
  head: () => ({ meta: [{ title: "7Shifts Schedule" }] }),
  component: SevenShiftsRoute,
});

function ScheduleSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6 lg:p-8">
      <Skeleton className="h-14 w-full max-w-md" />
      <Skeleton className="h-11 w-full max-w-2xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <Skeleton className="h-[38rem] w-full rounded-xl" />
        <Skeleton className="h-[32rem] w-full rounded-xl" />
      </div>
    </main>
  );
}
function SevenShiftsRoute() {
  const { data: session, isPending } = authClient.useSession();
  const { data: organizations, isPending: areOrganizationsPending } =
    authClient.useListOrganizations();
  const { data: activeOrganization, isPending: isActiveOrganizationPending } =
    authClient.useActiveOrganization();
  const [accessAllowed, setAccessAllowed] = useState<boolean | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);

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
      setAccessAllowed(null);
      setAccessError(null);
      return;
    }

    let cancelled = false;
    setAccessAllowed(null);
    setAccessError(null);

    void getSevenShiftsScheduleAccess(activeOrganization.id)
      .then((allowed) => {
        if (!cancelled) setAccessAllowed(allowed);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setAccessAllowed(false);
        setAccessError(
          error instanceof Error
            ? error.message
            : "Unable to verify 7Shifts access.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [activeOrganization?.id, session]);

  if (
    isPending ||
    areOrganizationsPending ||
    isActiveOrganizationPending ||
    (!activeOrganization && organizations?.length === 1) ||
    (activeOrganization && accessAllowed === null)
  ) {
    return <ScheduleSkeleton />;
  }

  if (!session) return null;

  const organizationList = organizations ?? [];
  const organizationsPending =
    areOrganizationsPending || isActiveOrganizationPending;
  const organizationSelector = (
    <Card>
      <CardHeader>
        <CardTitle>Organization</CardTitle>
        <CardDescription>
          Choose the organization whose 7Shifts schedule you want to review.
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
          <SelectTrigger className="w-full">
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
  );

  if (!activeOrganization) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6 lg:p-8">
        <CalculatorTabs />
        {organizationSelector}
      </main>
    );
  }

  if (!accessAllowed) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6 lg:p-8">
        <CalculatorTabs />
        {organizationSelector}
        <Card>
          <CardHeader>
            <CardTitle>7Shifts Schedule unavailable</CardTitle>
            <CardDescription>
              This option is only available when the organization has the
              7Shifts schedules integration enabled for your account.
            </CardDescription>
          </CardHeader>
          {accessError ? (
            <CardContent>
              <p className="text-sm text-destructive">{accessError}</p>
            </CardContent>
          ) : null}
        </Card>
      </main>
    );
  }

  return (
    <SevenShiftsScheduleConfigurator
      key={activeOrganization.id}
      organizationId={activeOrganization.id}
      organizationName={activeOrganization.name}
      organizationSelector={organizationSelector}
    />
  );
}
