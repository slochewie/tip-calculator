import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import {
  TipClaimCalculator,
  type TipClaimMember,
} from "#/components/tip-claim-calculator.tsx";
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

export const Route = createFileRoute("/app")({
  component: AuthenticatedTipCalculator,
});

type EligibleOrganizationMember = {
  memberId: string;
  userId: string;
  name: string;
  email: string;
};

function readEligibleMembers(value: unknown): TipClaimMember[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((member) => {
    if (!member || typeof member !== "object") {
      return [];
    }

    const candidate = member as Partial<EligibleOrganizationMember>;

    if (
      typeof candidate.userId !== "string" ||
      typeof candidate.name !== "string" ||
      typeof candidate.email !== "string"
    ) {
      return [];
    }

    return [
      {
        id: candidate.userId,
        name: candidate.name,
        email: candidate.email,
      },
    ];
  });
}

function CalculatorSessionSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-56" />
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
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-px w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-36" />
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-56 max-w-full" />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function AuthenticatedTipCalculator() {
  const { data: session, isPending } = authClient.useSession();
  const {
    data: organizations,
    isPending: areOrganizationsPending,
  } = authClient.useListOrganizations();
  const {
    data: activeOrganization,
    isPending: isActiveOrganizationPending,
  } = authClient.useActiveOrganization();
  const [members, setMembers] = useState<TipClaimMember[]>([]);
  const [areMembersPending, setAreMembersPending] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);

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
      setMembers([]);
      setMembersError(null);
      setAreMembersPending(false);
      return;
    }

    let cancelled = false;

    async function loadMembers() {
      setAreMembersPending(true);
      setMembersError(null);

      try {
        const url = new URL(
          "/api/auth/organization-member-status/eligible",
          authBaseURL,
        );

        url.searchParams.set("organizationId", activeOrganization.id);

        const response = await fetch(url, {
          credentials: "include",
        });

        const result = await response.json();

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          throw new Error(
            typeof result?.error === "string"
              ? result.error
              : "Unable to load members.",
          );
        }

        setMembers(readEligibleMembers(result?.members));
        setAreMembersPending(false);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setMembers([]);
        setMembersError(
          error instanceof Error ? error.message : "Unable to load members.",
        );
        setAreMembersPending(false);
      }
    }

    void loadMembers();

    return () => {
      cancelled = true;
    };
  }, [activeOrganization?.id, session]);

  if (isPending) {
    return <CalculatorSessionSkeleton />;
  }

  if (!session) {
    return null;
  }

  const organizationList = organizations ?? [];
  const organizationsPending =
    areOrganizationsPending || isActiveOrganizationPending;

  return (
    <TipClaimCalculator
      organizationId={activeOrganization?.id}
      organizationName={activeOrganization?.name}
      organizationSelector={
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
            <CardDescription>
              Choose the organization for this shift.
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
      }
      members={members}
      membersPending={areMembersPending}
      membersError={membersError}
    />
  );
}
