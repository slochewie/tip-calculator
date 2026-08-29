import { useMemo, useState } from "react";
import {
	ChevronDownIcon,
	ChevronUpIcon,
	PlusIcon,
	Trash2Icon,
} from "lucide-react";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "#/components/ui/accordion.tsx";
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
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "#/components/ui/field.tsx";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
} from "#/components/ui/input-group.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Separator } from "#/components/ui/separator.tsx";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table.tsx";

type Register = {
	id: number;
	name: string;
	sales: string;
};

type RoleKey = "bartender" | "barback" | "door";

type RoleState = Record<RoleKey, number>;
type WeightState = Record<RoleKey, number>;

type Allocation = {
	role: RoleKey;
	person: number;
	cents: number;
};

const ROLE_LABELS: Record<RoleKey, string> = {
	bartender: "Bartender",
	barback: "Barback",
	door: "Door",
};

const ROLE_ORDER: RoleKey[] = ["bartender", "barback", "door"];

const currency = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
});

function parseMoney(value: string) {
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function clampInteger(value: number, min = 0, max = 50) {
	if (!Number.isFinite(value)) return min;
	return Math.min(max, Math.max(min, Math.trunc(value)));
}

function allocateClaims(
	totalCents: number,
	staff: RoleState,
	weights: WeightState,
): Allocation[] {
	const people = ROLE_ORDER.flatMap((role) =>
		Array.from({ length: staff[role] }, (_, index) => ({
			role,
			person: index + 1,
			weight: weights[role],
		})),
	).filter((person) => person.weight > 0);

	const totalWeight = people.reduce((sum, person) => sum + person.weight, 0);

	if (totalCents <= 0 || totalWeight <= 0 || people.length === 0) {
		return [];
	}

	const provisional = people.map((person, index) => {
		const exact = (totalCents * person.weight) / totalWeight;
		const cents = Math.floor(exact);

		return {
			...person,
			index,
			cents,
			remainder: exact - cents,
		};
	});

	const remaining =
		totalCents - provisional.reduce((sum, item) => sum + item.cents, 0);

	const remainderOrder = [...provisional].sort(
		(a, b) => b.remainder - a.remainder || a.index - b.index,
	);

	for (let index = 0; index < remaining; index += 1) {
		remainderOrder[index % remainderOrder.length].cents += 1;
	}

	return provisional.map(({ role, person, cents }) => ({
		role,
		person,
		cents,
	}));
}

export function TipClaimCalculator() {
	const [claimPercent, setClaimPercent] = useState("8");
	const [nextRegisterId, setNextRegisterId] = useState(2);

	const [registers, setRegisters] = useState<Register[]>([
		{ id: 1, name: "Register A", sales: "0" },
	]);

	const [staff, setStaff] = useState<RoleState>({
		bartender: 1,
		barback: 0,
		door: 0,
	});

	const [weights, setWeights] = useState<WeightState>({
		bartender: 5,
		barback: 3,
		door: 1,
	});

	const totalSales = useMemo(
		() =>
			registers.reduce((sum, register) => sum + parseMoney(register.sales), 0),
		[registers],
	);

	const normalizedPercent = Math.min(
		100,
		Math.max(0, Number.parseFloat(claimPercent) || 0),
	);

	const requiredClaimCents = Math.round(
		totalSales * (normalizedPercent / 100) * 100,
	);

	const allocations = useMemo(
		() => allocateClaims(requiredClaimCents, staff, weights),
		[requiredClaimCents, staff, weights],
	);

	const totalWeight = ROLE_ORDER.reduce(
		(sum, role) => sum + staff[role] * Math.max(0, weights[role]),
		0,
	);

	const roleBreakdown = ROLE_ORDER.map((role) => {
		const entries = allocations.filter((entry) => entry.role === role);
		const totalCents = entries.reduce((sum, entry) => sum + entry.cents, 0);
		const amounts = entries.map((entry) => entry.cents);
		const minimum = amounts.length ? Math.min(...amounts) : 0;
		const maximum = amounts.length ? Math.max(...amounts) : 0;

		return {
			role,
			count: staff[role],
			weight: weights[role],
			totalCents,
			minimum,
			maximum,
		};
	});

	function updateRegister(id: number, changes: Partial<Register>) {
		setRegisters((current) =>
			current.map((register) =>
				register.id === id ? { ...register, ...changes } : register,
			),
		);
	}

	function addRegister() {
		const letter = String.fromCharCode(65 + registers.length);

		setRegisters((current) => [
			...current,
			{
				id: nextRegisterId,
				name: `Register ${letter}`,
				sales: "",
			},
		]);

		setNextRegisterId((current) => current + 1);
	}

	function removeRegister(id: number) {
		setRegisters((current) => current.filter((register) => register.id !== id));
	}

	function updateStaff(role: RoleKey, value: string) {
		setStaff((current) => ({
			...current,
			[role]: clampInteger(Number(value)),
		}));
	}

	function adjustStaff(role: RoleKey, amount: number) {
		setStaff((current) => ({
			...current,
			[role]: clampInteger(current[role] + amount),
		}));
	}

	function updateWeight(role: RoleKey, value: string) {
		setWeights((current) => ({
			...current,
			[role]: clampInteger(Number(value), 0, 100),
		}));
	}

	return (
		<main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6 lg:p-8">
			<div className="flex flex-col gap-2">
				<div className="flex flex-wrap items-center gap-2">
					<h1 className="font-heading text-3xl font-semibold tracking-tight">
						Tip Claim Calculator
					</h1>
					<Badge variant="secondary">Weighted roles</Badge>
				</div>

				<p className="max-w-3xl text-sm text-muted-foreground md:text-base">
					Calculate the minimum tip claim from combined register sales, then
					split it across on-duty staff using role weights.
				</p>
			</div>

			<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
				<div className="flex min-w-0 flex-col gap-5">
					<Card>
						<CardHeader>
							<CardTitle>Sales and claim target</CardTitle>
							<CardDescription>
								Add every register used during the shift and enter its sales
								total.
							</CardDescription>
						</CardHeader>

						<CardContent className="gap-5">
							<FieldGroup>
								<Field>
									<FieldLabel htmlFor="claim-percent">
										Claim percentage
									</FieldLabel>

									<InputGroup>
										<InputGroupInput
											id="claim-percent"
											type="number"
											inputMode="decimal"
											min="0"
											max="100"
											step="0.1"
											value={claimPercent}
											onChange={(event) => setClaimPercent(event.target.value)}
										/>
										<InputGroupAddon align="inline-end">
											<InputGroupText>% of total sales</InputGroupText>
										</InputGroupAddon>
									</InputGroup>

									<FieldDescription>
										Typical minimum target is 8–10% of combined sales.
									</FieldDescription>
								</Field>
							</FieldGroup>

							<Separator />

							<div className="flex flex-col gap-3">
								{registers.map((register) => (
									<div
										key={register.id}
										className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
									>
										<Field>
											<FieldLabel htmlFor={`register-name-${register.id}`}>
												Register
											</FieldLabel>
											<Input
												id={`register-name-${register.id}`}
												value={register.name}
												onChange={(event) =>
													updateRegister(register.id, {
														name: event.target.value,
													})
												}
											/>
										</Field>

										<Field>
											<FieldLabel htmlFor={`register-sales-${register.id}`}>
												Sales
											</FieldLabel>
											<InputGroup>
												<InputGroupAddon>$</InputGroupAddon>
												<InputGroupInput
													id={`register-sales-${register.id}`}
													type="number"
													inputMode="decimal"
													min="0"
													step="0.01"
													value={register.sales}
													onChange={(event) =>
														updateRegister(register.id, {
															sales: event.target.value,
														})
													}
												/>
											</InputGroup>
										</Field>

										<div className="flex items-end">
											<Button
												type="button"
												variant="ghost"
												size="icon"
												aria-label={`Remove ${register.name}`}
												disabled={registers.length === 1}
												onClick={() => removeRegister(register.id)}
											>
												<Trash2Icon />
											</Button>
										</div>
									</div>
								))}

								<Button type="button" variant="outline" onClick={addRegister}>
									<PlusIcon data-icon="inline-start" />
									Add register
								</Button>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>On-duty staff</CardTitle>
							<CardDescription>
								Enter how many people in each role are sharing the required
								claim.
							</CardDescription>
						</CardHeader>

						<CardContent>
							<FieldGroup className="gap-3">
								{ROLE_ORDER.map((role) => (
									<Field key={role} orientation="responsive">
										<FieldLabel htmlFor={`staff-${role}`}>
											{ROLE_LABELS[role]}
										</FieldLabel>

										<InputGroup className="sm:max-w-32">
											<InputGroupInput
												id={`staff-${role}`}
												type="number"
												inputMode="numeric"
												min="0"
												max="50"
												step="1"
												value={staff[role]}
												onChange={(event) =>
													updateStaff(role, event.target.value)
												}
											/>
											<InputGroupAddon
												align="inline-end"
												className="gap-0"
											>
												<InputGroupButton
													size="icon-xs"
													aria-label={`Decrease ${ROLE_LABELS[role]} count`}
													disabled={staff[role] <= 0}
													onClick={() => adjustStaff(role, -1)}
												>
													<ChevronDownIcon />
												</InputGroupButton>
												<InputGroupButton
													size="icon-xs"
													aria-label={`Increase ${ROLE_LABELS[role]} count`}
													disabled={staff[role] >= 50}
													onClick={() => adjustStaff(role, 1)}
												>
													<ChevronUpIcon />
												</InputGroupButton>
											</InputGroupAddon>
										</InputGroup>
									</Field>
								))}
							</FieldGroup>

							<Accordion type="single" collapsible className="mt-3">
								<AccordionItem value="weights">
									<AccordionTrigger>Allocation settings</AccordionTrigger>
									<AccordionContent className="flex flex-col gap-4">
										<p className="text-muted-foreground">
											Higher weights receive a larger share. Defaults reproduce
											the example split: Bartender 5, Barback 3, Door 1.
										</p>

										<FieldGroup>
											{ROLE_ORDER.map((role) => (
												<Field key={role} orientation="responsive">
													<FieldLabel htmlFor={`weight-${role}`}>
														{ROLE_LABELS[role]} weight
													</FieldLabel>
													<Input
														id={`weight-${role}`}
														className="sm:max-w-32"
														type="number"
														inputMode="numeric"
														min="0"
														max="100"
														step="1"
														value={weights[role]}
														onChange={(event) =>
															updateWeight(role, event.target.value)
														}
													/>
												</Field>
											))}
										</FieldGroup>
									</AccordionContent>
								</AccordionItem>
							</Accordion>
						</CardContent>
					</Card>
				</div>

				<div className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-6 lg:self-start">
					<Card>
						<CardHeader>
							<CardTitle>Required claim</CardTitle>
							<CardDescription>
								{normalizedPercent.toLocaleString("en-US", {
									maximumFractionDigits: 2,
								})}
								% of combined register sales
							</CardDescription>
						</CardHeader>

						<CardContent className="gap-4">
							<div className="grid grid-cols-2 gap-4">
								<div className="flex flex-col gap-1">
									<span className="text-sm text-muted-foreground">
										Total sales
									</span>
									<span className="text-2xl font-semibold tabular-nums">
										{currency.format(totalSales)}
									</span>
								</div>

								<div className="flex flex-col gap-1">
									<span className="text-sm text-muted-foreground">
										Minimum claim
									</span>
									<span className="text-2xl font-semibold tabular-nums">
										{currency.format(requiredClaimCents / 100)}
									</span>
								</div>
							</div>

							<Separator />

							<div className="flex items-center justify-between gap-4 text-sm">
								<span className="text-muted-foreground">
									Active weight units
								</span>
								<span className="font-medium tabular-nums">{totalWeight}</span>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Claim breakdown</CardTitle>
							<CardDescription>
								Amount each role should claim based on the active staff and
								weights.
							</CardDescription>
						</CardHeader>

						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Role</TableHead>
										<TableHead className="text-right">Staff</TableHead>
										<TableHead className="text-right">Each</TableHead>
										<TableHead className="text-right">Role total</TableHead>
									</TableRow>
								</TableHeader>

								<TableBody>
									{roleBreakdown.map((row) => {
										const each =
											row.count === 0
												? "—"
												: row.minimum === row.maximum
													? currency.format(row.minimum / 100)
													: `${currency.format(
															row.minimum / 100,
														)}–${currency.format(row.maximum / 100)}`;

										return (
											<TableRow key={row.role}>
												<TableCell>
													<div className="flex items-center gap-2">
														<span className="font-medium">
															{ROLE_LABELS[row.role]}
														</span>
														<Badge variant="outline">{row.weight}×</Badge>
													</div>
												</TableCell>
												<TableCell className="text-right tabular-nums">
													{row.count}
												</TableCell>
												<TableCell className="text-right tabular-nums">
													{each}
												</TableCell>
												<TableCell className="text-right font-medium tabular-nums">
													{currency.format(row.totalCents / 100)}
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>

							{allocations.length > 0 && (
								<>
									<Separator />
									<div className="flex items-center justify-between gap-4">
										<span className="text-sm font-medium">Allocated total</span>
										<span className="text-lg font-semibold tabular-nums">
											{currency.format(
												allocations.reduce((sum, item) => sum + item.cents, 0) /
													100,
											)}
										</span>
									</div>
								</>
							)}

							{requiredClaimCents > 0 && allocations.length === 0 && (
								<p className="text-sm text-muted-foreground">
									Add at least one staff member with a weight above zero to
									allocate the required claim.
								</p>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</main>
	);
}
