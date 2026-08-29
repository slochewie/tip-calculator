import { useState } from "react";
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
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "#/components/ui/field.tsx";
import { Input } from "#/components/ui/input.tsx";
import { authClient } from "#/lib/auth-client.ts";

export const Route = createFileRoute("/app")({
  component: AuthenticatedTipCalculator,
});

function AuthenticatedTipCalculator() {
  const { data: session, isPending } = authClient.useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSigningIn(true);

    const result = await authClient.signIn.email({
      email,
      password,
    });

    if (result.error) {
      setErrorMessage(result.error.message ?? "Unable to sign in.");
    }

    setIsSigningIn(false);
  }

  if (isPending) {
    return (
      <main className="mx-auto flex w-full max-w-md p-4 md:p-6 lg:p-8">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Tip Claim Calculator</CardTitle>
            <CardDescription>Checking your session…</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="mx-auto flex w-full max-w-md p-4 md:p-6 lg:p-8">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Use your NiteOwl account to access the authenticated Tip Claim
              Calculator.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSignIn}>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  {errorMessage ? (
                    <FieldDescription>{errorMessage}</FieldDescription>
                  ) : null}
                </Field>
              </FieldGroup>
            </CardContent>

            <CardFooter className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isSigningIn}>
                {isSigningIn ? "Signing in…" : "Sign in"}
              </Button>
              <Button variant="outline" asChild>
                <Link to="/">Public calculator</Link>
              </Button>
            </CardFooter>
          </form>
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
