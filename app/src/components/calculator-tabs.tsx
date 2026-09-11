import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";

import { authClient } from "#/lib/auth-client.ts";
import { getSevenShiftsScheduleAccess } from "#/lib/seven-shifts-schedules.ts";

const baseClassName =
  "shrink-0 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
const activeClassName = "bg-background text-foreground shadow-sm";

export function useSevenShiftsNavigationAccess() {
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const [access, setAccess] = useState({
    organizationId: "",
    allowed: false,
  });

  useEffect(() => {
    if (!activeOrganization?.id) {
      setAccess({ organizationId: "", allowed: false });
      return;
    }

    let cancelled = false;

    void getSevenShiftsScheduleAccess(activeOrganization.id)
      .then((nextAllowed) => {
        if (!cancelled) {
          setAccess({
            organizationId: activeOrganization.id,
            allowed: nextAllowed,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAccess({
            organizationId: activeOrganization.id,
            allowed: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeOrganization?.id]);

  return (
    access.organizationId === activeOrganization?.id && access.allowed
  );
}

export function CalculatorTabs() {
  const location = useLocation();
  const showSevenShifts = useSevenShiftsNavigationAccess();
  const links = [
    { to: "/claims" as const, label: "Claims" },
    { to: "/tips" as const, label: "Tips" },
    { to: "/weight-presets" as const, label: "Weight Presets" },
    ...(showSevenShifts
      ? [{ to: "/seven-shifts" as const, label: "7Shifts Schedule" }]
      : []),
  ];

  return (
    <nav aria-label="Tip Calculator pages" className="overflow-x-auto pb-1">
      <div
        role="tablist"
        className="inline-flex min-w-max gap-1 rounded-lg border bg-muted/50 p-1"
      >
        {links.map((item) => {
          const active = location.pathname === item.to;

          return (
            <Link
              key={item.to}
              to={item.to}
              role="tab"
              aria-selected={active}
              className={`${baseClassName} ${active ? activeClassName : ""}`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
