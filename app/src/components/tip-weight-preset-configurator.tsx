import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart } from "recharts";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  SaveIcon,
  Trash2Icon,
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
  TIP_CLAIM_ROLE_LABELS,
  TIP_CLAIM_ROLE_ORDER,
  type TipClaimRoleKey,
  type TipClaimRoleState,
  type TipClaimWeightState,
} from "#/lib/tip-claim-allocation.ts";
import {
  DEFAULT_TIP_WEIGHT_PRESET_STAFF,
  DEFAULT_TIP_WEIGHT_PRESET_WEIGHTS,
  deleteTipWeightPreset,
  listTipWeightPresets,
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

function clampCount(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(50, Math.max(0, Math.round(value)));
}

function clampWeight(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(10, Math.max(0, Math.round(value * 10) / 10));
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
}: {
  organizationId: string;
  organizationName?: string;
}) {
  const [name, setName] = useState("");
  const [staff, setStaff] = useState<TipClaimRoleState>({
    ...DEFAULT_TIP_WEIGHT_PRESET_STAFF,
  });
  const [weights, setWeights] = useState<TipClaimWeightState>({
    ...DEFAULT_TIP_WEIGHT_PRESET_WEIGHTS,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [presets, setPresets] = useState<TipWeightPreset[]>([]);
  const [presetsPending, setPresetsPending] = useState(true);
  const [mutationPending, setMutationPending] = useState(false);
  const [presetError, setPresetError] = useState<string | null>(null);
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

    void listTipWeightPresets(organizationId)
      .then((nextPresets) => {
        if (!cancelled) setPresets(nextPresets);
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
      return {
        role,
        staff: staff[role],
        weight: weights[role],
        units,
        percentage: totalUnits > 0 ? (units / totalUnits) * 100 : 0,
        fill: ROLE_COLORS[role],
      };
    });
  }, [staff, weights]);

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
          fill: item.fill,
        }))
      : [],
  );

  function resetForm() {
    setEditingId(null);
    setName("");
    setStaff({ ...DEFAULT_TIP_WEIGHT_PRESET_STAFF });
    setWeights({ ...DEFAULT_TIP_WEIGHT_PRESET_WEIGHTS });
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
    if (!name.trim() || totalStaff === 0 || mutationPending) return;

    setMutationPending(true);
    setPresetError(null);

    try {
      const savedPreset = await saveTipWeightPreset(organizationId, {
        id: editingId ?? undefined,
        name,
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
    setStaff({ ...preset.staff });
    setWeights({ ...preset.weights });
    setPresetError(null);
  }

  async function handleDelete(presetId: string) {
    if (mutationPending) return;

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
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Weight Presets
          </h1>
          <Badge variant="secondary">Staffing states</Badge>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
          Build named role-weight configurations for specific staffing mixes
          {organizationName ? ` in ${organizationName}` : ""}.
        </p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <div className="flex min-w-0 flex-col gap-5">
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
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <FieldDescription>
                  Use a name that makes the staffing state easy to recognize.
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
                    !name.trim() || totalStaff === 0 || mutationPending
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
                        {PRESET_ROLE_ORDER.map(
                          (role) =>
                            `${TIP_CLAIM_ROLE_LABELS[role]} ${preset.staff[role]} × ${preset.weights[role]}`,
                        ).join(" · ")}
                      </div>
                    </button>
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
            <div className="relative min-h-0 overflow-hidden">
              {chartData.length > 0 ? (
                <ChartContainer
                  config={chartConfig}
                  className="mx-auto aspect-square h-[min(56vw,20rem)] max-h-80 w-auto max-w-full"
                  initialDimension={{ width: 300, height: 300 }}
                >
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          hideLabel
                          formatter={(_value, _name, item) => {
                            const payload = item.payload as (typeof chartData)[number];
                            return (
                              <div className="flex min-w-40 items-center justify-between gap-4">
                                <span>
                                  {TIP_CLAIM_ROLE_LABELS[payload.role]}
                                  {staff[payload.role] > 1
                                    ? ` ${payload.segmentIndex + 1}`
                                    : ""}
                                </span>
                                <span className="font-mono font-medium tabular-nums">
                                  {payload.percentage.toLocaleString("en-US", {
                                    maximumFractionDigits: 1,
                                  })}
                                  %
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
                      innerRadius="52%"
                      outerRadius="74%"
                      paddingAngle={0}
                      label={({ segmentIndex, rolePercentage }) =>
                        segmentIndex === 0 && rolePercentage >= 4
                          ? `${rolePercentage.toLocaleString("en-US", {
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
                    <span className="text-xs text-muted-foreground">Staff</span>
                    <span className="text-xl font-semibold tabular-nums">
                      {totalStaff}
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
                    className="flex flex-col rounded-lg border"
                  >
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-3 p-3 text-left"
                      aria-expanded={expanded}
                      aria-controls={`preset-role-${item.role}`}
                      onClick={() => toggleRole(item.role)}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: item.fill }}
                        />
                        <span className="truncate font-medium">
                          {TIP_CLAIM_ROLE_LABELS[item.role]}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="text-right tabular-nums">
                          <div className="font-semibold">
                            {item.percentage.toLocaleString("en-US", {
                              maximumFractionDigits: 1,
                            })}
                            %
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.staff} × {item.weight}
                          </div>
                        </div>
                        <ChevronDownIcon
                          className={`mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform ${
                            expanded ? "rotate-180" : ""
                          }`}
                        />
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
