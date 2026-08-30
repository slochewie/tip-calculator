import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2Icon,
  CalculatorIcon,
  LogOutIcon,
  ReceiptTextIcon,
} from "lucide-react";

import {
  TipClaimCalculator,
  type TipClaimMember,
} from "#/components/tip-claim-calculator.tsx";
import { ThemeSwitcher } from "#/components/theme-switcher.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu.tsx";
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

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
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
  const organizationList = organizations ?? [];
  const organizationsPending =
    areOrganizationsPending || isActiveOrganizationPending;
  const avatarLabel = getInitials(displayName);

  return (
    <>
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 px-4 py-3 md:px-6 lg:flex-nowrap lg:px-8">
          <div className="flex min-w-0 shrink-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-card text-primary shadow-sm">
              <CalculatorIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Tip Claim Calculator</p>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                NiteOwl.dev
              </p>
            </div>
          </div>

          <nav
            className="order-3 flex w-full min-w-0 flex-wrap items-center gap-2 lg:order-none lg:ml-auto lg:w-auto lg:flex-nowrap"
            aria-label="Tip claim navigation"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2 lg:flex-none">
              <Building2Icon className="size-4 shrink-0 text-muted-foreground" />
              <Select
                value={activeOrganization?.id}
                disabled={organizationsPending || organizationList.length === 0}
                onValueChange={(organizationId) => {
                  void authClient.organization.setActive({ organizationId });
                }}
              >
                <SelectTrigger className="min-w-0 flex-1 lg:w-64 lg:flex-none">
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

            <Button variant="outline" asChild>
              <Link to="/reports">
                <ReceiptTextIcon data-icon="inline-start" />
                Reports
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/">Public calculator</Link>
            </Button>
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
            <ThemeSwitcher inline />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex size-9 items-center justify-center overflow-hidden rounded-full border bg-muted text-xs font-medium text-muted-foreground shadow-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Open account menu for ${displayName}`}
                >
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    avatarLabel
                  )}
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted text-xs font-medium text-muted-foreground">
                      {session.user.image ? (
                        <img
                          src={session.user.image}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        avatarLabel
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{displayName}</p>
                      {session.user.email ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {session.user.email}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void authClient.signOut()}>
                  <LogOutIcon />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
