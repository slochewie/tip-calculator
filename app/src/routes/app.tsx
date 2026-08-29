import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "#/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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

    const redirectTo = window.location.href;
    const signInURL = new URL("/auth/sign-in", authBaseURL);
    signInURL.searchParams.set("redirectTo", redirectTo);
    window.location.replace(signInURL.toString());
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
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Authenticated Tip Claim Calculator</CardTitle>
          <CardDescription>
            Signed in as {session.user.name || session.user.email}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Authentication is connected. The next step is to place the existing
            calculator UI behind this session gate without changing the public
            calculator at /.
          </p>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => authClient.signOut()}>
            Sign out
          </Button>
          <Button variant="outline" asChild>
            <Link to="/">Public calculator</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
