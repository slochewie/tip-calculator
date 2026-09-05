import { useMemo, useState } from "react";
import { Pie, PieChart } from "recharts";
import { PlusIcon, SaveIcon, Trash2Icon } from "lucide-react";

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
import { Slider } from "#/components/ui/slider.tsx";
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
  const [presets, setPresets] = useState<TipWeightPreset[]>(() =>
    listTipWeightPresets(organizationId),
  );

  const roleData = useMemo(() => {
    const totalUnits = TIP_CLAIM_ROLE_ORDER.reduce(
      (sum, role) => sum + staff[role] * weights[role],
      0,
    );

    return TIP_CLAIM_ROLE_ORDER.map((role) => {
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

  const chartData = roleData.filter((item) => item.units > 0);
  const totalStaff = TIP_CLAIM_ROLE_ORDER.reduce(
    (sum, role) => sum + staff[role],
    0,
  );
  const totalWeightUnits = roleData.reduce((sum, item) => sum + item.units, 0);

  function resetForm() {
    setEditingId(null);
    setName("");
    setStaff({ ...DEFAULT_TIP_WEIGHT_PRESET_STAFF });
    setWeights({ ...DEFAULT_TIP_WEIGHT_PRESET_WEIGHTS });
  }

  function handleSave() {
    if (!name.trim() || totalStaff === 0) return;

    saveTipWeightPreset(organizationId, {
      id: editingId ?? undefined,
      name,
      staff,
      weights,
    });
    setPresets(listTipWeightPresets(organizationId));
    resetForm();
  }

  function handleEdit(preset: TipWeightPreset) {
    setEditingId(preset.id);
    setName(preset.name);
    setStaff({ ...preset.staff });
    setWeights({ ...preset.weights });
  }

  function handleDelete(presetId: string) {
    deleteTipWeightPreset(organizationId, presetId);
    setPresets(listTipWeightPresets(organizationId));
    if (editingId === presetId) resetForm();
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
                Set how many people are working each role, then tune each role's
                weight.
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

              <div className="grid gap-4 sm:grid-cols-2">
                {TIP_CLAIM_ROLE_ORDER.map((role) => (
                  <Card key={role} className="shadow-none">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        {TIP_CLAIM_ROLE_LABELS[role]}
                      </CardTitle>
                      <CardDescription>
                        {roleData.find((item) => item.role === role)?.percentage.toLocaleString(
                          "en-US",
                          { maximumFractionDigits: 1 },
                        ) ?? "0"}
                        % of active weight units
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                      <Field>
                        <FieldLabel htmlFor={`preset-count-${role}`}>Staff</FieldLabel>
                        <Input
                          id={`preset-count-${role}`}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={50}
                          step={1}
                          value={staff[role]}
                          onChange={(event) =>
                            setStaff((current) => ({
                              ...current,
                              [role]: clampCount(event.currentTarget.valueAsNumber),
                            }))
                          }
                        />
                      </Field>

                      <Field>
                        <div className="flex items-center justify-between gap-3">
                          <FieldLabel htmlFor={`preset-weight-${role}`}>Weight</FieldLabel>
                          <Input
                            id={`preset-weight-${role}`}
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={10}
                            step={0.1}
                            value={weights[role]}
                            className="w-24 text-right tabular-nums"
                            onChange={(event) =>
                              setWeights((current) => ({
                                ...current,
                                [role]: clampWeight(event.currentTarget.valueAsNumber),
                              }))
                            }
                          />
                        </div>
                        <Slider
                          aria-label={`${TIP_CLAIM_ROLE_LABELS[role]} weight`}
                          min={0}
                          max={10}
                          step={0.1}
                          value={[weights[role]]}
                          onValueChange={(value) => {
                            const next = Array.isArray(value) ? value[0] : value;
                            setWeights((current) => ({
                              ...current,
                              [role]: clampWeight(Number(next)),
                            }));
                          }}
                        />
                      </Field>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                {editingId ? (
                  <Button type="button" variant="outline" className="sm:w-auto" onClick={resetForm}>
                    Cancel
                  </Button>
                ) : null}
                <Button
                  type="button"
                  disabled={!name.trim() || totalStaff === 0}
                  onClick={handleSave}
                >
                  <SaveIcon data-icon="inline-start" />
                  {editingId ? "Save changes" : "Save preset"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Saved presets</CardTitle>
              <CardDescription>
                These are currently saved for this organization in this browser.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {presets.length === 0 ? (
                <p className="text-sm text-muted-foreground">No presets saved yet.</p>
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
                        {TIP_CLAIM_ROLE_ORDER.map(
                          (role) =>
                            `${TIP_CLAIM_ROLE_LABELS[role]} ${preset.staff[role]} × ${preset.weights[role]}`,
                        ).join(" · ")}
                      </div>
                    </button>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => handleEdit(preset)}>
                        Edit
                      </Button>
                      <Button type="button" variant="destructive" size="sm" onClick={() => handleDelete(preset.id)}>
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
              {totalStaff} staff · {totalWeightUnits.toLocaleString("en-US", {
                maximumFractionDigits: 1,
              })} active weight units
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="relative min-h-0">
              {chartData.length > 0 ? (
                <ChartContainer
                  config={chartConfig}
                  className="mx-auto aspect-square h-[min(62vw,22rem)] max-h-88 w-auto max-w-full"
                  initialDimension={{ width: 320, height: 320 }}
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
                                <span>{TIP_CLAIM_ROLE_LABELS[payload.role]}</span>
                                <span className="font-mono font-medium tabular-nums">
                                  {payload.percentage.toLocaleString("en-US", {
                                    maximumFractionDigits: 1,
                                  })}%
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
                      innerRadius="54%"
                      outerRadius="82%"
                      paddingAngle={0}
                      stroke="var(--background)"
                      strokeWidth={2}
                      label={({ percentage }) =>
                        percentage >= 4
                          ? `${percentage.toLocaleString("en-US", {
                              maximumFractionDigits: 1,
                            })}%`
                          : ""
                      }
                      labelLine={false}
                    />
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
                    <span className="text-xl font-semibold tabular-nums">{totalStaff}</span>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {roleData.map((item) => (
                <div
                  key={item.role}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-3"
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
                  <div className="text-right tabular-nums">
                    <div className="font-semibold">
                      {item.percentage.toLocaleString("en-US", {
                        maximumFractionDigits: 1,
                      })}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.staff} × {item.weight}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
