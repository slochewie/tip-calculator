# Weight Presets

> **New here?** Read [Getting Started](getting-started.md) first.

Weight Presets are reusable staffing configurations for the Tip Calculator. A preset records how many employees are working in each role and the relative **weight** assigned to one employee in that role.

The important idea is simple:

> **A weight describes one employee's share relative to another employee's share. It is not a fixed percentage of the pool assigned to the role.**

This lets the calculator automatically adjust the percentage of the pool going to each role when staffing changes, while preserving the intended relationship between individual employees.

## The Weight Presets page

The protected **Weight Presets** page is shared by the organization. Select the organization, name the staffing configuration, set the staffing counts and weights in the Distribution preview, and save the preset.

The preview updates immediately as staffing and weights change. Entering a Preview amount also shows hypothetical dollar distributions. The preview amount is never saved.

A preset also contains two Claims-specific settings:

- **Register count** creates the appropriate number of register rows when the preset is loaded in Claims.
- **Claim percentage** controls the percentage of register sales claimed in Claims and defaults to 8%.

The **Tips** pool calculator ignores Register count and Claim percentage. It uses only the staffing counts and role weights.

![Blank Weight Presets page showing the organization selector, preset editor, saved presets, and distribution preview](images/weight-presets/weight-presets-overview.webp)

*The default Weight Presets page. Staffing counts and weights are edited in the Distribution preview before saving a named preset.*

## New-preset defaults and suggested names

A new manual preset starts with:

| Role | Staff | Weight |
| --- | ---: | ---: |
| Manager | 0 | 5 |
| Bartender | 1 | 5 |
| Barback | 0 | 3 |
| Door | 0 | 2 |

As the register count, staffing counts, or role weights change, the name field suggests a compact description. For example:

```text
Staff: 3-2-2 Weights: 5/3/2 Registers: 2
```

That means three Bartenders, two Barbacks, two Door employees, 5/3/2 weights, and two registers. Zero counts remain descriptive: `Staff: 3-1-0` means three Bartenders, one Barback, and no Door employees.

When a Manager is included, Manager count and weight appear first:

```text
Staff: 1-3-2-2 Weights: 5/5/3/2 Registers: 2
```

The suggested name is only a starting point. Replace it with any name that is more useful to the organization before saving.

## Weight Presets and 7Shifts Schedule

Weight Presets contains permanent reusable templates. For an enabled organization, **7Shifts Schedule** is a separate workspace for reviewing one scheduled crew and opening Claims or Tips with temporary staffing.

Opening a reviewed schedule creates a 24-hour snapshot that can appear in a calculator's **Weight preset** selector with a **Temporary** label. Temporary schedule snapshots do not appear in the saved-preset list and never become permanent presets automatically.

See [7Shifts Staffing](seven-shifts-staffing.md) for the complete workflow.

## Example: 5 / 3 / 2 weights

Suppose the desired relationship is:

| Role | Weight | Relative share |
| --- | ---: | --- |
| Bartender | 5 | 5 shares |
| Barback | 3 | 3 shares |
| Door | 2 | 2 shares |

With one bartender, one barback, and one door employee, there are 10 active weight units:

```text
1 × 5 + 1 × 3 + 1 × 2 = 10
```

For a $1,000 pool, one weight unit is worth $100. The result is therefore:

| Role | Staff | Payout per employee | Role total | Pool share |
| --- | ---: | ---: | ---: | ---: |
| Bartender | 1 | $500 | $500 | 50% |
| Barback | 1 | $300 | $300 | 30% |
| Door | 1 | $200 | $200 | 20% |
| **Total** | **3** | | **$1,000** | **100%** |

![5/3/2 weights with one bartender, one barback, and one door employee splitting a $1,000 pool](images/weight-presets/5-3-2-one-one-one.webp)

*With one employee in each role, 5/3/2 produces a 50% / 30% / 20% result.*

The 50/30/20 percentages above are the *result* of the 5/3/2 weights and this particular staffing mix. They are not percentages that need to be stored in the preset.

## The same weights with different staffing

The role weights do not need to change when staffing changes.

For three bartenders, two barbacks, and two door employees using the same 5/3/2 weights:

```text
Bartenders: 3 × 5 = 15 units
Barbacks:   2 × 3 =  6 units
Door:       2 × 2 =  4 units
                         --
Total:                  25 units
```

For a $2,500 pool, each weight unit is worth $100. The calculator distributes:

| Role | Staff | Weight each | Payout each | Role total | Pool share |
| --- | ---: | ---: | ---: | ---: | ---: |
| Bartender | 3 | 5 | $500 | $1,500 | 60% |
| Barback | 2 | 3 | $300 | $600 | 24% |
| Door | 2 | 2 | $200 | $400 | 16% |
| **Total** | **7** | | | **$2,500** | **100%** |

![5/3/2 weights with three bartenders, two barbacks, and two door employees splitting a $2,500 pool](images/weight-presets/5-3-2-three-two-two.webp)

*The same 5/3/2 employee weights automatically become a 60% / 24% / 16% role split when staffing changes to 3-2-2.*

Notice that the role percentages changed from **50/30/20** to **60/24/16**, but the individual relationship did not change: every bartender still receives 5 shares, every barback 3 shares, and every door employee 2 shares.

### Another staffing example

With one bartender, two barbacks, and no door employees, the same weights produce 11 active units:

```text
1 × 5 + 2 × 3 = 11
```

For a $1,100 pool, the bartender receives $500 and each barback receives $300. Barbacks collectively receive $600, or 54.5% of the pool, even though each individual barback receives less than the bartender.

This is an important distinction: **role total** and **individual employee share** are different things.

## Why weights are better than fixed role percentages

A fixed role percentage can appear to work for one staffing configuration while changing the intended employee-to-employee relationship when staffing changes.

For example, suppose a $1,000 pool with three bartenders, two barbacks, and two door employees is first divided by role:

- Bartenders receive 50% of the pool: $500 total.
- Barbacks receive 30%: $300 total.
- Door receives 20%: $200 total.

Then divide each role's amount evenly among the employees in that role:

| Role | Role pool | Staff | Individual payout |
| --- | ---: | ---: | ---: |
| Bartender | $500 | 3 | $166.67 each |
| Barback | $300 | 2 | $150 each |
| Door | $200 | 2 | $100 each |

Those individual payouts have a relative ratio of approximately **10 / 9 / 6**, not 5 / 3 / 2.

Using weights 10/9/6 with that staffing mix produces 60 active weight units:

```text
3 × 10 + 2 × 9 + 2 × 6 = 60
```

The resulting role totals are exactly 50% / 30% / 20%, but the individual relationship has become:

- one barback receives 90% as much as one bartender;
- one door employee receives 60% as much as one bartender.

![10/9/6 weights recreating a fixed 50% / 30% / 20% role split with three bartenders, two barbacks, and two door employees](images/weight-presets/fixed-percentages-10-9-6.webp)

*Forcing the 3-2-2 staffing state back to a fixed 50% / 30% / 20% role split requires 10/9/6 employee weights, changing the individual payout relationship.*

That may be correct if those are the intended employee relationships. But if the intent is that a bartender should always receive 5 shares for every 3 received by a barback and 2 received by door, then **5/3/2 should remain the weights and the role percentages should be allowed to change with staffing**.

## How the calculation works

The calculator first determines the number of active weight units:

```text
total active weight units = sum(staff count × role weight)
```

An individual employee's payout is then:

```text
employee payout = pool × employee weight / total active weight units
```

The role's total is the individual result multiplied by the number of employees in that role.

The application performs money allocation in cents and reconciles rounding so the complete distributed amount exactly equals the amount being allocated.

## Choosing weights

Start with the relationship you want between **individual employees**, then simplify it to convenient numbers.

For example, if one bartender should receive $500 for every $300 received by a barback and $200 received by door:

```text
500 : 300 : 200
  5 :   3 :   2
```

Use **Bartender 5, Barback 3, Door 2**. The calculator handles the staffing counts and determines the resulting role percentages automatically.
