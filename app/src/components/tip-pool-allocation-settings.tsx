import { useEffect, useMemo } from "react";

import { Button } from "#/components/ui/button.tsx";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "#/components/ui/field.tsx";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "#/components/ui/input-group.tsx";
import {
  TIP_CLAIM_ROLE_LABELS,
  type TipClaimRoleKey,
  type TipClaimRoleState,
  type TipClaimWeightState,
} from "#/lib/tip-claim-allocation.ts";
import {
  getTipPoolActualPercentages,
  optimizeTipPoolWeightsForPercentages,
  type TipPoolPercentageTargets,
} from "#/lib/tip-pool-percentage-allocation.ts";

export type TipPoolAllocationMode = "weights" | "percentages";

const ROLE_ORDER: TipClaimRoleKey[] = [
  "manager",
  "bartender",
  "barback",
  "door",
];

function clampWeight(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(10, Math.max(0, Math.round(value * 10) / 10));
}

function clampPercentage(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value * 10) / 10));
}

function formatPercentage(value: number) {
  return `${Number(value.toFixed(1))}%`;
}

type TipPoolAllocationSettingsProps = {
  staff: TipClaimRoleState;
  weights: TipClaimWeightState;
  setWeights: (weights: TipClaimWeightState) => void;
  mode: TipPoolAllocationMode;
  setMode: (mode: TipPoolAllocationMode) => void;
  targets: TipPoolPercentageTargets;
  setTargets: (targets: TipPoolPercentageTargets) => void;
};

export function TipPoolAllocationSettings({
  staff,
  weights,
  setWeights,
  mode,
  setMode,
  targets,
  setTargets,
}: TipPoolAllocationSettingsProps) {
  const optimizedWeights = useMemo(
    () => optimizeTipPoolWeightsForPercentages(staff, targets),
    [staff, targets],
  );
  const actualPercentages = useMemo(
    () => getTipPoolActualPercentages(staff, weights),
    [staff, weights],
  );
  const targetTotal = ROLE_ORDER.reduce((sum, role) => sum + targets[role], 0);
  const targetTotalIsValid = Math.abs(targetTotal - 100) < 0.05;
  const inactiveTargetRoles = ROLE_ORDER.filter(
    (role) => staff[role] === 0 && targets[role] > 0,
  );

  useEffect(() => {
    if (mode !== "percentages" || !targetTotalIsValid) return;

    const unchanged = ROLE_ORDER.every(
      (role) => Math.abs(weights[role] - optimizedWeights[role]) < 0.0001,
    );

    if (!unchanged) setWeights(optimizedWeights);
  }, [mode, optimizedWeights, setWeights, targetTotalIsValid, weights]);

  function updateWeight(role: TipClaimRoleKey, value: string) {
    setWeights({
      ...weights,
      [role]: clampWeight(Number(value)),
    });
  }

  function updateTarget(role: TipClaimRoleKey, value: string) {
    setTargets({
      ...targets,
      [role]: clampPercentage(Number(value)),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-fit rounded-lg bg-muted p-1">
        <Button
          type="button"
          size="sm"
          variant={mode === "weights" ? "secondary" : "ghost"}
          onClick={() => setMode("weights")}
        >
          Weights
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "percentages" ? "secondary" : "ghost"}
          onClick={() => setMode("percentages")}
        >
          Percentages
        </Button>
      </div>

      {mode === "weights" ? (
        <>
          <p className="text-sm text-muted-foreground">
            Higher weights receive a larger share. Defaults are Manager 5,
            Bartender 5, Barback 3, Door 1.
          </p>
          <FieldGroup>
            {ROLE_ORDER.map((role) => (
              <Field key={role} orientation="responsive">
                <FieldLabel htmlFor={`pool-weight-${role}`}>
                  {TIP_CLAIM_ROLE_LABELS[role]} weight
                </FieldLabel>
                <InputGroup className="sm:max-w-32">
                  <InputGroupInput
                    id={`pool-weight-${role}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="10"
                    step="0.1"
                    value={weights[role]}
                    onChange={(event) => updateWeight(role, event.target.value)}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>×</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            ))}
          </FieldGroup>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Set each role&apos;s target share. The calculator converts those
            targets into the closest tenth-step weights and still uses the
            normal weighted allocation engine.
          </p>

          <FieldGroup>
            {ROLE_ORDER.map((role) => (
              <Field key={role} orientation="responsive">
                <div>
                  <FieldLabel htmlFor={`pool-target-${role}`}>
                    {TIP_CLAIM_ROLE_LABELS[role]} target
                  </FieldLabel>
                  <FieldDescription>
                    {staff[role]} {staff[role] === 1 ? "person" : "people"} · actual{" "}
                    {formatPercentage(actualPercentages[role])}
                  </FieldDescription>
                </div>
                <InputGroup className="sm:max-w-32">
                  <InputGroupInput
                    id={`pool-target-${role}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="100"
                    step="0.1"
                    value={targets[role]}
                    onChange={(event) => updateTarget(role, event.target.value)}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>%</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            ))}
          </FieldGroup>

          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Target total</span>
              <span className={targetTotalIsValid ? "font-medium" : "font-medium text-destructive"}>
                {formatPercentage(targetTotal)}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {ROLE_ORDER.map((role) => (
                <span key={role}>
                  {TIP_CLAIM_ROLE_LABELS[role]} {weights[role].toFixed(1)}× →{" "}
                  {formatPercentage(actualPercentages[role])}
                </span>
              ))}
            </div>
          </div>

          {!targetTotalIsValid ? (
            <p className="text-sm text-destructive">
              Percentage targets must total 100% before weights are adjusted.
            </p>
          ) : null}

          {inactiveTargetRoles.length > 0 ? (
            <p className="text-sm text-destructive">
              A target is assigned to a role with no on-duty staff: {inactiveTargetRoles
                .map((role) => TIP_CLAIM_ROLE_LABELS[role])
                .join(", ")}.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
