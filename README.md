# Tip Calculator

A NiteOwl.dev web application for calculating, allocating, saving, and reviewing employee tip claims and tip pools for McCarthy's Irish Pub.

The application now includes two related calculators:

- **Claims** — calculates a required tip claim from register sales and a claim percentage, then distributes that claim across on-duty staff using configurable role weights.
- **Tips** — distributes a complete tip pool across on-duty staff using either direct role weights or percentage targets.

Both workflows integrate with the NiteOwl.dev Better Auth service for organizations, employee access, role assignments, saved reports, corrections, and shared weight presets.

## Documentation

- [Tip Claim Calculator](docs/tip-claim-calculator.md) — how to build a one-off shift or load a preset, enter register sales, assign staff, review the required claim, and save the shift.
- [Tip Pool Calculator](docs/tip-pool-calculator.md) — how to configure a one-off pool or load a preset, enter the complete pool amount, assign staff, and review the weighted distribution.
- [Weight Presets](docs/weight-presets.md) — how role weights work, 5/3/2 examples, staffing changes, and why employee weights are preferable to fixed role percentages.

## Features

### Tip Claim Calculator

The Claims calculator supports both a standalone public mode and the authenticated organization workflow.

- Add and remove register rows
- Enter sales for each register
- Configure the claim percentage, with an 8% default
- Assign employees to registers and on-duty staffing slots
- Restrict employee selectors to roles enabled for each person
- Support Bartender, Manager, Barback, and Door roles
- Configure decimal role weights
- Calculate the total required claim from combined register sales
- Allocate the required claim proportionally by active role weight
- Reconcile rounding to the cent so the allocated total exactly matches the required claim
- Preview the completed shift before saving
- Save completed reports to the Better Auth backend
- Correct previously saved reports when authorized
- Preserve in-progress authenticated drafts locally

See the [Tip Claim Calculator guide](docs/tip-claim-calculator.md) for the user workflow.

### Tip Pool Calculator

The Tips page provides a separate tip-pool workflow that is intentionally unaware of registers and claim percentages.

- Enter one complete tip-pool amount
- Build the on-duty employee list
- Assign each employee a Bartender, Manager, Barback, or Door role
- Restrict employee selectors to the role enabled for each staffing slot
- Allocate the full tip pool using direct role weights
- Optionally use percentage targets and calculate corresponding weights
- Preview the full employee distribution with a responsive donut chart
- Adjust weights from the preview when using weight mode
- Save completed Tip Pool reports
- Correct previously saved Tip Pool reports when authorized
- Store in-progress drafts locally per organization

See the [Tip Pool Calculator guide](docs/tip-pool-calculator.md) for the user workflow.

### Weight Presets

The protected `/weight-presets` page provides organization-wide staffing templates shared by Claims and Tips.

Each preset stores:

- Preset name
- Register count
- Claim percentage
- Manager staff count and weight
- Bartender staff count and weight
- Barback staff count and weight
- Door staff count and weight

The default claim percentage for new presets is **8%**.

Preset behavior differs intentionally between calculators:

- **Claims** uses the preset's register count, claim percentage, staffing counts, and role weights. Selecting a preset rebuilds the working shift with blank employee assignments that the user fills in.
- **Tips** uses only staffing counts and role weights. It ignores register count and claim percentage.

A preset can therefore represent situations such as a normal shift, full staffing, a swing shift, or a solo bartender with a different claim percentage.

Weight Presets also include a live distribution preview. An optional preview amount can be entered to show hypothetical dollar amounts per role and per employee; that amount is never saved with the preset.

Preset management is permission-aware:

- Organization owners/admins, Tip Calculator assignment managers, and global admins can create, edit, and delete presets.
- Regular Tip Calculator users can view and use presets but see the page in read-only mode.

See the [Weight Presets guide](docs/weight-presets.md) for worked examples and an explanation of the weighting model.

### Assignments

The protected `/assignments` page controls who can use the Tip Calculator and which roles each organization member may perform.

Managers can configure:

- Tip Calculator access
- Assignment-manager access
- Bartender eligibility
- Manager eligibility
- Barback eligibility
- Door eligibility

These settings drive the employee options shown in Claims and Tips. For example, a Barback staffing slot only lists employees enabled for the Barback role.

### Reports

The protected `/reports` page contains saved Claims and Tip Pool reports for the active organization.

Reports include the relevant shift details, such as:

- Completion date and time
- Register sales for Claims
- Total sales and claim percentage for Claims
- Required claim total
- Total Tip Pool amount for Tips
- Active role weights
- Assigned staff and roles
- Individual employee allocations
- Register assignments where applicable

Authorized users can correct saved reports. Reports can also be deleted with confirmation where permitted.

## Calculation Model

Both calculators use the same weighted allocation engine.

Default role weights:

| Role | Weight |
| --- | ---: |
| Bartender | 5 |
| Manager | 5 |
| Barback | 3 |
| Door | 1 |

For Claims:

```text
total required claim = total register sales × claim percentage

employee claim = total required claim × employee weight / total active staff weight
```

For Tips:

```text
employee share = total tip pool × employee weight / total active staff weight
```

All money allocation is calculated in cents and reconciled so employee allocations exactly equal the amount being distributed.

## Application Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Standalone Tip Claim Calculator |
| `/app` | Authenticated | Organization-based Claims calculator |
| `/tips` | Authenticated | Tip Pool Calculator |
| `/reports` | Authenticated | Saved Claims and Tip Pool reports |
| `/assignments` | Authenticated / managed | Employee access and role assignments |
| `/weight-presets` | Authenticated | Shared organization weight/staffing presets |

## Authentication and Authorization

Authentication and persisted application data are provided by the NiteOwl.dev Better Auth service.

The frontend communicates with the auth service using credentialed requests and the custom `tip-claim` backend plugin. The backend is authoritative for access checks, organization membership, assignment-management permissions, saved shifts, Tip Pool reports, and persistent weight presets.

Protected pages redirect unauthenticated users to the Better Auth sign-in flow and preserve the requested return URL.

Organization access respects the NiteOwl.dev organization/member status model, including banned users, inactive organizations, and member-level access assignments.

## Navigation

Authenticated pages use the shared NiteOwl application shell with a sidebar and account controls.

The Tip Calculator section currently includes:

- Claims
- Tips
- Reports
- Assignments
- Weight Presets

The Apps section links to other NiteOwl applications, including Console, Counter, and Network Status.

## Drafts

Claims and Tips keep in-progress authenticated work in browser local storage on a per-organization basis.

Drafts preserve calculator state such as staffing, weights, money inputs, and correction context so a page refresh does not immediately discard an unfinished shift. Reset actions clear the organization's local draft and restore calculator defaults.

## Technology

- [TanStack Start](https://tanstack.com/start)
- [React](https://react.dev/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Recharts](https://recharts.org/)
- [Better Auth](https://www.better-auth.com/)
- [Vite](https://vite.dev/)
- Node.js 26
- Docker Compose

## Development

The TanStack Start application lives in the `app/` directory and runs in a Node.js Docker container.

Start the container:

```bash
docker compose up -d
```

Start the development server inside the container:

```bash
docker compose exec -d tip-calculator \
  npm run dev -- --host 0.0.0.0
```

Build the application:

```bash
docker compose exec -T tip-calculator npm run build
```

The Docker Compose configuration exposes the application on host port `3100`.

## Production

The deployed application is served at:

**https://tip-calculator.mccarthysirishpub.com**

Protected routes authenticate through the NiteOwl.dev / McCarthy's Better Auth service and return the user to the requested Tip Calculator page after sign-in.

## Repository Structure

```text
.
├── app/
│   ├── src/
│   │   ├── components/   # Calculator, report, preview, shell, and shadcn UI components
│   │   ├── lib/          # Auth clients, allocation engines, drafts, reports, and presets
│   │   └── routes/       # Claims, Tips, Reports, Assignments, and Weight Presets routes
│   └── package.json
├── docs/                 # User-facing application guides
├── docker-compose.yml
└── README.md
```

## Related Services

This repository contains the Tip Calculator frontend.

The Better Auth configuration and the server-side `tip-claim` plugin are maintained separately in the NiteOwl.dev authentication service. That backend owns persisted Claim reports, Tip Pool reports, employee assignment/access state, and Weight Presets.
