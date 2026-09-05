import { useEffect, useMemo, useRef } from "react";

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
  DEFAULT_TIP_CLAIM_WEIGHTS,
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

function allWeightsZero(weights: TipClaimWeightState) {
  return ROLE_ORDER.every((role) => Math.abs(weights[role]) < 0.0001);
}

function safeManualWeights(weights: TipClaimWeightState): TipClaimWeightState {
  return allWeightsZero(weights)
    ? { ...DEFAULT_TIP_CLAIM_WEIGHTS }
    : { ...weights };
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
  const manualWeightsRef = useRef<TipClaimWeightState>(safeManualWeights(weights));
  const previousModeRef = useRef<TipPoolAllocationMode>(mode);

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
  const activeStaffCount = ROLE_ORDER.reduce((sum, role) => sum + staff[role], 0);
  const inactiveTargetRoles = ROLE_ORDER.filter(
    (role) => staff[role] === 0 && targets[role] > 0,
  );
  const canOptimize =
    mode === "percentages" &&
    targetTotalIsValid &&
    activeStaffCount > 0 &&
    inactiveTargetRoles.length === 0;

  useEffect(() => {
    const previousMode = previousModeRef.current;

    if (previousMode !== mode) {
      if (previousMode === "weights" && mode === "percentages") {
        manualWeightsRef.current = safeManualWeights(weights);
      }

      if (previousMode === "percentages" && mode === "weights") {
        const restored = safeManualWeights(manualWeightsRef.current);
        const unchanged = ROLE_ORDER.every(
          (role) => Math.abs(weights[role] - restored[role]) < 0.0001,
        );
        if (!unchanged) setWeights(restored);
      }

      previousModeRef.current = mode;
    }
  }, [mode, setWeights, weights]);

  useEffect(() => {
    if (mode !== "weights" || !allWeightsZero(weights)) return;

    const restored = safeManualWeights(manualWeightsRef.current);
    manualWeightsRef.current = restored;
    setWeights(restored);
  }, [mode, setWeights, weights]);

  useEffect(() => {
    if (!canOptimize) return;

    const unchanged = ROLE_ORDER.every(
      (role) => Math.abs(weights[role] - optimizedWeights[role]) < 0.0001,
    );

    if (!unchanged) setWeights(optimizedWeights);
  }, [canOptimize, optimizedWeights, setWeights, weights]);

  function updateWeight(role: TipClaimRoleKey, value: string) {
    const nextWeights = {
      ...weights,
      [role]: clampWeight(Number(value)),
    };
    manualWeightsRef.current = safeManualWeights(nextWeights);
    setWeights(nextWeights);
  }

  function updateTarget(role: TipClaimRoleKey, value: string) {
    setTargets({
      ...targets,
      [role]: clampPercentage(Number(value)),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-fit rounded-lg border bg-muted p-1">
        <Button
          type="button"
          size="sm"
          variant={mode === "weights" ? "default" : "ghost"}
          aria-pressed={mode === "weights"}
          onClick={() => setMode("weights")}
        >
          Weights
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "percentages" ? "default" : "ghost"}
          aria-pressed={mode === "percentages"}
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
            Enter a target percentage for each role. The calculator adjusts
            tenth-step weights to get the actual role percentages as close to
            those targets as possible.
          </p>

          <FieldGroup>
            {ROLE_ORDER.map((role) => (
              <Field key={role} orientation="responsive">
                <div>
                  <FieldLabel htmlFor={`pool-target-${role}`}>
                    {TIP_CLAIM_ROLE_LABELS[role]} target
                  </FieldLabel>
                  <FieldDescription>
                    Target {formatPercentage(targets[role])} · Actual {formatPercentage(actualPercentages[role])} · {weights[role].toFixed(1)}× weight
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
                    aria-label={`${TIP_CLAIM_ROLE_LABELS[role]} target percentage`}
                    value={targets[role]}
                    onChange={(event) => updateTarget(role, event.target.value)}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>% target</InputGroupText>
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
            <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
              {ROLE_ORDER.map((role) => (
                <span key={role}>
                  {TIP_CLAIM_ROLE_LABELS[role]}: target {formatPercentage(targets[role])} → actual {formatPercentage(actualPercentages[role])} ({weights[role].toFixed(1)}×)
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
              Add on-duty staff for every role with a percentage target, or set
              that role&apos;s target to 0%: {inactiveTargetRoles
                .map((role) => TIP_CLAIM_ROLE_LABELS[role])
                .join(", ")}.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
