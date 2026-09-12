# 7Shifts Staffing

> **New here?** Read [Getting Started](getting-started.md) first.

Organizations with the 7Shifts integration enabled can use the published schedule as an optional starting point for Claims or Tips. The schedule is reviewed before anything is sent to a calculator, so the actual crew, Tip Calculator roles, register assignments, and weights can be corrected for the shift.

The workflow is a separate **7Shifts Schedule** page. It does not replace manual calculator entry or permanent Weight Presets.

## Availability

**7Shifts Schedule** appears in the sidebar and the calculator tabs only when the active organization has the integration enabled. Switch organizations to check access for a different location.

Opening the route directly for an organization without access shows that 7Shifts scheduling is unavailable. The schedule is never exposed as a staffing-source option on the Weight Presets page.

## Keeping the local schedule current

The page reads from a local copy of the 7Shifts schedule. When the selected organization is configured for schedule syncing, **Last schedule sync** appears beside the calculator tabs. All users who can open the schedule can see this timestamp.

The action button appears only for:

- Better Auth global admins; and
- users with Tip Calculator **Assignment manager** permission for the selected organization.

To refresh the schedule:

1. Select the organization and a date in the week you want to review.
2. Select **Check for updates**. The check compares the local copy with the mapped 7Shifts location for that Sunday–Saturday week.
3. If changes are available, the button changes to **Sync now**.
4. Select **Sync now** to update the local copy. The current schedule view reloads and **Last schedule sync** updates.

The check and sync are scoped to the selected organization, its mapped 7Shifts location, and the week containing the selected date. If several organizations share one 7Shifts API connection, refreshing one location does not pull schedules for the other locations. Changing to a date in another week requires a new update check.

The sync only pulls data from 7Shifts into the local schedule copy; it never writes changes back to 7Shifts. API, mapping, permission, and sync failures appear below the controls with the error returned by the Better Auth schedule service.

## Review scheduled staffing

1. Open **7Shifts Schedule**.
2. Confirm the organization.
3. Choose the **Schedule date**. Before 5:00 AM, the page defaults to the previous schedule date in the location's timezone; at or after 5:00 AM, it defaults to the current date.
4. Select the **Scheduled shift**. Employees with the same scheduled end time are grouped as one crew.
5. Set the **Number of registers**.
6. Review the scheduled employees. Replace a scheduled row or use **Add employee** for an eligible organization employee who was not on the schedule.
7. Confirm or change every employee's **Tip Calculator role**.
8. Assign every register to a bartender.
9. In **Distribution preview**, adjust the role weights if needed. An optional preview amount shows hypothetical payouts and is never saved.
10. Choose **Open Claims with this staffing** or **Open Tips with this staffing**.

The handoff buttons become available when the reviewed crew is not empty, every added row has an employee, every employee has a role, and every register is assigned to a bartender.

## Employees and roles

Recognized 7Shifts roles receive an initial Tip Calculator role:

| 7Shifts role | Initial Tip Calculator role |
| --- | --- |
| Manager | Bartender |
| Bartender | Bartender |
| Barback | Barback |
| Door | Door |

Always review the initial role. Any unrecognized or conflicting role must be selected manually.

Use the edit control beside a scheduled row to replace an unlinked 7Shifts employee, an open shift, or a scheduled employee with an available organization employee. Replacement choices exclude employees scheduled anywhere else that day and employees already selected in the reviewed crew.

Use **Add employee** to include an eligible organization employee who was not scheduled. An added employee can also be removed from the reviewed crew before handoff. These changes affect only the Tip Calculator setup; they do not edit the published 7Shifts schedule.

## Register assignments

Every configured register must be assigned to one bartender. Extra bartenders can work without a register.

When the crew contains exactly one bartender, that employee is assigned to Register 1 automatically. Increasing the register count may require assigning the additional registers manually.

Register assignments are restored when opening Claims. Tips ignores them because Tip Pool calculations do not use registers.

## Distribution preview and weights

The preview uses the reviewed crew and the current role weights. New schedule setups begin with these preset defaults:

| Role | Weight |
| --- | ---: |
| Manager | 5 |
| Bartender | 5 |
| Barback | 3 |
| Door | 2 |

Change a role weight in the preview when the shift needs a different employee-to-employee relationship. The weights shown at handoff are carried into Claims or Tips.

The optional **Preview amount** is only a planning aid. It shows hypothetical role and employee payouts but is not saved with the temporary staffing snapshot or sent as the shift's sales or tip-pool amount.

## What opens in each calculator

### Claims

**Open Claims with this staffing** populates:

- employee assignments;
- Tip Calculator roles;
- register rows;
- bartender-to-register assignments;
- the current reviewed role weights;
- the default 8% claim percentage.

Register sales remain blank and must be entered for the current shift.

### Tips

**Open Tips with this staffing** populates:

- employee assignments;
- Tip Calculator roles;
- the current reviewed role weights.

The register configuration is intentionally ignored. Enter the complete Tip pool amount and review the resulting distribution.

## Temporary staffing snapshots

Opening either calculator saves the reviewed crew as a temporary staffing snapshot named for the schedule date and crew end time. The snapshot:

- appears in the calculators' **Weight preset** selector with a **Temporary** label;
- preserves the reviewed employee and role assignments;
- preserves the reviewed role weights;
- preserves register assignments for Claims;
- remains available for 24 hours;
- does not appear among permanent presets on the Weight Presets page;
- does not become a permanent Weight Preset.

The original 7Shifts schedule is not edited. Changes made during review apply only to the temporary Tip Calculator staffing.
