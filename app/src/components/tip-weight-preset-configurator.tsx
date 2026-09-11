import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Cell, Pie, PieChart } from "recharts";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  SaveIcon,
  Trash2Icon,
  ScaleIcon,
  XIcon,
} from "lucide-react";

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
  ToggleGroup,
  ToggleGroupItem,
} from "#/components/ui/toggle-group.tsx";
import {
  SevenShiftsPresetBuilder,
  type SevenShiftsClaimsSetup,
} from "#/components/seven-shifts-preset-builder.tsx";
import {
  TIP_CLAIM_ROLE_LABELS,
  TIP_CLAIM_ROLE_ORDER,
  type TipClaimRoleKey,
  type TipClaimRoleState,
  type TipClaimWeightState,
} from "#/lib/tip-claim-allocation.ts";
import { saveTipClaimDraft } from "#/lib/tip-claim-draft.ts";
import { saveTipPoolStaffingDraft } from "#/lib/use-tip-pool-draft.ts";
import {
  DEFAULT_TIP_WEIGHT_PRESET_STAFF,
  DEFAULT_TIP_WEIGHT_PRESET_WEIGHTS,
  canManageTipWeightPresets,
  deleteTipWeightPreset,
  listTipWeightPresets,
  saveTipStaffingSnapshot,
  saveTipWeightPreset,
  type TipWeightPreset,
} from "#/lib/tip-weight-presets.ts";

const PRESET_ROLE_ORDER: TipClaimRoleKey[] = [
  "manager",
  "bartender",
  "barback",
  "door",
];

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

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function clampCount(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(50, Math.max(0, Math.round(value)));
}

function clampWeight(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(10, Math.max(0, Math.round(value * 10) / 10));
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 8;
  return Math.min(100, Math.max(0, Math.round(value * 10) / 10));
}

function formatPresetWeight(value: number) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function getSuggestedPresetName(
  registerCount: number,
  staff: TipClaimRoleState,
  weights: TipClaimWeightState,
) {
  const roles: TipClaimRoleKey[] =
    staff.manager > 0
      ? ["manager", "bartender", "barback", "door"]
      : ["bartender", "barback", "door"];

  const staffPart = roles.map((role) => staff[role]).join("-");
  const weightPart = roles
    .map((role) => formatPresetWeight(weights[role]))
    .join("/");

  return `Staff: ${staffPart} Weights: ${weightPart} Registers: ${registerCount}`;
}

function MobileStepperButtons({
  label,
  onIncrement,
  onDecrement,
}: {
  label: string;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div className="flex shrink-0 overflow-hidden rounded-md border sm:hidden">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-10 rounded-none border-r"
        aria-label={`Decrease ${label}`}
        onClick={onDecrement}
      >
        <ChevronDownIcon className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-10 rounded-none"
        aria-label={`Increase ${label}`}
        onClick={onIncrement}
      >
        <ChevronUpIcon className="size-4" />
      </Button>
    </div>
  );
}

function ClearableNumberInput({
  id,
  value,
  inputMode,
  min,
  max,
  step,
  onChange,
  onClear,
}: {
  id: string;
  value: number;
  inputMode: "numeric" | "decimal";
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  onClear: () => void;
}) {
  return (
    <div className="relative w-20 sm:w-24">
      <Input
        id={id}
        type="number"
        inputMode={inputMode}
        min={min}
        max={max}
        step={step}
        value={value}
        className="w-full pr-8 text-left tabular-nums"
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1/2 size-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label={`Clear ${id}`}
        onClick={onClear}
      >
        <XIcon className="size-3.5" />
      </Button>
    </div>
  );
}

export function TipWeightPresetConfigurator({
  organizationId,
  organizationName,
  organizationSelector,
}: {
  organizationId: string;
  organizationName?: string;
  organizationSelector: ReactNode;
}) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [nameCustomized, setNameCustomized] = useState(false);
  const [registerCount, setRegisterCount] = useState(0);
  const [claimPercent, setClaimPercent] = useState(8);
  const [staff, setStaff] = useState<TipClaimRoleState>({
    ...DEFAULT_TIP_WEIGHT_PRESET_STAFF,
  });
  const [weights, setWeights] = useState<TipClaimWeightState>({
    ...DEFAULT_TIP_WEIGHT_PRESET_WEIGHTS,
  });
  const [previewAmount, setPreviewAmount] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [presets, setPresets] = useState<TipWeightPreset[]>([]);
  const [presetsPending, setPresetsPending] = useState(true);
  const [mutationPending, setMutationPending] = useState(false);
  const [presetError, setPresetError] = useState<string | null>(null);
  const [canManagePresets, setCanManagePresets] = useState(false);
  const [staffingSource, setStaffingSource] = useState<"manual" | "seven-shifts">(
    "manual",
  );
  const [expandedRoles, setExpandedRoles] = useState<
    Record<TipClaimRoleKey, boolean>
  >({
    manager: false,
    bartender: true,
    barback: true,
    door: true,
  });

  useEffect(() => {
    let cancelled = false;

    setPresetsPending(true);
    setPresetError(null);
    setCanManagePresets(false);

    void listTipWeightPresets(organizationId)
      .then((nextPresets) => {
        if (!cancelled) {
          setPresets(
            nextPresets.filter(
              (preset) => preset.source !== "seven-shifts",
            ),
          );
          setCanManagePresets(canManageTipWeightPresets());
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setPresetError(
            error instanceof Error ? error.message : "Unable to load weight presets.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setPresetsPending(false);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  const roleData = useMemo(() => {
    const totalUnits = TIP_CLAIM_ROLE_ORDER.reduce(
      (sum, role) => sum + staff[role] * weights[role],
      0,
    );

    return PRESET_ROLE_ORDER.map((role) => {
      const units = staff[role] * weights[role];
      const percentage = totalUnits > 0 ? (units / totalUnits) * 100 : 0;
      const amount = totalUnits > 0 ? (previewAmount * units) / totalUnits : 0;
      const perPersonAmount = staff[role] > 0 ? amount / staff[role] : 0;

      return {
        role,
        staff: staff[role],
        weight: weights[role],
        units,
        percentage,
        amount,
        perPersonAmount,
        fill: ROLE_COLORS[role],
      };
    });
  }, [previewAmount, staff, weights]);

  const totalStaff = TIP_CLAIM_ROLE_ORDER.reduce(
    (sum, role) => sum + staff[role],
    0,
  );
  const hasConfigurationChanges =
    registerCount !== 0 ||
    TIP_CLAIM_ROLE_ORDER.some(
      (role) =>
        staff[role] !== DEFAULT_TIP_WEIGHT_PRESET_STAFF[role] ||
        weights[role] !== DEFAULT_TIP_WEIGHT_PRESET_WEIGHTS[role],
    );
  const suggestedName = hasConfigurationChanges
    ? getSuggestedPresetName(registerCount, staff, weights)
    : "";
  const displayedName = nameCustomized ? name : suggestedName;
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

  function resetForm() {
    setEditingId(null);
    setName("");
    setNameCustomized(false);
    setRegisterCount(0);
    setClaimPercent(8);
    setStaff({ ...DEFAULT_TIP_WEIGHT_PRESET_STAFF });
    setWeights({ ...DEFAULT_TIP_WEIGHT_PRESET_WEIGHTS });
  }

  async function saveScheduledSnapshot(setup: SevenShiftsClaimsSetup) {
    await saveTipStaffingSnapshot(organizationId, {
      name: setup.name,
      registerCount: setup.registerCount,
      claimPercent: 8,
      weights: DEFAULT_TIP_WEIGHT_PRESET_WEIGHTS,
      assignments: setup.memberAssignments,
    });
  }

  async function openScheduledClaims(setup: SevenShiftsClaimsSetup) {
    await saveScheduledSnapshot(setup);

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
      weights: { ...DEFAULT_TIP_WEIGHT_PRESET_WEIGHTS },
      editingShiftId: null,
      editingCompletedAt: null,
    });

    void navigate({ to: "/claims" });
  }

  async function openScheduledTips(setup: SevenShiftsClaimsSetup) {
    await saveScheduledSnapshot(setup);

    saveTipPoolStaffingDraft(
      organizationId,
      setup.memberAssignments.map(({ userId, role }) => ({ userId, role })),
      DEFAULT_TIP_WEIGHT_PRESET_WEIGHTS,
    );

    void navigate({ to: "/tips" });
  }

  function updateStaff(role: TipClaimRoleKey, value: number) {
    setStaff((current) => ({ ...current, [role]: clampCount(value) }));
  }

  function updateWeight(role: TipClaimRoleKey, value: number) {
    setWeights((current) => ({ ...current, [role]: clampWeight(value) }));
  }

  function toggleRole(role: TipClaimRoleKey) {
    setExpandedRoles((current) => ({ ...current, [role]: !current[role] }));
  }

  async function handleSave() {
    if (
      !canManagePresets ||
      !displayedName.trim() ||
      totalStaff === 0 ||
      mutationPending
    ) {
      return;
    }

    setMutationPending(true);
    setPresetError(null);

    try {
      const savedPreset = await saveTipWeightPreset(organizationId, {
        id: editingId ?? undefined,
        name: displayedName,
        registerCount,
        claimPercent,
        staff,
        weights,
      });

      setPresets((current) => {
        const existing = current.some((preset) => preset.id === savedPreset.id);
        const next = existing
          ? current.map((preset) =>
              preset.id === savedPreset.id ? savedPreset : preset,
            )
          : [...current, savedPreset];

        return next.sort((a, b) => a.name.localeCompare(b.name));
      });
      resetForm();
    } catch (error) {
      setPresetError(
        error instanceof Error ? error.message : "Unable to save weight preset.",
      );
    } finally {
      setMutationPending(false);
    }
  }

  function handleEdit(preset: TipWeightPreset) {
    setEditingId(preset.id);
    setName(preset.name);
    setNameCustomized(true);
    setRegisterCount(preset.registerCount);
    setClaimPercent(preset.claimPercent);
    setStaff({ ...preset.staff });
    setWeights({ ...preset.weights });
    setPresetError(null);
    setStaffingSource("manual");
  }

  async function handleDelete(presetId: string) {
    if (!canManagePresets || mutationPending) return;

    setMutationPending(true);
    setPresetError(null);

    try {
      await deleteTipWeightPreset(organizationId, presetId);
      setPresets((current) =>
        current.filter((preset) => preset.id !== presetId),
      );
      if (editingId === presetId) resetForm();
    } catch (error) {
      setPresetError(
        error instanceof Error ? error.message : "Unable to delete weight preset.",
      );
    } finally {
      setMutationPending(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6 lg:p-8">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm">
          <ScaleIcon className="size-5" />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Weight Presets
            </h1>
            <Badge variant="secondary">Staffing states</Badge>
            {!presetsPending && !canManagePresets ? (
              <Badge variant="outline">Read only</Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            Build named role-weight configurations for specific staffing mixes
            {organizationName ? ` in ${organizationName}` : ""}.
          </p>
        </div>
      </div>

      {organizationSelector}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          {canManagePresets ? (
            <Card>
              <CardHeader>
                <CardTitle>Staffing source</CardTitle>
                <CardDescription>
                  Build a custom preset manually or review a persisted 7Shifts
                  schedule before generating one.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Field>
                  <FieldLabel>Choose staffing source</FieldLabel>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    spacing={0}
                    value={staffingSource}
                    onValueChange={(value) => {
                      if (value === "manual" || value === "seven-shifts") {
                        setStaffingSource(value);
                      }
                    }}
                  >
                    <ToggleGroupItem value="manual">
                      Manual preset
                    </ToggleGroupItem>
                    <ToggleGroupItem value="seven-shifts">
                      7Shifts schedule
                    </ToggleGroupItem>
                  </ToggleGroup>
                </Field>
              </CardContent>
            </Card>
          ) : null}

          {canManagePresets && staffingSource === "seven-shifts" ? (
            <SevenShiftsPresetBuilder
              organizationId={organizationId}
              onApplyClaims={openScheduledClaims}
              onApplyTips={openScheduledTips}
            />
          ) : null}

          {canManagePresets && staffingSource === "manual" ? (
            <Card>
              <CardHeader>
                <CardTitle>{editingId ? "Edit preset" : "New preset"}</CardTitle>
                <CardDescription>
                  Name this staffing configuration, then use the distribution preview to set role counts and weights.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <Field>
                  <FieldLabel htmlFor="preset-name">Preset name</FieldLabel>
                  <Input
                    id="preset-name"
                    placeholder="Friday Full Staff"
                    value={displayedName}
                    onChange={(event) => {
                      setName(event.target.value);
                      setNameCustomized(true);
                    }}
                  />
                  <FieldDescription>
                    A descriptive name is suggested as the configuration changes. Type a custom name to replace it.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="preset-register-count">
                    Register count
                  </FieldLabel>
                  <div className="flex items-stretch gap-2">
                    <ClearableNumberInput
                      id="preset-register-count"
                      inputMode="numeric"
                      min={0}
                      max={50}
                      step={1}
                      value={registerCount}
                      onChange={(value) => setRegisterCount(clampCount(value))}
                      onClear={() => setRegisterCount(0)}
                    />
                    <MobileStepperButtons
                      label="register count"
                      onIncrement={() =>
                        setRegisterCount(clampCount(registerCount + 1))
                      }
                      onDecrement={() =>
                        setRegisterCount(clampCount(registerCount - 1))
                      }
                    />
                  </div>
                  <FieldDescription>
                    Used only by the Claims calculator to create register rows. The Pool calculator ignores this value.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="preset-claim-percent">
                    Claim percentage
                  </FieldLabel>
                  <div className="flex items-stretch gap-2">
                    <ClearableNumberInput
                      id="preset-claim-percent"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      step={0.1}
                      value={claimPercent}
                      onChange={(value) => setClaimPercent(clampPercent(value))}
                      onClear={() => setClaimPercent(8)}
                    />
                    <MobileStepperButtons
                      label="claim percentage"
                      onIncrement={() =>
                        setClaimPercent(clampPercent(claimPercent + 0.1))
                      }
                      onDecrement={() =>
                        setClaimPercent(clampPercent(claimPercent - 0.1))
                      }
                    />
                  </div>
                  <FieldDescription>
                    Used only by the Claims calculator. Defaults to 8%. The Pool calculator ignores this value.
                  </FieldDescription>
                </Field>

                {presetError ? (
                  <p className="text-sm text-destructive">{presetError}</p>
                ) : null}

                <div className="flex flex-col gap-2 sm:flex-row">
                  {editingId ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="sm:w-auto"
                      disabled={mutationPending}
                      onClick={resetForm}
                    >
                      Cancel
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    disabled={
                      !displayedName.trim() || totalStaff === 0 || mutationPending
                    }
                    onClick={() => void handleSave()}
                  >
                    <SaveIcon data-icon="inline-start" />
                    {mutationPending
                      ? "Saving..."
                      : editingId
                        ? "Save changes"
                        : "Save preset"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : presetError ? (
            <p className="text-sm text-destructive">{presetError}</p>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Saved presets</CardTitle>
              <CardDescription>
                These presets are shared with this organization.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {presetsPending ? (
                <p className="text-sm text-muted-foreground">Loading presets...</p>
              ) : presets.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No presets saved yet.
                </p>
              ) : (
                presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <button
                      type="button"
                      className="min-w-0 text-left"
                      onClick={() => handleEdit(preset)}
                    >
                      <div className="font-medium">{preset.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Registers {preset.registerCount} · Claim {preset.claimPercent}% ·{" "}
                        {PRESET_ROLE_ORDER.map(
                          (role) =>
                            `${TIP_CLAIM_ROLE_LABELS[role]} ${preset.staff[role]} × ${preset.weights[role]}`,
                        ).join(" · ")}
                      </div>
                    </button>
                    {canManagePresets ? (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={mutationPending}
                          onClick={() => handleEdit(preset)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={mutationPending}
                          onClick={() => void handleDelete(preset.id)}
                        >
                          <Trash2Icon data-icon="inline-start" />
                          Delete
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

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
              <FieldLabel htmlFor="preview-amount">Preview amount</FieldLabel>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="preview-amount"
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
                  className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear preview amount"
                  onClick={() => setPreviewAmount(0)}
                >
                  <XIcon className="size-4" />
                </Button>
              </div>
              <FieldDescription>
                Enter any total amount, such as combined sales or pooled tips. This preview is never saved.
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
                                  {previewAmount > 0 ? (
                                    <>
                                      {currencyFormatter.format(payload.personAmount)}
                                      <span className="ml-2 text-muted-foreground">
                                        {payload.percentage.toLocaleString("en-US", {
                                          maximumFractionDigits: 1,
                                        })}
                                        %
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      {payload.percentage.toLocaleString("en-US", {
                                        maximumFractionDigits: 1,
                                      })}
                                      %
                                    </>
                                  )}
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
                            : `${rolePercentage.toLocaleString("en-US", {
                                maximumFractionDigits: 1,
                              })}%`
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
                <div className="flex min-h-72 items-center justify-center rounded-lg border border-dashed text-center text-sm text-muted-foreground">
                  Add staff with a weight above zero to preview the distribution.
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

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {roleData.map((item) => {
                const expanded = expandedRoles[item.role];

                return (
                  <div
                    key={item.role}
                    className="flex min-w-0 flex-col rounded-lg border"
                  >
                    <button
                      type="button"
                      className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 p-3 text-left"
                      aria-expanded={expanded}
                      aria-controls={`preset-role-${item.role}`}
                      onClick={() => toggleRole(item.role)}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: item.fill }}
                        />
                        <span className="font-medium">
                          {TIP_CLAIM_ROLE_LABELS[item.role]}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <div className="font-semibold tabular-nums">
                          {item.percentage.toLocaleString("en-US", {
                            maximumFractionDigits: 1,
                          })}
                          %
                        </div>
                        <ChevronDownIcon
                          className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                            expanded ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                      <div className="col-span-2 flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs tabular-nums">
                        {previewAmount > 0 ? (
                          <span className="font-medium">
                            {currencyFormatter.format(item.amount)} role
                          </span>
                        ) : (
                          <span />
                        )}
                        <span className="text-muted-foreground">
                          {item.staff} × {item.weight}
                          {previewAmount > 0 && item.staff > 0
                            ? ` · ${currencyFormatter.format(item.perPersonAmount)} each`
                            : ""}
                        </span>
                      </div>
                    </button>

                    {expanded ? (
                      <div
                        id={`preset-role-${item.role}`}
                        className="flex flex-col gap-2 border-t p-3"
                      >
                        <div className="grid grid-cols-[auto_1fr] items-center gap-3">
                          <FieldLabel htmlFor={`preset-count-${item.role}`}>
                            Staff
                          </FieldLabel>
                          <div className="ml-auto flex items-stretch gap-2">
                            <ClearableNumberInput
                              id={`preset-count-${item.role}`}
                              inputMode="numeric"
                              min={0}
                              max={50}
                              step={1}
                              value={staff[item.role]}
                              onChange={(value) => updateStaff(item.role, value)}
                              onClear={() => updateStaff(item.role, 0)}
                            />
                            <MobileStepperButtons
                              label={`${TIP_CLAIM_ROLE_LABELS[item.role]} staff`}
                              onIncrement={() =>
                                updateStaff(item.role, staff[item.role] + 1)
                              }
                              onDecrement={() =>
                                updateStaff(item.role, staff[item.role] - 1)
                              }
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-[auto_1fr] items-center gap-3">
                          <FieldLabel htmlFor={`preset-weight-${item.role}`}>
                            Weight
                          </FieldLabel>
                          <div className="ml-auto flex items-stretch gap-2">
                            <ClearableNumberInput
                              id={`preset-weight-${item.role}`}
                              inputMode="decimal"
                              min={0}
                              max={10}
                              step={0.1}
                              value={weights[item.role]}
                              onChange={(value) => updateWeight(item.role, value)}
                              onClear={() => updateWeight(item.role, 0)}
                            />
                            <MobileStepperButtons
                              label={`${TIP_CLAIM_ROLE_LABELS[item.role]} weight`}
                              onIncrement={() =>
                                updateWeight(item.role, weights[item.role] + 0.1)
                              }
                              onDecrement={() =>
                                updateWeight(item.role, weights[item.role] - 0.1)
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
