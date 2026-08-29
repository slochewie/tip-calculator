import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2Icon, LogOutIcon, UserRoundIcon } from "lucide-react";

import {
  TipClaimCalculator,
  type TipClaimMember,
} from "#/components/tip-claim-calculator.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
  Card,
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

export const Route = createFileRoute("/app")({
  component: AuthenticatedTipCalculator,
});

type OrganizationMember = {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

function readOrganizationMembers(value: unknown): TipClaimMember[] {
  if (!value || typeof value !== "object" || !("members" in value)) {
    return [];
  }

  const members = (value as { members?: unknown }).members;

  if (!Array.isArray(members)) {
    return [];
  }

  return members.flatMap((member) => {
    if (!member || typeof member !== "object") {
      return [];
    }

    const candidate = member as Partial<OrganizationMember>;

    if (
      typeof candidate.id !== "string" ||
      !candidate.user ||
      typeof candidate.user.id !== "string" ||
      typeof candidate.user.name !== "string" ||
      typeof candidate.user.email !== "string"
    ) {
      return [];
    }

    return [
      {
        id: candidate.user.id,
        name: candidate.user.name,
        email: candidate.user.email,
      },
    ];
  });
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

      const result = await authClient.organization.listMembers({
        query: {
          organizationId: activeOrganization.id,
          limit: 100,
          offset: 0,
          sortBy: "createdAt",
          sortDirection: "asc",
        },
      });

      if (cancelled) {
        return;
      }

      if (result.error) {
        setMembers([]);
        setMembersError(result.error.message ?? "Unable to load members.");
        setAreMembersPending(false);
        return;
      }

      setMembers(readOrganizationMembers(result.data));
      setAreMembersPending(false);
    }

    void loadMembers();

    return () => {
      cancelled = true;
    };
  }, [activeOrganization?.id, session]);

  if (isPending || !session) {
    return (
      <main className="mx-auto flex w-full max-w-md p-4 md:p-6 lg:p-8">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Tip Claim Calculator</CardTitle>
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
      <header className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 pt-4 md:flex-row md:items-center md:justify-between md:px-6 md:pt-6 lg:px-8 lg:pt-8">
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
            <Link to="/">Public calculator</Link>
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

      <TipClaimCalculator
        organizationId={activeOrganization?.id}
        organizationName={activeOrganization?.name}
        members={members}
        membersPending={areMembersPending}
        membersError={membersError}
      />
    </>
  );
}
