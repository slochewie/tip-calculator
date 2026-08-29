import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { TipClaimCalculator } from "#/components/tip-claim-calculator.tsx";
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

  return (
    <>
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 pt-4 md:px-6 md:pt-6 lg:px-8 lg:pt-8">
        <p className="text-sm text-muted-foreground">
          Signed in as {session.user.name || session.user.email}.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/">Public calculator</Link>
          </Button>
          <Button type="button" onClick={() => authClient.signOut()}>
            Sign out
          </Button>
        </div>
      </div>

      <TipClaimCalculator />
    </>
  );
}
