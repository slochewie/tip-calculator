import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronDownIcon, ChevronUpIcon, XIcon } from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";

import { CalculatorTabs } from "#/components/calculator-tabs.tsx";
import { SevenShiftsLogo } from "#/components/seven-shifts-logo.tsx";
import {
  SevenShiftsPresetBuilder,
  type SevenShiftsClaimsSetup,
} from "#/components/seven-shifts-preset-builder.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card.tsx";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "#/components/ui/chart.tsx";
import { Field, FieldDescription, FieldLabel } from "#/components/ui/field.tsx";
import { Input } from "#/components/ui/input.tsx";
import {
  TIP_CLAIM_ROLE_LABELS,
  TIP_CLAIM_ROLE_ORDER,
  type TipClaimRoleKey,
  type TipClaimRoleState,
  type TipClaimWeightState,
} from "#/lib/tip-claim-allocation.ts";
import { saveTipClaimDraft } from "#/lib/tip-claim-draft.ts";
import {
  DEFAULT_TIP_WEIGHT_PRESET_WEIGHTS,
  saveTipStaffingSnapshot,
} from "#/lib/tip-weight-presets.ts";
import { saveTipPoolStaffingDraft } from "#/lib/use-tip-pool-draft.ts";

const ROLE_COLORS: Record<TipClaimRoleKey, string> = {
  bartender: "var(--color-bartender)",
  manager: "var(--color-manager)",
  barback: "var(--color-barback)",
  door: "var(--color-door)",
};

const SCHEDULE_ROLE_ORDER: TipClaimRoleKey[] = [
  "manager",
  "bartender",
  "barback",
  "door",
];

const chartConfig = {
  bartender: { label: "Bartender", color: "var(--chart-1)" },
  manager: { label: "Manager", color: "var(--chart-2)" },
  barback: { label: "Barback", color: "var(--chart-3)" },
  door: { label: "Door", color: "var(--chart-4)" },
} satisfies ChartConfig;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function clampWeight(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(10, Math.max(0, Math.round(value * 10) / 10));
}
function WeightStepper({
  role,
  weight,
  onChange,
}: {
  role: TipClaimRoleKey;
  weight: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-stretch gap-2">
      <div className="relative min-w-0 flex-1">
        <Input
          id={`schedule-weight-${role}`}
          type="number"
          inputMode="decimal"
          min={0}
          max={10}
          step={0.1}
          value={weight}
          className="w-full pr-8 tabular-nums"
          onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 size-7 -translate-y-1/2 text-muted-foreground"
          aria-label={`Clear ${TIP_CLAIM_ROLE_LABELS[role]} weight`}
          onClick={() => onChange(0)}
        >
          <XIcon className="size-3.5" />
        </Button>
      </div>
      <div className="flex shrink-0 overflow-hidden rounded-md border">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10 rounded-none border-r"
          aria-label={`Decrease ${TIP_CLAIM_ROLE_LABELS[role]} weight`}
          onClick={() => onChange(weight - 0.1)}
        >
          <ChevronDownIcon className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10 rounded-none"
          aria-label={`Increase ${TIP_CLAIM_ROLE_LABELS[role]} weight`}
          onClick={() => onChange(weight + 0.1)}
        >
          <ChevronUpIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function SevenShiftsScheduleConfigurator({
  organizationId,
  organizationName,
  organizationSelector,
}: {
  organizationId: string;
  organizationName?: string;
  organizationSelector: ReactNode;
}) {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<TipClaimRoleState>({
    manager: 0,
    bartender: 0,
    barback: 0,
    door: 0,
  });
  const [weights, setWeights] = useState<TipClaimWeightState>({
    ...DEFAULT_TIP_WEIGHT_PRESET_WEIGHTS,
  });
  const [previewAmount, setPreviewAmount] = useState(0);

  const roleData = useMemo(() => {
    const totalUnits = TIP_CLAIM_ROLE_ORDER.reduce(
      (sum, role) => sum + staff[role] * weights[role],
      0,
    );

    return SCHEDULE_ROLE_ORDER.map((role) => {
      const units = staff[role] * weights[role];
      const percentage = totalUnits > 0 ? (units / totalUnits) * 100 : 0;
      const amount = totalUnits > 0 ? (previewAmount * units) / totalUnits : 0;

      return {
        role,
        staff: staff[role],
        weight: weights[role],
        units,
        percentage,
        amount,
        perPersonAmount: staff[role] > 0 ? amount / staff[role] : 0,
        fill: ROLE_COLORS[role],
      };
    });
  }, [previewAmount, staff, weights]);

  const totalStaff = TIP_CLAIM_ROLE_ORDER.reduce(
    (sum, role) => sum + staff[role],
    0,
  );
  const totalWeightUnits = roleData.reduce((sum, item) => sum + item.units, 0);
  const chartData = roleData.flatMap((item) =>
    item.staff > 0 && item.weight > 0
      ? Array.from({ length: item.staff }, (_, segmentIndex) => ({
          role: item.role,
          segmentIndex,
          units: item.weight,
          percentage:
            totalWeightUnits > 0 ? (item.weight / totalWeightUnits) * 100 : 0,
          rolePercentage: item.percentage,
          roleAmount: item.amount,
          personAmount: item.perPersonAmount,
          fill: item.fill,
        }))
      : [],
  );

  async function saveSnapshot(setup: SevenShiftsClaimsSetup) {
    await saveTipStaffingSnapshot(organizationId, {
      name: setup.name,
      registerCount: setup.registerCount,
      claimPercent: 8,
      weights,
      assignments: setup.memberAssignments,
    });
  }

  async function openClaims(setup: SevenShiftsClaimsSetup) {
    await saveSnapshot(setup);
    saveTipClaimDraft(organizationId, {
      claimPercent: "8",
      nextRegisterId: setup.registerCount + 1,
      registers: Array.from({ length: setup.registerCount }, (_, index) => ({
        id: index + 1,
        name: `Register ${index + 1}`,
        sales: "",
      })),
      staff: setup.staff,
      memberAssignments: setup.memberAssignments,
      weights: { ...weights },
      editingShiftId: null,
      editingCompletedAt: null,
    });
    await navigate({ to: "/claims" });
  }

  async function openTips(setup: SevenShiftsClaimsSetup) {
    await saveSnapshot(setup);
    saveTipPoolStaffingDraft(
      organizationId,
      setup.memberAssignments.map(({ userId, role }) => ({ userId, role })),
      weights,
    );
    await navigate({ to: "/tips" });
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6 lg:p-8">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm">
          <SevenShiftsLogo />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              7Shifts Schedule
            </h1>
            <Badge variant="secondary">Live staffing</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Review scheduled staffing, last-minute changes, registers, and role
            weights{organizationName ? ` for ${organizationName}` : ""}.
          </p>
        </div>
      </div>

      <CalculatorTabs />
      {organizationSelector}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <SevenShiftsPresetBuilder
          organizationId={organizationId}
          onApplyClaims={openClaims}
          onApplyTips={openTips}
          onStaffChange={setStaff}
        />

        <Card className="lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle>Distribution preview</CardTitle>
            <CardDescription>
              {totalStaff} staff ·{" "}
              {totalWeightUnits.toLocaleString("en-US", {
                maximumFractionDigits: 1,
              })}{" "}
              active weight units
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="schedule-preview-amount">
                Preview amount
              </FieldLabel>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="schedule-preview-amount"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.01}
                  value={previewAmount || ""}
                  placeholder="0.00"
                  className="pl-7 pr-10 tabular-nums"
                  onChange={(event) => {
                    const value = event.currentTarget.valueAsNumber;
                    setPreviewAmount(
                      Number.isFinite(value) ? Math.max(0, value) : 0,
                    );
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted-foreground"
                  aria-label="Clear preview amount"
                  onClick={() => setPreviewAmount(0)}
                >
                  <XIcon className="size-4" />
                </Button>
              </div>
              <FieldDescription>
                Enter combined sales or pooled tips. This preview is never saved.
              </FieldDescription>
            </Field>

            <div className="relative min-h-0 overflow-visible px-2">
              {chartData.length > 0 ? (
                <ChartContainer
                  config={chartConfig}
                  className="mx-auto aspect-square h-[min(56vw,20rem)] max-h-80 w-auto max-w-full overflow-visible"
                  initialDimension={{ width: 300, height: 300 }}
                >
                  <PieChart margin={{ top: 16, right: 24, bottom: 16, left: 24 }}>
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          hideLabel
                          formatter={(_value, _name, item) => {
                            const payload = item.payload as (typeof chartData)[number];
                            return (
                              <div className="flex min-w-48 items-center justify-between gap-4">
                                <span>
                                  {TIP_CLAIM_ROLE_LABELS[payload.role]}
                                  {staff[payload.role] > 1
                                    ? ` ${payload.segmentIndex + 1}`
                                    : ""}
                                </span>
                                <span className="text-right font-mono font-medium tabular-nums">
                                  {previewAmount > 0
                                    ? currencyFormatter.format(payload.personAmount)
                                    : `${payload.percentage.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`}
                                </span>
                              </div>
                            );
                          }}
                        />
                      }
                    />
                    <Pie
                      data={chartData}
                      dataKey="units"
                      nameKey="role"
                      innerRadius="48%"
                      outerRadius="68%"
                      paddingAngle={0}
                      label={({ segmentIndex, rolePercentage, roleAmount }) =>
                        segmentIndex === 0 && rolePercentage >= 4
                          ? previewAmount > 0
                            ? currencyFormatter.format(roleAmount)
                            : `${rolePercentage.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`
                          : ""
                      }
                      labelLine={false}
                    >
                      {chartData.map((entry) => (
                        <Cell
                          key={`${entry.role}-${entry.segmentIndex}`}
                          fill={entry.fill}
                          stroke="var(--background)"
                          strokeWidth={entry.segmentIndex === 0 ? 2 : 1}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="flex min-h-72 items-center justify-center rounded-lg border border-dashed px-6 text-center text-sm text-muted-foreground">
                  Select a scheduled shift to preview its distribution.
                </div>
              )}
              {chartData.length > 0 ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-0.5 text-center">
                    <span className="text-xs text-muted-foreground">
                      {previewAmount > 0 ? "Total" : "Staff"}
                    </span>
                    <span className="text-xl font-semibold tabular-nums">
                      {previewAmount > 0
                        ? currencyFormatter.format(previewAmount)
                        : totalStaff}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {roleData.map((item) => (
                <div key={item.role} className="rounded-lg border p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-sm"
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="font-medium">
                        {TIP_CLAIM_ROLE_LABELS[item.role]}
                      </span>
                    </div>
                    <span className="font-semibold tabular-nums">
                      {item.percentage.toLocaleString("en-US", {
                        maximumFractionDigits: 1,
                      })}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 items-end gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">Staff</div>
                      <div className="mt-1 text-lg font-semibold tabular-nums">
                        {item.staff}
                      </div>
                    </div>
                    <Field className="min-w-0">
                      <FieldLabel htmlFor={`schedule-weight-${item.role}`}>
                        Weight
                      </FieldLabel>
                      <WeightStepper
                        role={item.role}
                        weight={item.weight}
                        onChange={(value) =>
                          setWeights((current) => ({
                            ...current,
                            [item.role]: clampWeight(value),
                          }))
                        }
                      />
                    </Field>
                  </div>
                  {previewAmount > 0 && item.staff > 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {currencyFormatter.format(item.perPersonAmount)} each
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
