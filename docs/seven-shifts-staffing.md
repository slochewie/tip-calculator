# 7Shifts Staffing

> **New here?** Read [Getting Started](getting-started.md) first.

Organizations with the 7Shifts APIs enabled can use the published schedule as an optional starting point for Claims or Tips. A manager reviews the crew before anything is sent to a calculator, so schedule roles, open shifts, replacements, and register assignments can be corrected for the actual shift.

This workflow is available to users who can manage Weight Presets. It does not replace manual calculator entry or permanent Weight Presets.

## Review scheduled staffing

1. Open **Weight Presets**.
2. Under **Staffing source**, select **7Shifts schedule**.
3. Choose the **Schedule date**. The current date is used initially. If an overnight shift is active, its persisted start date is selected automatically.
4. Select the **Scheduled shift**. Employees with the same scheduled end time are grouped as one crew.
5. Set the **Number of registers**.
6. Review every scheduled employee and select the correct **Tip Calculator role**.
7. Assign each register to one bartender.
8. Choose **Open Claims with this staffing** or **Open Tips with this staffing**.

Every employee must have a Tip Calculator role, and every register must be assigned to one bartender before either button becomes available.

## Employees and roles

Recognized 7Shifts roles receive an initial Tip Calculator role:

| 7Shifts role | Initial Tip Calculator role |
| --- | --- |
| Manager | Bartender |
| Bartender | Bartender |
| Barback | Barback |
| Door | Door |

Always review the initial role. Any unrecognized or conflicting role must be selected manually.

A pencil button beside an employee allows the scheduled person, an unlinked 7Shifts employee, or an open shift to be replaced with an available organization employee. Employees already scheduled elsewhere that day are excluded from the replacement list, and one replacement employee cannot fill multiple rows in the same reviewed crew.

## Register assignments

Every configured register must be assigned to one bartender. Extra bartenders can work without a register.

When the crew contains exactly one bartender, that employee is assigned to Register 1 automatically. Increasing the register count may require assigning the additional registers manually.

Register assignments are restored when opening Claims. Tips ignores them because Tip Pool calculations do not use registers.

## What opens in each calculator

### Claims

**Open Claims with this staffing** populates:

- employee assignments;
- Tip Calculator roles;
- register rows;
- bartender-to-register assignments;
- the default 8% claim percentage;
- default role weights.

Register sales remain blank and must be entered for the current shift.

### Tips

**Open Tips with this staffing** populates:

- employee assignments;
- Tip Calculator roles;
- default role weights.

The register configuration is intentionally ignored. Enter the complete Tip pool amount and review the resulting distribution.

## Temporary staffing snapshots

Opening either calculator saves the reviewed crew as a temporary staffing snapshot for the organization. The snapshot:

- appears in the calculators' **Weight preset** selector with a **Temporary** label;
- preserves the reviewed employee and role assignments;
- preserves register assignments for Claims;
- remains available for 24 hours;
- does not become a permanent Weight Preset.

The original 7Shifts schedule is not edited. Changes made during review apply only to the temporary Tip Calculator staffing.
