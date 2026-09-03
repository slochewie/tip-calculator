import { type ReactNode, useEffect, useMemo, useState } from "react";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select.tsx";
import { Separator } from "#/components/ui/separator.tsx";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table.tsx";
import { TipClaimEndOfShift } from "#/components/tip-claim-end-of-shift.tsx";
import { TipClaimReportPreview } from "#/components/tip-claim-report-preview.tsx";
import {
	allocateTipClaims as allocateClaims,
	DEFAULT_TIP_CLAIM_WEIGHTS,
	getTipClaimTotalWeight,
	TIP_CLAIM_REGISTER_ROLE_ORDER as REGISTER_ROLE_ORDER,
	TIP_CLAIM_ROLE_LABELS as ROLE_LABELS,
	TIP_CLAIM_ROLE_ORDER as ROLE_ORDER,
	type TipClaimRoleKey as RoleKey,
	type TipClaimRoleState as RoleState,
	type TipClaimWeightState as WeightState,
} from "#/lib/tip-claim-allocation.ts";
import {
	buildTipClaimShiftAllocation,
	type TipClaimResolvedStaff,
} from "#/lib/tip-claim-shift.ts";
import { saveTipClaimShift } from "#/lib/tip-claim.ts";

type Register = {
	id: number;
	name: string;
	sales: string;
};

type StaffAssignment = {
	userId: string;
	role: RoleKey;
	registerId: number | null;
};

export type TipClaimMember = {
	id: string;
	name: string;
	email: string;
	bartenderEnabled: boolean;
	managerEnabled: boolean;
	barbackEnabled: boolean;
	doorEnabled: boolean;
};

type TipClaimCalculatorProps = {
	organizationId?: string;
	organizationName?: string;
	organizationSelector?: ReactNode;
	members?: TipClaimMember[];
	membersPending?: boolean;
	membersError?: string | null;
};

const ROLE_ENABLED_FIELDS: Record<RoleKey, keyof Pick<TipClaimMember, "bartenderEnabled" | "managerEnabled" | "barbackEnabled" | "doorEnabled">> = {
	bartender: "bartenderEnabled",
	manager: "managerEnabled",
	barback: "barbackEnabled",
	door: "doorEnabled",
};

const currency = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
});

function isRoleEnabled(member: TipClaimMember, role: RoleKey) {
	return member[ROLE_ENABLED_FIELDS[role]];
}

function enabledRoles(member: TipClaimMember, roles = ROLE_ORDER) {
	return roles.filter((role) => isRoleEnabled(member, role));
}

function parseMoney(value: string) {
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function clampInteger(value: number, min = 0, max = 50) {
	if (!Number.isFinite(value)) return min;
	return Math.min(max, Math.max(min, Math.trunc(value)));
}

export function TipClaimCalculator({
	organizationId,
	organizationName,
	organizationSelector,
	members,
	membersPending = false,
	membersError = null,
}: TipClaimCalculatorProps = {}) {
	const [claimPercent, setClaimPercent] = useState("8");
	const [nextRegisterId, setNextRegisterId] = useState(2);
	const [registers, setRegisters] = useState<Register[]>([
		{ id: 1, name: "Register A", sales: "0" },
	]);
	const [staff, setStaff] = useState<RoleState>({
		bartender: 1,
		manager: 0,
		barback: 0,
		door: 0,
	});
	const [memberAssignments, setMemberAssignments] = useState<StaffAssignment[]>(
		[],
	);
	const [weights, setWeights] = useState<WeightState>({
		...DEFAULT_TIP_CLAIM_WEIGHTS,
	});
	const [savePending, setSavePending] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [savedShiftId, setSavedShiftId] = useState<string | null>(null);
	const [previewOpen, setPreviewOpen] = useState(false);

	const usesOrganizationMembers = members !== undefined;

	useEffect(() => {
		setMemberAssignments([]);
	}, [organizationId]);

	useEffect(() => {
		setSaveError(null);
		setSavedShiftId(null);
	}, [claimPercent, memberAssignments, organizationId, registers, weights]);

	const effectiveStaff = useMemo<RoleState>(() => {
		if (!usesOrganizationMembers) {
			return staff;
		}

		return memberAssignments.reduce<RoleState>(
			(counts, assignment) => ({
				...counts,
				[assignment.role]: counts[assignment.role] + 1,
			}),
			{
				bartender: 0,
				manager: 0,
				barback: 0,
				door: 0,
			},
		);
	}, [memberAssignments, staff, usesOrganizationMembers]);

	const totalSalesCents = useMemo(
		() =>
			registers.reduce(
				(sum, register) => sum + Math.round(parseMoney(register.sales) * 100),
				0,
			),
		[registers],
	);
	const totalSales = totalSalesCents / 100;
	const normalizedPercent = Math.min(
		100,
		Math.max(0, Number.parseFloat(claimPercent) || 0),
	);
	const requiredClaimCents = Math.round(
		totalSalesCents * (normalizedPercent / 100),
	);
	const allocations = useMemo(
		() => allocateClaims(requiredClaimCents, effectiveStaff, weights),
		[effectiveStaff, requiredClaimCents, weights],
	);
	const totalWeight = getTipClaimTotalWeight(effectiveStaff, weights);
	const allocatedClaimCents = allocations.reduce(
		(sum, allocation) => sum + allocation.cents,
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
			count: effectiveStaff[role],
			weight: weights[role],
			totalCents,
			minimum,
			maximum,
		};
	});

	const eligibleMembers =
		members?.filter((member) => enabledRoles(member).length > 0) ?? [];
	const registerMembers = eligibleMembers.filter(
		(member) => enabledRoles(member, REGISTER_ROLE_ORDER).length > 0,
	);
	const assignedUserIds = new Set(
		memberAssignments.map((assignment) => assignment.userId),
	);
	const unassignedMembers = eligibleMembers.filter(
		(member) => !assignedUserIds.has(member.id),
	);

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
		setMemberAssignments((current) =>
			current.map((assignment) =>
				assignment.registerId === id
					? { ...assignment, registerId: null }
					: assignment,
			),
		);
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

	function addMemberAssignment() {
		const member = unassignedMembers[0];
		if (!member) return;

		const role = enabledRoles(member)[0];
		if (!role) return;

		setMemberAssignments((current) => [
			...current,
			{
				userId: member.id,
				role,
				registerId: null,
			},
		]);
	}

	function updateMemberAssignment(
		index: number,
		changes: Partial<StaffAssignment>,
	) {
		setMemberAssignments((current) => {
			const assignment = current[index];
			if (!assignment) return current;

			const userId = changes.userId ?? assignment.userId;
			const member = members?.find((candidate) => candidate.id === userId);
			if (usesOrganizationMembers && !member) return current;

			let role = changes.role ?? assignment.role;
			if (member && !isRoleEnabled(member, role)) {
				const fallbackRole = enabledRoles(member)[0];
				if (!fallbackRole) return current;
				role = fallbackRole;
			}

			let registerId =
				changes.registerId !== undefined
					? changes.registerId
					: assignment.registerId;

			if (role !== "bartender" && role !== "manager") {
				registerId = null;
			}

			return current.map((currentAssignment, assignmentIndex) => {
				if (assignmentIndex === index) {
					return {
						...currentAssignment,
						...changes,
						userId,
						role,
						registerId,
					};
				}

				if (
					registerId !== null &&
					currentAssignment.registerId === registerId
				) {
					return { ...currentAssignment, registerId: null };
				}

				return currentAssignment;
			});
		});
	}

	function assignRegisterEmployee(registerId: number, userId: string | null) {
		setMemberAssignments((current) => {
			const currentRegisterIndex = current.findIndex(
				(assignment) => assignment.registerId === registerId,
			);

			if (userId === null) {
				return current.map((assignment, index) =>
					index === currentRegisterIndex
						? { ...assignment, registerId: null }
						: assignment,
				);
			}

			const member = registerMembers.find((candidate) => candidate.id === userId);
			if (!member) return current;

			const allowedRegisterRoles = enabledRoles(member, REGISTER_ROLE_ORDER);
			const userIndex = current.findIndex(
				(assignment) => assignment.userId === userId,
			);

			if (userIndex >= 0) {
				return current.map((assignment, index) => {
					if (index === userIndex) {
						const role = allowedRegisterRoles.includes(assignment.role)
							? assignment.role
							: allowedRegisterRoles[0];

						if (!role) return assignment;

						return {
							...assignment,
							role,
							registerId,
						};
					}

					if (assignment.registerId === registerId) {
						return { ...assignment, registerId: null };
					}

					return assignment;
				});
			}

			const role = allowedRegisterRoles[0];
			if (!role) return current;

			return [
				...current.map((assignment) =>
					assignment.registerId === registerId
						? { ...assignment, registerId: null }
						: assignment,
				),
				{
					userId,
					role,
					registerId,
				},
			];
		});
	}

	function removeMemberAssignment(index: number) {
		setMemberAssignments((current) =>
			current.filter((_, assignmentIndex) => assignmentIndex !== index),
		);
	}

	function updateWeight(role: RoleKey, value: string) {
		setWeights((current) => ({
			...current,
			[role]: clampInteger(Number(value), 0, 100),
		}));
	}

	function validateEndOfShift() {
		if (!organizationId || !members) {
			setSaveError("Select an organization before saving the shift.");
			return false;
		}

		if (memberAssignments.length === 0) {
			setSaveError("Add at least one on-duty staff member before saving.");
			return false;
		}

		if (registers.some((register) => register.name.trim().length === 0)) {
			setSaveError("Every register needs a name before saving.");
			return false;
		}

		return true;
	}

	async function saveEndOfShift(saveWeights: WeightState = weights) {
		if (!validateEndOfShift() || !organizationId || !members) {
			return;
		}

		const resolvedStaff = memberAssignments.map<TipClaimResolvedStaff>(
			(assignment) => {
				const member = members.find(
					(candidate) => candidate.id === assignment.userId,
				);

				if (!member) {
					throw new Error(
						"One of the assigned staff members is no longer available.",
					);
				}

				if (!isRoleEnabled(member, assignment.role)) {
					throw new Error(
						`${member.name || member.email} is not assigned to the ${ROLE_LABELS[assignment.role]} role.`,
					);
				}

				return {
					userId: member.id,
					name: member.name,
					email: member.email,
					role: assignment.role,
					registerKey: assignment.registerId?.toString() ?? null,
				};
			},
		);

		const {
			staff: savedStaff,
			totalWeightUnits: saveTotalWeight,
			allocatedClaimCents: saveAllocatedClaimCents,
		} = buildTipClaimShiftAllocation(
			requiredClaimCents,
			resolvedStaff,
			saveWeights,
		);

		if (
			requiredClaimCents > 0 &&
			saveAllocatedClaimCents !== requiredClaimCents
		) {
			setSaveError("The required claim must be fully allocated before saving.");
			return;
		}

		setSavePending(true);
		setSaveError(null);

		try {
			const result = await saveTipClaimShift({
				organizationId,
				claimPercent: normalizedPercent,
				totalSalesCents,
				requiredClaimCents,
				totalWeightUnits: saveTotalWeight,
				weights: saveWeights,
				completedAt: new Date(),
				registers: registers.map((register) => ({
					registerKey: register.id.toString(),
					name: register.name.trim(),
					salesCents: Math.round(parseMoney(register.sales) * 100),
				})),
				staff: savedStaff,
			});

			setPreviewOpen(false);
			setSavedShiftId(result.shiftId);
		} catch (error) {
			setSaveError(
				error instanceof Error
					? error.message
					: "Unable to save end-of-shift sales.",
			);
		} finally {
			setSavePending(false);
		}
	}

	function openReportPreview() {
		if (!validateEndOfShift()) {
			return;
		}

		setSaveError(null);
		setPreviewOpen(true);
	}

	const previewStaff = memberAssignments.flatMap((assignment) => {
		const member = members?.find(
			(candidate) => candidate.id === assignment.userId,
		);

		return member
			? [
					{
						userId: member.id,
						name: member.name,
						email: member.email,
						role: assignment.role,
					},
				]
			: [];
	});

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
					{organizationSelector}

					<Card>
						<CardHeader>
							<CardTitle>Sales and claim target</CardTitle>
							<CardDescription>
								Add every register used during the shift, enter its sales total,
								and assign the employee working that register.
							</CardDescription>
						</CardHeader>

						<CardContent className="gap-5">
							<FieldGroup>
								<Field>
									<FieldLabel htmlFor="claim-percent">Claim percentage</FieldLabel>
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

							<div className="flex flex-col gap-4">
								{registers.map((register) => {
									const assignmentIndex = memberAssignments.findIndex(
										(assignment) => assignment.registerId === register.id,
									);
									const assignment =
										assignmentIndex >= 0 ? memberAssignments[assignmentIndex] : undefined;
									const assignedMember = assignment
										? members?.find((member) => member.id === assignment.userId)
										: undefined;
									const registerAssignedUserIds = new Set(
										memberAssignments.flatMap((candidate) =>
											candidate.registerId !== null &&
											candidate.registerId !== register.id
												? [candidate.userId]
												: [],
										),
									);
									const availableMembers = registerMembers.filter(
										(member) => !registerAssignedUserIds.has(member.id),
									);
									const availableRegisterRoles = assignedMember
										? enabledRoles(assignedMember, REGISTER_ROLE_ORDER)
										: [];

									return (
										<div
											key={register.id}
											className="grid min-w-0 gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
										>
											<Field>
												<FieldLabel htmlFor={`register-name-${register.id}`}>
													Register
												</FieldLabel>
												<Input
													id={`register-name-${register.id}`}
													value={register.name}
													onChange={(event) =>
														updateRegister(register.id, { name: event.target.value })
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
															updateRegister(register.id, { sales: event.target.value })
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

											{usesOrganizationMembers ? (
												<div className="grid gap-3 sm:col-span-3 sm:grid-cols-2">
													<Field>
														<FieldLabel>Employee</FieldLabel>
														<Select
															value={assignment?.userId ?? "none"}
															disabled={!organizationId || membersPending || Boolean(membersError)}
															onValueChange={(value) =>
																assignRegisterEmployee(
																	register.id,
																	value === "none" ? null : value,
																)
															}
														>
															<SelectTrigger className="w-full">
																<SelectValue placeholder="Select employee" />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value="none">Select employee</SelectItem>
																{availableMembers.map((member) => (
																	<SelectItem key={member.id} value={member.id}>
																		{member.name || member.email}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													</Field>

													<Field>
														<FieldLabel>Role</FieldLabel>
														<Select
															value={assignment?.role ?? availableRegisterRoles[0] ?? "bartender"}
															disabled={assignmentIndex < 0}
															onValueChange={(role) => {
																if (assignmentIndex >= 0) {
																	updateMemberAssignment(assignmentIndex, {
																		role: role as RoleKey,
																	});
																}
															}}
														>
															<SelectTrigger className="w-full">
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																{availableRegisterRoles.map((role) => (
																	<SelectItem key={role} value={role}>
																		{ROLE_LABELS[role]}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													</Field>
												</div>
											) : null}
										</div>
									);
								})}

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
								{usesOrganizationMembers
									? organizationName
										? `Select the ${organizationName} members working this shift and assign each person a claim role.`
										: "Select an organization, then assign its members to claim roles."
									: "Enter how many people in each role are sharing the required claim."}
							</CardDescription>
						</CardHeader>

						<CardContent>
							{usesOrganizationMembers ? (
								<div className="flex flex-col gap-3">
									{!organizationId ? (
										<p className="text-sm text-muted-foreground">
											Select an organization to load its members.
										</p>
									) : membersPending ? (
										<p className="text-sm text-muted-foreground">
											Loading organization members…
										</p>
									) : membersError ? (
										<p className="text-sm text-destructive">{membersError}</p>
									) : eligibleMembers.length === 0 ? (
										<p className="text-sm text-muted-foreground">
											No employees are enabled for Tip Calculator roles.
										</p>
									) : (
										<>
											{memberAssignments.length === 0 ? (
												<p className="text-sm text-muted-foreground">
													No staff assigned yet.
												</p>
											) : null}

											{memberAssignments.map((assignment, index) => {
												const assignedMember = members?.find(
													(member) => member.id === assignment.userId,
												);
												const availableMembers = eligibleMembers.filter(
													(member) =>
														member.id === assignment.userId ||
														!assignedUserIds.has(member.id),
												);
												const availableRoles = assignedMember
													? enabledRoles(assignedMember)
													: [];

												return (
													<div
														key={`${assignment.userId}-${index}`}
														className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(140px,0.45fr)_auto]"
													>
														<Select
															value={assignment.userId}
															onValueChange={(userId) =>
																updateMemberAssignment(index, { userId })
															}
														>
															<SelectTrigger className="w-full">
																<SelectValue placeholder="Select member" />
															</SelectTrigger>
															<SelectContent>
																{availableMembers.map((member) => (
																	<SelectItem key={member.id} value={member.id}>
																		{member.name || member.email}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>

														<Select
															value={assignment.role}
															onValueChange={(role) =>
																updateMemberAssignment(index, {
																	role: role as RoleKey,
																})
															}
														>
															<SelectTrigger className="w-full">
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																{availableRoles.map((role) => (
																	<SelectItem key={role} value={role}>
																		{ROLE_LABELS[role]}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>

														<Button
															type="button"
															variant="ghost"
															size="icon"
															aria-label="Remove staff member"
															onClick={() => removeMemberAssignment(index)}
														>
															<Trash2Icon />
														</Button>
													</div>
												);
											})}

											<Button
												type="button"
												variant="outline"
												disabled={unassignedMembers.length === 0}
												onClick={addMemberAssignment}
											>
												<PlusIcon data-icon="inline-start" />
												Add staff member
											</Button>
										</>
									)}
								</div>
							) : (
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
													onChange={(event) => updateStaff(role, event.target.value)}
												/>
												<InputGroupAddon align="inline-end" className="gap-0">
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
							)}

							<Accordion type="single" collapsible className="mt-3">
								<AccordionItem value="weights">
									<AccordionTrigger>Allocation settings</AccordionTrigger>
									<AccordionContent className="flex flex-col gap-4">
										<p className="text-muted-foreground">
											Higher weights receive a larger share. Defaults are Bartender 5,
											Manager 5, Barback 3, Door 1.
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
														onChange={(event) => updateWeight(role, event.target.value)}
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
									<span className="text-sm text-muted-foreground">Total sales</span>
									<span className="text-2xl font-semibold tabular-nums">
										{currency.format(totalSales)}
									</span>
								</div>
								<div className="flex flex-col gap-1">
									<span className="text-sm text-muted-foreground">Minimum claim</span>
									<span className="text-2xl font-semibold tabular-nums">
										{currency.format(requiredClaimCents / 100)}
									</span>
								</div>
							</div>
							<Separator />
							<div className="flex items-center justify-between gap-4 text-sm">
								<span className="text-muted-foreground">Active weight units</span>
								<span className="font-medium tabular-nums">{totalWeight}</span>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Claim breakdown</CardTitle>
							<CardDescription>
								Amount each role should claim based on the active staff and weights.
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
													: `${currency.format(row.minimum / 100)}–${currency.format(
															row.maximum / 100,
														)}`;

										return (
											<TableRow key={row.role}>
												<TableCell>
													<div className="flex items-center gap-2">
														<span className="font-medium">{ROLE_LABELS[row.role]}</span>
														<Badge variant="outline">{row.weight}×</Badge>
													</div>
												</TableCell>
												<TableCell className="text-right tabular-nums">{row.count}</TableCell>
												<TableCell className="text-right tabular-nums">{each}</TableCell>
												<TableCell className="text-right font-medium tabular-nums">
													{currency.format(row.totalCents / 100)}
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>

							{allocations.length > 0 ? (
								<>
									<Separator />
									<div className="flex items-center justify-between gap-4">
										<span className="text-sm font-medium">Allocated total</span>
										<span className="text-lg font-semibold tabular-nums">
											{currency.format(allocatedClaimCents / 100)}
										</span>
									</div>
								</>
							) : null}

							{requiredClaimCents > 0 && allocations.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									Add at least one staff member with a weight above zero to allocate
									the required claim.
								</p>
							) : null}
						</CardContent>
					</Card>

					{usesOrganizationMembers ? (
						<TipClaimEndOfShift
							saveDisabled={
								!organizationId ||
								memberAssignments.length === 0 ||
								(requiredClaimCents > 0 &&
									allocatedClaimCents !== requiredClaimCents)
							}
							previewDisabled={
								!organizationId || memberAssignments.length === 0
							}
							savePending={savePending}
							savedShiftId={savedShiftId}
							saveError={saveError}
							onSave={() => void saveEndOfShift()}
							onPreview={openReportPreview}
						/>
					) : null}
				</div>
			</div>

			{usesOrganizationMembers ? (
				<TipClaimReportPreview
					open={previewOpen}
					onOpenChange={setPreviewOpen}
					totalSalesCents={totalSalesCents}
					claimPercent={normalizedPercent}
					requiredClaimCents={requiredClaimCents}
					staff={previewStaff}
					weights={weights}
					savePending={savePending}
					onSave={(previewWeights) => saveEndOfShift(previewWeights)}
				/>
			) : null}
		</main>
	);
}
