import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { TipWeightPresetConfigurator } from "#/components/tip-weight-preset-configurator.tsx";
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

export const Route = createFileRoute("/weight-presets")({
  head: () => ({ meta: [{ title: "Weight Presets" }] }),
  component: WeightPresetsRoute,
});

function WeightPresetSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <Skeleton className="h-[38rem] w-full rounded-xl" />
        <Skeleton className="h-[32rem] w-full rounded-xl" />
      </div>
    </main>
  );
}

function WeightPresetsRoute() {
  const { data: session, isPending } = authClient.useSession();
  const { data: organizations, isPending: areOrganizationsPending } =
    authClient.useListOrganizations();
  const { data: activeOrganization, isPending: isActiveOrganizationPending } =
    authClient.useActiveOrganization();

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

  if (
    isPending ||
    areOrganizationsPending ||
    isActiveOrganizationPending ||
    (!activeOrganization && organizations?.length === 1)
  ) {
    return <WeightPresetSkeleton />;
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
          Choose the organization whose weight presets you want to manage.
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
        {organizationSelector}
      </main>
    );
  }

  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-4 pt-4 md:px-6 md:pt-6 lg:px-8 lg:pt-8">
        {organizationSelector}
      </div>
      <TipWeightPresetConfigurator
        key={activeOrganization.id}
        organizationId={activeOrganization.id}
        organizationName={activeOrganization.name}
      />
    </>
  );
}
