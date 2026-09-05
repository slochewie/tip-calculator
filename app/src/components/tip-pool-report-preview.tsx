import { useEffect, useMemo, useState } from "react";
import { Pie, PieChart } from "recharts";

import { Button } from "#/components/ui/button.tsx";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "#/components/ui/chart.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog.tsx";
import { Field, FieldDescription, FieldLabel } from "#/components/ui/field.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Separator } from "#/components/ui/separator.tsx";
import { Slider } from "#/components/ui/slider.tsx";
import type { TipPoolAllocationMode } from "#/components/tip-pool-allocation-settings.tsx";
import {
  allocateTipClaims,
  TIP_CLAIM_ROLE_LABELS,
  TIP_CLAIM_ROLE_ORDER,
  type TipClaimRoleKey,
  type TipClaimRoleState,
  type TipClaimWeightState,
} from "#/lib/tip-claim-allocation.ts";
import type { TipPoolPercentageTargets } from "#/lib/tip-pool-percentage-allocation.ts";

export type TipPoolPreviewStaff = {
  userId: string;
  name: string;
  email: string;
  role: TipClaimRoleKey;
};

type TipPoolReportPreviewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalTipsCents: number;
  staff: TipPoolPreviewStaff[];
  weights: TipClaimWeightState;
  allocationMode: TipPoolAllocationMode;
  percentageTargets: TipPoolPercentageTargets;
  savePending?: boolean;
  editingShiftId?: string | null;
  onApply: (weights: TipClaimWeightState) => void;
  onSave: (weights: TipClaimWeightState) => void | Promise<void>;
};

type PreviewAllocation = TipPoolPreviewStaff & {
  cents: number;
};

const ROLE_COLORS: Record<TipClaimRoleKey, string> = {
  bartender: "var(--color-bartender)",
  manager: "var(--color-manager)",
  barback: "var(--color-barback)",
  door: "var(--color-door)",
};

const chartConfig = {
  bartender: { label: "Bartender", color: "var(--chart-1)" },
  manager: { label: "Manager", color: "var(--chart-2)" },
  barback: { label: "Barback", color: "var(--chart-3)" },
  door: { label: "Door", color: "var(--chart-4)" },
} satisfies ChartConfig;

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function clampWeight(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(10, Math.max(0, Math.round(value * 10) / 10));
}

function getRoleCounts(staff: TipPoolPreviewStaff[]): TipClaimRoleState {
  return staff.reduce<TipClaimRoleState>(
    (counts, person) => ({ ...counts, [person.role]: counts[person.role] + 1 }),
    { bartender: 0, manager: 0, barback: 0, door: 0 },
  );
}

function allocatePreview(
  totalCents: number,
  staff: TipPoolPreviewStaff[],
  weights: TipClaimWeightState,
): PreviewAllocation[] {
  const allocations = allocateTipClaims(totalCents, getRoleCounts(staff), weights);
  const allocationByRoleAndPerson = new Map(
    allocations.map((allocation) => [
      `${allocation.role}:${allocation.person}`,
      allocation.cents,
    ]),
  );

  return TIP_CLAIM_ROLE_ORDER.flatMap((role) =>
    staff
      .filter((person) => person.role === role)
      .map((person, index) => ({
        ...person,
        cents: allocationByRoleAndPerson.get(`${role}:${index + 1}`) ?? 0,
      })),
  );
}

function formatPercentage(value: number) {
  return `${Number(value.toFixed(1))}%`;
}

export function TipPoolReportPreview({
  open,
  onOpenChange,
  totalTipsCents,
  staff,
  weights,
  allocationMode,
  percentageTargets,
  savePending = false,
  editingShiftId = null,
  onApply,
  onSave,
}: TipPoolReportPreviewProps) {
  const [previewWeights, setPreviewWeights] = useState<TipClaimWeightState>(weights);
  const [initialWeights, setInitialWeights] = useState<TipClaimWeightState>(weights);

  useEffect(() => {
    if (!open) return;
    setPreviewWeights(weights);
    setInitialWeights(weights);
  }, [open, weights]);

  const activeRoles = TIP_CLAIM_ROLE_ORDER.filter((role) =>
    staff.some((person) => person.role === role),
  );
  const roleCounts = useMemo(() => getRoleCounts(staff), [staff]);
  const allocations = useMemo(
    () => allocatePreview(totalTipsCents, staff, previewWeights),
    [previewWeights, staff, totalTipsCents],
  );
  const roleTotals = useMemo(
    () =>
      activeRoles.map((role) => {
        const cents = allocations
          .filter((allocation) => allocation.role === role)
          .reduce((sum, allocation) => sum + allocation.cents, 0);
        return {
          role,
          cents,
          percentage: totalTipsCents > 0 ? (cents / totalTipsCents) * 100 : 0,
        };
      }),
    [activeRoles, allocations, totalTipsCents],
  );
  const chartData = allocations
    .filter((allocation) => allocation.cents > 0)
    .map((allocation) => ({
      ...allocation,
      label: allocation.name || allocation.email,
      percentage:
        totalTipsCents > 0 ? (allocation.cents / totalTipsCents) * 100 : 0,
      fill: ROLE_COLORS[allocation.role],
    }));
  const allocatedCents = allocations.reduce(
    (sum, allocation) => sum + allocation.cents,
    0,
  );
  const totalWeight = TIP_CLAIM_ROLE_ORDER.reduce(
    (sum, role) => sum + roleCounts[role] * Math.max(0, previewWeights[role]),
    0,
  );
  const hasAllocation = totalTipsCents === 0 || allocatedCents === totalTipsCents;
  const hasWeightChanges = TIP_CLAIM_ROLE_ORDER.some(
    (role) => previewWeights[role] !== initialWeights[role],
  );
  const canEditWeights = allocationMode === "weights";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100%-2rem)] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Preview Tip Pool report</DialogTitle>
          <DialogDescription>
            Review the tip distribution before {editingShiftId ? "saving the correction" : "saving the report"}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Tip pool", currency.format(totalTipsCents / 100)],
            ["Allocated", currency.format(allocatedCents / 100)],
            ["Staff", staff.length.toString()],
            ["Weight units", Number(totalWeight.toFixed(1)).toString()],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1 rounded-lg border p-3">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="font-semibold tabular-nums">{value}</span>
            </div>
          ))}
        </div>

        <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)] xl:gap-6">
          <div className="flex min-w-0 flex-col gap-2 xl:gap-4">
            <div className="relative min-h-0">
              {chartData.length > 0 ? (
                <ChartContainer
                  config={chartConfig}
                  className="mx-auto aspect-square h-[min(54vw,22rem)] max-h-88 w-auto max-w-full"
                  initialDimension={{ width: 320, height: 320 }}
                >
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          hideLabel
                          formatter={(value, _name, item) => {
                            const payload = item.payload as (typeof chartData)[number];
                            return (
                              <div className="flex min-w-44 items-center justify-between gap-4">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-medium">{payload.label}</span>
                                  <span className="text-muted-foreground">
                                    {TIP_CLAIM_ROLE_LABELS[payload.role]}
                                  </span>
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className="font-mono font-medium tabular-nums">
                                    {currency.format(Number(value) / 100)}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatPercentage(payload.percentage)}
                                  </span>
                                </div>
                              </div>
                            );
                          }}
                        />
                      }
                    />
                    <Pie
                      data={chartData}
                      dataKey="cents"
                      nameKey="label"
                      innerRadius="54%"
                      outerRadius="82%"
                      paddingAngle={0}
                      stroke="var(--background)"
                      strokeWidth={2}
                      label={({ percentage }) =>
                        percentage >= 4 ? formatPercentage(percentage) : ""
                      }
                      labelLine={false}
                    />
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="flex min-h-72 items-center justify-center rounded-lg border border-dashed text-center text-sm text-muted-foreground">
                  Add staff with an active weight to preview the distribution.
                </div>
              )}
              {chartData.length > 0 ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-0.5 text-center">
                    <span className="text-xs text-muted-foreground">Tip pool</span>
                    <span className="text-xl font-semibold tabular-nums">
                      {currency.format(totalTipsCents / 100)}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-2">
              {roleTotals.map(({ role, cents, percentage }) => (
                <div
                  key={role}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-3"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: ROLE_COLORS[role] }}
                    />
                    <span className="truncate font-medium">
                      {TIP_CLAIM_ROLE_LABELS[role]}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2 text-right tabular-nums">
                    <span className="font-semibold">{formatPercentage(percentage)}</span>
                    <span className="text-muted-foreground">
                      {currency.format(cents / 100)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <div>
              <h3 className="font-medium">
                {canEditWeights ? "Role weights" : "Percentage targets"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {canEditWeights
                  ? "Adjust active role weights here. The preview updates immediately."
                  : "Percentage mode keeps its calculated weights locked. Target and actual shares are shown below."}
              </p>
            </div>
            <Separator />

            {canEditWeights ? (
              <div className="flex flex-col gap-5">
                {activeRoles.map((role) => {
                  const roleCount = roleCounts[role];
                  const roleTotal = roleTotals.find((item) => item.role === role)?.cents ?? 0;
                  return (
                    <Field key={role}>
                      <div className="flex items-center justify-between gap-3">
                        <FieldLabel htmlFor={`pool-preview-weight-${role}`}>
                          {TIP_CLAIM_ROLE_LABELS[role]}
                        </FieldLabel>
                        <Input
                          id={`pool-preview-weight-${role}`}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={10}
                          step={0.1}
                          value={previewWeights[role]}
                          className="w-20 text-right tabular-nums"
                          onChange={(event) => {
                            const value = event.currentTarget.valueAsNumber;
                            if (Number.isNaN(value)) return;
                            setPreviewWeights((current) => ({
                              ...current,
                              [role]: clampWeight(value),
                            }));
                          }}
                        />
                      </div>
                      <Slider
                        aria-label={`${TIP_CLAIM_ROLE_LABELS[role]} weight`}
                        min={0}
                        max={10}
                        step={0.1}
                        value={[previewWeights[role]]}
                        onValueChange={(value) => {
                          const nextValue = Array.isArray(value) ? value[0] : value;
                          setPreviewWeights((current) => ({
                            ...current,
                            [role]: clampWeight(Number(nextValue)),
                          }));
                        }}
                      />
                      <FieldDescription>
                        {roleCount} {roleCount === 1 ? "employee" : "employees"} · {currency.format(roleTotal / 100)} total
                      </FieldDescription>
                    </Field>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {activeRoles.map((role) => {
                  const roleTotal = roleTotals.find((item) => item.role === role);
                  return (
                    <div key={role} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{TIP_CLAIM_ROLE_LABELS[role]}</span>
                        <span className="tabular-nums">
                          Target {formatPercentage(percentageTargets[role])}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Actual {formatPercentage(roleTotal?.percentage ?? 0)} · {previewWeights[role].toFixed(1)}× weight
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {!hasAllocation ? (
              <p className="text-sm text-destructive">
                The active weights must allocate the full tip pool before saving.
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          {canEditWeights ? (
            <Button
              type="button"
              variant="outline"
              disabled={savePending}
              onClick={() => setPreviewWeights(initialWeights)}
            >
              Reset weights
            </Button>
          ) : (
            <div />
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={savePending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            {canEditWeights ? (
              <Button
                type="button"
                variant="secondary"
                disabled={
                  savePending ||
                  !hasWeightChanges ||
                  !hasAllocation ||
                  staff.length === 0
                }
                onClick={() => {
                  onApply(previewWeights);
                  onOpenChange(false);
                }}
              >
                Apply to draft
              </Button>
            ) : null}
            <Button
              type="button"
              disabled={savePending || !hasAllocation || staff.length === 0}
              onClick={() => void onSave(previewWeights)}
            >
              {savePending
                ? "Saving…"
                : editingShiftId
                  ? "Save correction"
                  : "Save report"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
