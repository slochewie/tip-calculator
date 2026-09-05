import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { TipDivvyCalculator } from "#/components/tip-divvy-calculator.tsx";
import type { TipClaimMember } from "#/components/tip-claim-calculator.tsx";
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
import { getTipClaimAccess, listTipClaimEmployees } from "#/lib/tip-claim.ts";

export const Route = createFileRoute("/tips")({
  head: () => ({ meta: [{ title: "Tip Pool Calculator" }] }),
  component: AuthenticatedTipDivvy,
});

function TipDivvySkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-52" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-60" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-28" />
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function AuthenticatedTipDivvy() {
  const { data: session, isPending } = authClient.useSession();
  const { data: organizations, isPending: areOrganizationsPending } =
    authClient.useListOrganizations();
  const { data: activeOrganization, isPending: isActiveOrganizationPending } =
    authClient.useActiveOrganization();
  const [members, setMembers] = useState<TipClaimMember[]>([]);
  const [accessAllowed, setAccessAllowed] = useState<boolean | null>(null);
  const [areMembersPending, setAreMembersPending] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);

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
      setMembers([]);
      setAccessAllowed(null);
      setMembersError(null);
      setAreMembersPending(false);
      return;
    }

    let cancelled = false;

    async function loadTipDivvy() {
      setAreMembersPending(true);
      setAccessAllowed(null);
      setMembersError(null);

      try {
        const allowed = await getTipClaimAccess(activeOrganization.id);
        if (cancelled) return;

        setAccessAllowed(allowed);

        if (!allowed) {
          setMembers([]);
          setAreMembersPending(false);
          return;
        }

        const employees = await listTipClaimEmployees(activeOrganization.id);
        if (cancelled) return;

        setMembers(
          employees.map((employee) => ({
            id: employee.userId,
            name: employee.name,
            email: employee.email,
            bartenderEnabled: employee.bartenderEnabled,
            managerEnabled: employee.managerEnabled,
            barbackEnabled: employee.barbackEnabled,
            doorEnabled: employee.doorEnabled,
          })),
        );
        setAreMembersPending(false);
      } catch (error) {
        if (cancelled) return;

        setMembers([]);
        setAccessAllowed(false);
        setMembersError(
          error instanceof Error
            ? error.message
            : "Unable to load Tip Pool Calculator.",
        );
        setAreMembersPending(false);
      }
    }

    void loadTipDivvy();

    return () => {
      cancelled = true;
    };
  }, [activeOrganization?.id, session]);

  if (isPending) {
    return <TipDivvySkeleton />;
  }

  if (!session) {
    return null;
  }

  const organizationList = organizations ?? [];
  const organizationsPending =
    areOrganizationsPending || isActiveOrganizationPending;

  const organizationSelector = (
    <Card>
      <CardHeader>
        <CardTitle>Organization</CardTitle>
        <CardDescription>Choose the organization for this tip pool.</CardDescription>
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

  if (activeOrganization?.id && accessAllowed === false && !areMembersPending) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6 lg:p-8">
        {organizationSelector}
        <Card>
          <CardHeader>
            <CardTitle>Tip Calculator access required</CardTitle>
            <CardDescription>
              Your account does not have access to the Tip Pool Calculator for this organization.
            </CardDescription>
          </CardHeader>
          {membersError ? (
            <CardContent>
              <p className="text-sm text-destructive">{membersError}</p>
            </CardContent>
          ) : null}
        </Card>
      </main>
    );
  }

  if (activeOrganization?.id && accessAllowed === null) {
    return <TipDivvySkeleton />;
  }

  return (
    <TipDivvyCalculator
      organizationId={activeOrganization?.id}
      organizationName={activeOrganization?.name}
      organizationSelector={organizationSelector}
      members={members}
      membersPending={areMembersPending}
      membersError={membersError}
    />
  );
}
