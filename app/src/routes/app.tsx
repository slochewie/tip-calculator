import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LogOutIcon, UserRoundIcon } from "lucide-react";

import { TipClaimCalculator } from "#/components/tip-claim-calculator.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card.tsx";
import { authBaseURL, authClient } from "#/lib/auth-client.ts";

export const Route = createFileRoute("/app")({
  component: AuthenticatedTipCalculator,
});

function AuthenticatedTipCalculator() {
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending || session) {
      return;
    }

    const redirectTo = encodeURIComponent(window.location.href);
    const signInURL = `${authBaseURL.replace(/\/$/, "")}/auth/sign-in?redirectTo=${redirectTo}`;
    window.location.replace(signInURL);
  }, [isPending, session]);

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

  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 pt-4 md:flex-row md:items-center md:justify-between md:px-6 md:pt-6 lg:px-8 lg:pt-8">
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

      <TipClaimCalculator />
    </>
  );
}
