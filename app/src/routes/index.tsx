import { createFileRoute } from "@tanstack/react-router";

import { TipClaimCalculator } from "#/components/tip-claim-calculator.tsx";

export const Route = createFileRoute("/")({
  component: TipClaimCalculator,
});
