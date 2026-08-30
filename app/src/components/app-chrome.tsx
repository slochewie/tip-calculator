import type { ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  Building2Icon,
  CalculatorIcon,
  GaugeIcon,
  LogOutIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
  SquareTerminalIcon,
  UserCircleIcon,
} from "lucide-react";

import { ThemeSwitcher } from "#/components/theme-switcher.tsx";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "#/components/ui/avatar.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
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
    };
  }

  return {
    console: "https://console.niteowl.dev",
    counter: "https://counter.niteowl.dev",
  };
}

const sidebarButtonClassName =
  "text-base [&>svg]:size-5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2";
const sidebarLabelClassName =
  "truncate group-data-[collapsible=icon]:hidden";

export function AppChrome({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { data: session } = authClient.useSession();

  if (!session) {
    return children;
  }

  const displayName = session.user.name || session.user.email;
  const avatarLabel = getInitials(displayName);
  const consoleBaseURL = authBaseURL.replace(/\/$/, "");

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader className="px-3 py-4">
            <div className="text-base font-semibold group-data-[collapsible=icon]:hidden">
              NiteOwl
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className={sidebarButtonClassName}
                      isActive={location.pathname === "/app"}
                      tooltip="Tip Calculator"
                    >
                      <Link to="/app">
                        <CalculatorIcon />
                        <span className={sidebarLabelClassName}>Tip Calculator</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className={sidebarButtonClassName}
                      isActive={location.pathname === "/reports"}
                      tooltip="Reports"
                    >
                      <Link to="/reports">
                        <ReceiptTextIcon />
                        <span className={sidebarLabelClassName}>Reports</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
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
              <p className="truncate text-sm font-semibold">Tip Claim Calculator</p>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                NiteOwl.dev
              </p>
            </div>

            <div className="ml-auto flex min-w-0 items-center gap-2">
              <ThemeSwitcher inline />

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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void authClient.signOut()}>
                    <LogOutIcon />
                    Sign out
                  </DropdownMenuItem>
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
