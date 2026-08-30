# Tip Claim Calculator

A web-based end-of-shift tip claim calculator for McCarthy's Irish Pub.

The application calculates required tip claims from register sales, distributes the claim across staff using configurable role weights, and provides an authenticated workflow for saving and reviewing completed shifts.

## Features

### Public calculator

The public calculator is available at `/` and does not require authentication.

- Add or remove registers
- Enter sales for each register
- Configure the tip claim percentage
- Set bartender, barback, and door staff counts
- Configure role weights
- Calculate the total required claim
- Distribute claims proportionally by role weight
- Reconcile rounding to the cent
- Light and dark theme support
- Responsive desktop and mobile layout

### Authenticated calculator

The authenticated calculator is available at `/app` and uses Better Auth.

- Select an organization
- Load eligible active organization members
- Assign employees to Bartender, Barback, or Door roles
- Prevent duplicate employee assignments
- Assign bartenders to individual registers
- Derive staff counts and claim weights from assigned employees
- Save completed end-of-shift sales and tip claims
- Link directly to saved shift reports

### Reports

The protected `/reports` page provides access to previously saved shifts for the active organization.

Saved reports include:

- Shift date and time
- Register sales
- Total sales
- Claim percentage
- Required claim total
- Assigned staff and roles
- Individual calculated claims
- Bartender/register assignments
- Saved shift deletion with confirmation

## Tip Claim Calculation

The calculator uses weighted distribution for employee claims.

Default role weights:

| Role | Weight |
| --- | ---: |
| Bartender | 5 |
| Barback | 3 |
| Door | 1 |

The base calculation is:

```text
total required claim = total sales × claim percentage

employee claim = total required claim × employee weight / total active staff weight
```

Claims are calculated in cents and reconciled using largest-remainder allocation so the sum of all employee claims exactly matches the required claim total.

## Application Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Standalone tip claim calculator |
| `/app` | Authenticated | Organization and employee-based calculator |
| `/reports` | Authenticated | Saved end-of-shift reports |

## Authentication and Backend

Authentication and persisted shift data are provided by the NiteOwl.dev Better Auth service.

The Tip Calculator frontend communicates with Better Auth using credentialed requests. The backend provides organization membership, eligible-member filtering, and the custom `tip-claim` API used to save, retrieve, and delete shifts.

Organization access respects the NiteOwl.dev organization/member status model:

- Globally banned users are unavailable.
- Organization-deactivated members are unavailable only within that organization.
- Existing organization memberships without an explicit status remain active by default.

## Technology

- [TanStack Start](https://tanstack.com/start)
- [React](https://react.dev/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Better Auth](https://www.better-auth.com/)
- [Vite](https://vite.dev/)
- Node.js 26
- Docker Compose

## Development

The application lives in the `app/` directory and runs in a Node.js Docker container.

Start the container:

```bash
docker compose up -d
```

Start the TanStack/Vite development server inside the container:

```bash
docker compose exec -d tip-calculator \
  npm run dev -- --host 0.0.0.0
```

The Docker Compose configuration exposes the application on host port `3100`.

## Production

The deployed application is served at:

**https://tip-calculator.mccarthysirishpub.com**

Authentication is handled through the McCarthy's Better Auth console. Protected routes preserve their return URL so users are returned to the Tip Calculator after signing in.

## Repository Structure

```text
.
├── app/                 # TanStack Start application
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── lib/         # Auth and tip-claim clients/helpers
│   │   └── routes/      # Public, authenticated, and report routes
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Related Services

This repository contains the Tip Calculator frontend. Better Auth configuration, organization management, member-status handling, and the server-side `tip-claim` plugin are maintained separately in the NiteOwl.dev authentication service.
