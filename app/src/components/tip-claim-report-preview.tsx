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
import { Separator } from "#/components/ui/separator.tsx";
import { Slider } from "#/components/ui/slider.tsx";
import {
	allocateTipClaims,
	TIP_CLAIM_ROLE_LABELS,
	TIP_CLAIM_ROLE_ORDER,
	type TipClaimRoleKey,
	type TipClaimRoleState,
	type TipClaimWeightState,
} from "#/lib/tip-claim-allocation.ts";

export type TipClaimPreviewStaff = {
	userId: string;
	name: string;
	email: string;
	role: TipClaimRoleKey;
};

type TipClaimReportPreviewProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	totalSalesCents: number;
	claimPercent: number;
	requiredClaimCents: number;
	staff: TipClaimPreviewStaff[];
	weights: TipClaimWeightState;
	savePending?: boolean;
	onSave: (weights: TipClaimWeightState) => void | Promise<void>;
};

type PreviewAllocation = TipClaimPreviewStaff & {
	cents: number;
};

const ROLE_COLORS: Record<TipClaimRoleKey, string> = {
	bartender: "var(--color-bartender)",
	manager: "var(--color-manager)",
	barback: "var(--color-barback)",
	door: "var(--color-door)",
};

const chartConfig = {
	bartender: {
		label: "Bartender",
		color: "var(--chart-1)",
	},
	manager: {
		label: "Manager",
		color: "var(--chart-2)",
	},
	barback: {
		label: "Barback",
		color: "var(--chart-3)",
	},
	door: {
		label: "Door",
		color: "var(--chart-4)",
	},
} satisfies ChartConfig;

const currency = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
});

function clampWeight(value: number) {
	if (!Number.isFinite(value)) return 0;
	return Math.min(10, Math.max(0, Math.round(value)));
}

function getRoleCounts(staff: TipClaimPreviewStaff[]): TipClaimRoleState {
	return staff.reduce<TipClaimRoleState>(
		(counts, person) => ({
			...counts,
			[person.role]: counts[person.role] + 1,
		}),
		{
			bartender: 0,
			manager: 0,
			barback: 0,
			door: 0,
		},
	);
}

function allocatePreview(
	totalCents: number,
	staff: TipClaimPreviewStaff[],
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

export function TipClaimReportPreview({
	open,
	onOpenChange,
	totalSalesCents,
	claimPercent,
	requiredClaimCents,
	staff,
	weights,
	savePending = false,
	onSave,
}: TipClaimReportPreviewProps) {
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

	const allocations = useMemo(
		() => allocatePreview(requiredClaimCents, staff, previewWeights),
		[previewWeights, requiredClaimCents, staff],
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
					percentage:
						requiredClaimCents > 0 ? (cents / requiredClaimCents) * 100 : 0,
				};
			}),
		[activeRoles, allocations, requiredClaimCents],
	);

	const chartData = allocations
		.filter((allocation) => allocation.cents > 0)
		.map((allocation) => ({
			...allocation,
			label: allocation.name || allocation.email,
			percentage:
				requiredClaimCents > 0
					? (allocation.cents / requiredClaimCents) * 100
					: 0,
			fill: ROLE_COLORS[allocation.role],
		}));

	const allocatedCents = allocations.reduce(
		(sum, allocation) => sum + allocation.cents,
		0,
	);
	const hasAllocation =
		requiredClaimCents === 0 || allocatedCents === requiredClaimCents;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[calc(100%-2rem)] overflow-y-auto sm:max-w-5xl">
				<DialogHeader>
					<DialogTitle>Preview report</DialogTitle>
					<DialogDescription>
						Review the tip allocation and adjust role weights before saving the shift.
					</DialogDescription>
				</DialogHeader>

				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					<div className="flex flex-col gap-1 rounded-lg border p-3">
						<span className="text-xs text-muted-foreground">Total sales</span>
						<span className="font-semibold tabular-nums">
							{currency.format(totalSalesCents / 100)}
						</span>
					</div>
					<div className="flex flex-col gap-1 rounded-lg border p-3">
						<span className="text-xs text-muted-foreground">Claim</span>
						<span className="font-semibold tabular-nums">
							{claimPercent.toLocaleString("en-US", {
								maximumFractionDigits: 2,
							})}%
						</span>
					</div>
					<div className="flex flex-col gap-1 rounded-lg border p-3">
						<span className="text-xs text-muted-foreground">Tip pool</span>
						<span className="font-semibold tabular-nums">
							{currency.format(requiredClaimCents / 100)}
						</span>
					</div>
					<div className="flex flex-col gap-1 rounded-lg border p-3">
						<span className="text-xs text-muted-foreground">Staff</span>
						<span className="font-semibold tabular-nums">{staff.length}</span>
					</div>
				</div>

				<div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]">
					<div className="flex min-w-0 flex-col gap-4">
						<div className="relative min-h-72">
							{chartData.length > 0 ? (
								<ChartContainer
									config={chartConfig}
									className="mx-auto aspect-square max-h-80 w-full"
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
																		{payload.percentage.toLocaleString("en-US", {
																			maximumFractionDigits: 1,
																		})}%
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
									Increase at least one active role weight to preview the allocation.
								</div>
							)}

							{chartData.length > 0 ? (
								<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
									<div className="flex flex-col items-center gap-0.5 text-center">
										<span className="text-xs text-muted-foreground">Tip pool</span>
										<span className="text-xl font-semibold tabular-nums">
											{currency.format(requiredClaimCents / 100)}
										</span>
									</div>
								</div>
							) : null}
						</div>

						<div className="grid gap-2 sm:grid-cols-2">
							{roleTotals.map(({ role, cents, percentage }) => (
								<div
									key={role}
									className="flex items-center justify-between gap-3 rounded-lg border p-3"
								>
									<div className="flex items-center gap-2">
										<span
											className="size-2.5 rounded-sm"
											style={{ backgroundColor: ROLE_COLORS[role] }}
										/>
										<span className="font-medium">{TIP_CLAIM_ROLE_LABELS[role]}</span>
									</div>
									<div className="flex items-center gap-2 tabular-nums">
										<span className="font-semibold">
											{percentage.toLocaleString("en-US", {
												maximumFractionDigits: 1,
											})}%
										</span>
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
							<h3 className="font-medium">Role weights</h3>
							<p className="text-sm text-muted-foreground">
								Adjust only the roles being used for this shift. The preview updates immediately.
							</p>
						</div>

						<Separator />

						<div className="flex flex-col gap-5">
							{activeRoles.map((role) => {
								const roleCount = staff.filter(
									(person) => person.role === role,
								).length;
								const roleTotal =
									roleTotals.find((item) => item.role === role)?.cents ?? 0;

								return (
									<Field key={role}>
										<div className="flex items-center justify-between gap-3">
											<FieldLabel htmlFor={`preview-weight-${role}`}>
												{TIP_CLAIM_ROLE_LABELS[role]}
											</FieldLabel>
											<span className="font-medium tabular-nums">
												{previewWeights[role]}
											</span>
										</div>
										<Slider
											id={`preview-weight-${role}`}
											min={0}
											max={10}
											step={1}
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
											{roleCount} {roleCount === 1 ? "employee" : "employees"} ·{" "}
											{currency.format(roleTotal / 100)} total
										</FieldDescription>
									</Field>
								);
							})}
						</div>

						{!hasAllocation ? (
							<p className="text-sm text-destructive">
								The active weights must allocate the full tip pool before saving.
							</p>
						) : null}
					</div>
				</div>

				<DialogFooter className="sm:justify-between">
					<Button
						type="button"
						variant="outline"
						disabled={savePending}
						onClick={() => setPreviewWeights(initialWeights)}
					>
						Reset weights
					</Button>
					<div className="flex flex-col-reverse gap-2 sm:flex-row">
						<Button
							type="button"
							variant="outline"
							disabled={savePending}
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							disabled={savePending || !hasAllocation || staff.length === 0}
							onClick={() => void onSave(previewWeights)}
						>
							{savePending ? "Saving…" : "Save report"}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
