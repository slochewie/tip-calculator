import { ChartPieIcon, CheckCircle2Icon, SaveIcon } from "lucide-react";

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
	savePending: boolean;
	savedShiftId: string | null;
	saveError: string | null;
	onSave: () => void;
	onPreview: () => void;
};

export function TipClaimEndOfShift({
	saveDisabled,
	previewDisabled,
	savePending,
	savedShiftId,
	saveError,
	onSave,
	onPreview,
}: TipClaimEndOfShiftProps) {
	const saved = Boolean(savedShiftId);

	return (
		<Card>
			<CardHeader>
				<CardTitle>End of shift</CardTitle>
				<CardDescription>
					Save immediately with the current role weights, or preview the report
					to review and tune the allocation first.
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
								? "End of Shift Sales Saved"
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

				{saveError ? (
					<p className="text-sm text-destructive">{saveError}</p>
				) : null}

				{savedShiftId ? (
					<p className="text-sm text-muted-foreground">
						Shift saved successfully. Editing any shift value will enable a new save.
					</p>
				) : null}
			</CardContent>
		</Card>
	);
}
