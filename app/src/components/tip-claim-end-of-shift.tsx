import {
	ChartPieIcon,
	CheckCircle2Icon,
	RotateCcwIcon,
	SaveIcon,
} from "lucide-react";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "#/components/ui/alert-dialog.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card.tsx";

type TipClaimEndOfShiftProps = {
	saveDisabled: boolean;
	previewDisabled: boolean;
	resetDisabled: boolean;
	savePending: boolean;
	savedShiftId: string | null;
	saveError: string | null;
	editingShiftId?: string | null;
	draftStatus?: "saving" | "saved" | null;
	draftUpdatedAt?: string | null;
	onSave: () => void;
	onPreview: () => void;
	onReset: () => void;
};

export function TipClaimEndOfShift({
	saveDisabled,
	previewDisabled,
	resetDisabled,
	savePending,
	savedShiftId,
	saveError,
	editingShiftId = null,
	draftStatus = null,
	draftUpdatedAt = null,
	onSave,
	onPreview,
	onReset,
}: TipClaimEndOfShiftProps) {
	const saved = Boolean(savedShiftId);
	const correcting = Boolean(editingShiftId);
	const draftTime = draftUpdatedAt
		? new Date(draftUpdatedAt).toLocaleTimeString([], {
				hour: "numeric",
				minute: "2-digit",
			})
		: null;

	return (
		<Card>
			<CardHeader>
				<CardTitle>{correcting ? "Correct saved report" : "End of shift"}</CardTitle>
				<CardDescription>
					{correcting
						? "Review the reopened shift, make the correction, then update the existing saved report."
						: "Save immediately with the current role weights, or preview the report to review and tune the allocation first."}
				</CardDescription>
			</CardHeader>
			<CardContent className="gap-3">
				<div className="grid gap-2 sm:grid-cols-[1fr_auto]">
					<Button
						type="button"
						disabled={saveDisabled || savePending || saved}
						onClick={onSave}
					>
						{savedShiftId ? (
							<CheckCircle2Icon data-icon="inline-start" />
						) : (
							<SaveIcon data-icon="inline-start" />
						)}
						{savePending
							? "Saving…"
							: savedShiftId
								? correcting
									? "Report Correction Saved"
									: "End of Shift Sales Saved"
								: correcting
									? "Save Report Correction"
									: "Save End of Shift Sales"}
					</Button>

					<Button
						type="button"
						variant="outline"
						disabled={previewDisabled || savePending || saved}
						onClick={onPreview}
					>
						<ChartPieIcon data-icon="inline-start" />
						Preview
					</Button>
				</div>

				{correcting ? (
					<Button
						type="button"
						variant="outline"
						className="self-start"
						disabled={savePending}
						onClick={onReset}
					>
						Cancel correction
					</Button>
				) : null}

				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button
							type="button"
							variant="ghost"
							className="self-start text-destructive hover:text-destructive"
							disabled={resetDisabled || savePending}
						>
							<RotateCcwIcon data-icon="inline-start" />
							Reset calculator
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Reset calculator?</AlertDialogTitle>
							<AlertDialogDescription>
								{correcting
									? "This discards the reopened report draft and clears the calculator. The existing saved report will not be changed."
									: "This permanently deletes the saved draft for this organization and clears the current calculator. No report will be saved."}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction variant="destructive" onClick={onReset}>
								Reset calculator
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				{saveError ? (
					<p className="text-sm text-destructive">{saveError}</p>
				) : null}

				{savedShiftId ? (
					<p className="text-sm text-muted-foreground">
						{correcting
							? "Report correction saved successfully."
							: "Shift saved successfully. Editing any shift value will enable a new save."}
					</p>
				) : draftStatus ? (
					<p className="text-xs text-muted-foreground">
						{draftStatus === "saving"
							? "Saving draft…"
							: draftTime
								? `Draft saved at ${draftTime}`
								: "Draft saved"}
					</p>
				) : null}
			</CardContent>
		</Card>
	);
}
