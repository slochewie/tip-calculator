import type { ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  BookOpenIcon,
  Building2Icon,
  CalendarDaysIcon,
  HandCoinsIcon,
  LandmarkIcon,
  GaugeIcon,
  LogOutIcon,
  NetworkIcon,
  PaletteIcon,
  ScaleIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SquareTerminalIcon,
  UserCircleIcon,
  UsersIcon,
} from "lucide-react";

import { AccountSwitcherSubmenu } from "#/components/account-switcher-submenu.tsx";
import { useSevenShiftsNavigationAccess } from "#/components/calculator-tabs.tsx";
import { ThemeMenuControl } from "#/components/theme-switcher.tsx";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "#/components/ui/avatar.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu.tsx";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "#/components/ui/sidebar.tsx";
import { TooltipProvider } from "#/components/ui/tooltip.tsx";
import { authBaseURL, authClient } from "#/lib/auth-client.ts";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getAppLinks() {
  const hostname = window.location.hostname;
  const isMccarthysDomain =
    hostname === "mccarthysirishpub.com" ||
    hostname.endsWith(".mccarthysirishpub.com");

  if (isMccarthysDomain) {
    return {
      console: "https://console.mccarthysirishpub.com/",
      counter: "https://counter.mccarthysirishpub.com",
      networkStatus: "https://unifi.mccarthysirishpub.com",
    };
  }

  return {
    console: "https://console.niteowl.dev",
    counter: "https://counter.niteowl.dev",
    networkStatus: "https://unifi.niteowl.dev",
  };
}

function getSidebarDefaultOpen() {
  if (typeof document === "undefined") return true;

  const sidebarState = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("sidebar_state="))
    ?.split("=")[1];

  return sidebarState !== "false";
}

const sidebarButtonClassName =
  "text-base [&>svg]:size-5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2";
const sidebarLabelClassName =
  "truncate group-data-[collapsible=icon]:hidden";

function TipCalculatorSidebarMenu({ children }: { children: ReactNode }) {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenu onClick={() => setOpenMobile(false)}>{children}</SidebarMenu>
  );
}

export function AppChrome({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { data: session } = authClient.useSession();
  const showSevenShifts = useSevenShiftsNavigationAccess();

  if (!session) {
    return children;
  }

  const displayName = session.user.name || session.user.email;
  const avatarLabel = getInitials(displayName);
  const consoleBaseURL = authBaseURL.replace(/\/$/, "");
  const sidebarDefaultOpen = getSidebarDefaultOpen();
  const appTitle =
    location.pathname === "/tips"
      ? "Tip Pool Calculator"
      : location.pathname === "/seven-shifts"
        ? "7Shifts Schedule"
        : location.pathname === "/weight-presets"
          ? "Weight Presets"
          : "Tip Claim Calculator";

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={sidebarDefaultOpen}>
        <Sidebar collapsible="icon">
          <SidebarHeader className="px-3 py-4">
            <div className="text-base font-semibold group-data-[collapsible=icon]:hidden">
              NiteOwl
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-sm">Tip Calculator</SidebarGroupLabel>
              <SidebarGroupContent>
                <TipCalculatorSidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className={sidebarButtonClassName}
                      isActive={location.pathname === "/claims"}
                      tooltip="Claims"
                    >
                      <Link to="/claims">
                        <LandmarkIcon />
                        <span className={sidebarLabelClassName}>Claims</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className={sidebarButtonClassName}
                      isActive={location.pathname === "/tips"}
                      tooltip="Tips"
                    >
                      <Link to="/tips">
                        <HandCoinsIcon />
                        <span className={sidebarLabelClassName}>Tips</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {showSevenShifts ? (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        className={sidebarButtonClassName}
                        isActive={location.pathname === "/seven-shifts"}
                        tooltip="7Shifts Schedule"
                      >
                        <Link to="/seven-shifts">
                          <CalendarDaysIcon />
                          <span className={sidebarLabelClassName}>
                            7Shifts Schedule
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ) : null}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className={sidebarButtonClassName}
                      isActive={location.pathname === "/reports"}
                      tooltip="Reports"
                    >
                      <Link to="/reports">
                        <ScrollTextIcon />
                        <span className={sidebarLabelClassName}>Reports</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className={sidebarButtonClassName}
                      isActive={location.pathname === "/assignments"}
                      tooltip="Assignments"
                    >
                      <Link to="/assignments">
                        <UsersIcon />
                        <span className={sidebarLabelClassName}>Assignments</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className={sidebarButtonClassName}
                      isActive={location.pathname === "/weight-presets"}
                      tooltip="Weight Presets"
                    >
                      <Link to="/weight-presets">
                        <ScaleIcon />
                        <span className={sidebarLabelClassName}>Weight Presets</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </TipCalculatorSidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator />

            <SidebarGroup>
              <SidebarGroupLabel className="text-sm">Apps</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className={sidebarButtonClassName}
                      tooltip="Console"
                      onClick={() => {
                        const links = getAppLinks();
                        window.location.assign(links.console);
                      }}
                    >
                      <SquareTerminalIcon />
                      <span className={sidebarLabelClassName}>Console</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className={sidebarButtonClassName}
                      tooltip="Counter"
                      onClick={() => {
                        const links = getAppLinks();
                        window.location.assign(links.counter);
                      }}
                    >
                      <GaugeIcon />
                      <span className={sidebarLabelClassName}>Counter</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className={sidebarButtonClassName}
                      tooltip="Network Status"
                      onClick={() => {
                        const links = getAppLinks();
                        window.location.assign(links.networkStatus);
                      }}
                    >
                      <NetworkIcon />
                      <span className={sidebarLabelClassName}>Network Status</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator />

            <SidebarGroup>
              <SidebarGroupLabel className="text-sm">Settings</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className={sidebarButtonClassName}
                      tooltip="Documentation"
                    >
                      <a
                        href="https://github.com/slochewie/tip-calculator/tree/main/docs"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <BookOpenIcon />
                        <span className={sidebarLabelClassName}>Documentation</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className={sidebarButtonClassName}
                      tooltip="Account"
                    >
                      <a href={`${consoleBaseURL}/settings/account`}>
                        <UserCircleIcon />
                        <span className={sidebarLabelClassName}>Account</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className={sidebarButtonClassName}
                      tooltip="Security"
                    >
                      <a href={`${consoleBaseURL}/settings/security`}>
                        <ShieldCheckIcon />
                        <span className={sidebarLabelClassName}>Security</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className={sidebarButtonClassName}
                      tooltip="Organizations"
                    >
                      <a href={`${consoleBaseURL}/settings/organizations`}>
                        <Building2Icon />
                        <span className={sidebarLabelClassName}>Organizations</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <SidebarInset className="bg-transparent [&_h1]:text-lg sm:[&_h1]:text-xl">
          <header className="flex min-h-16 items-center gap-3 border-b bg-[var(--header-bg)] px-4 backdrop-blur md:px-6">
            <SidebarTrigger />

            <img
              src={`${consoleBaseURL}/branding/niteowl.dev/niteowl-icon.png`}
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 max-w-7 shrink-0 object-contain"
              style={{ width: 28, height: 28 }}
            />

            <div className="min-w-0 shrink-0">
              <p className="truncate text-sm font-semibold">{appTitle}</p>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                NiteOwl.dev
              </p>
            </div>

            <div className="ml-auto flex min-w-0 items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Open account menu for ${displayName}`}
                  >
                    <Avatar>
                      {session.user.image ? (
                        <AvatarImage src={session.user.image} alt="" />
                      ) : null}
                      <AvatarFallback>{avatarLabel}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          {session.user.image ? (
                            <AvatarImage src={session.user.image} alt="" />
                          ) : null}
                          <AvatarFallback>{avatarLabel}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{displayName}</p>
                          {session.user.email ? (
                            <p className="truncate text-xs text-muted-foreground">
                              {session.user.email}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator />

                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onSelect={() =>
                        window.location.assign(`${consoleBaseURL}/settings/account`)
                      }
                    >
                      <SettingsIcon className="text-muted-foreground" />
                      Settings
                    </DropdownMenuItem>

                    <div className="relative">
                      <PaletteIcon className="pointer-events-none absolute left-2 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
                      <div className="pl-6">
                        <ThemeMenuControl />
                      </div>
                    </div>

                    <AccountSwitcherSubmenu
                      currentUserId={session.user.id}
                      consoleBaseURL={consoleBaseURL}
                    />
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator />

                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onSelect={() =>
                        window.location.assign(`${consoleBaseURL}/auth/sign-out`)
                      }
                    >
                      <LogOutIcon className="text-muted-foreground" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <div className="flex flex-1 flex-col [&>header:first-child]:hidden">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
