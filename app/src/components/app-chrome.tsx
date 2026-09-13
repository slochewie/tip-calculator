import type { ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { buildNavigation, type NiteOwlIconId } from "@niteowl/app-config";
import {
  BookOpenIcon,
  Building2Icon,
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
import { OrganizationHeaderSelector } from "#/components/organization-header-selector.tsx";
import { useSevenShiftsNavigationAccess } from "#/components/calculator-tabs.tsx";
import { SevenShiftsLogo } from "#/components/seven-shifts-logo.tsx";
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
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getAppLinks() {
  const hostname = new URL(authBaseURL).hostname.toLowerCase();
  const isMccarthysDomain =
    hostname === "mccarthysirishpub.com" ||
    hostname.endsWith(".mccarthysirishpub.com");

  if (isMccarthysDomain) {
    return {
      console: "https://console.mccarthysirishpub.com/",
      "tip-calculator": "https://tips.mccarthysirishpub.com",
      counter: "https://counter.mccarthysirishpub.com",
      "network-status": "https://unifi.mccarthysirishpub.com",
    };
  }

  return {
    console: "https://console.niteowl.dev/",
    "tip-calculator": "https://tips.niteowl.dev",
    counter: "https://counter.niteowl.dev",
    "network-status": "https://unifi.niteowl.dev",
  };
}

const APP_LINKS = getAppLinks();

function NavigationIcon({ icon }: { icon: NiteOwlIconId }) {
  switch (icon) {
    case "square-terminal":
      return <SquareTerminalIcon />;
    case "hand-coins":
      return <HandCoinsIcon />;
    case "gauge":
      return <GaugeIcon />;
    case "network":
      return <NetworkIcon />;
    case "landmark":
      return <LandmarkIcon />;
    case "scroll-text":
      return <ScrollTextIcon />;
    case "scale":
      return <ScaleIcon />;
    case "users":
      return <UsersIcon />;
    case "book-open":
      return <BookOpenIcon />;
    default:
      return null;
  }
}

function SidebarNavigation({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const sevenShiftsAllowed = useSevenShiftsNavigationAccess();
  const navigation = buildNavigation({
    currentApp: "tip-calculator",
    currentPath: location.pathname,
    urls: APP_LINKS,
    canAccess: ({ key }) =>
      key === "tip-calculator:seven-shifts-navigation"
        ? sevenShiftsAllowed
        : true,
  });
  const groups = [...navigation.primary, ...navigation.apps];

  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.id}>
          {group.label ? <SidebarGroupLabel>{group.label}</SidebarGroupLabel> : null}
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => {
                const icon =
                  item.id === "seven-shifts" ? (
                    <SevenShiftsLogo className="size-4" />
                  ) : (
                    <NavigationIcon icon={item.icon} />
                  );

                if (item.external) {
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton asChild tooltip={item.label}>
                        <a href={item.href} onClick={onNavigate}>
                          {icon}
                          <span>{item.label}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={item.active}
                      tooltip={item.label}
                    >
                      <Link to={item.href} onClick={onNavigate}>
                        {icon}
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}

function MobileClosingSidebarNavigation() {
  const { setOpenMobile } = useSidebar();
  return <SidebarNavigation onNavigate={() => setOpenMobile(false)} />;
}

function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href={APP_LINKS.console}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <SquareTerminalIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">NiteOwl.dev</span>
                  <span className="truncate text-xs">Tip Calculator</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <MobileClosingSidebarNavigation />
      </SidebarContent>
    </Sidebar>
  );
}

function AccountMenu() {
  const { data: session } = authClient.useSession();

  if (!session) return null;

  const user = session.user;
  const displayName = user.name || user.email;
  const initials = getInitials(displayName);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-full outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Open account menu"
        >
          <Avatar className="size-8">
            <AvatarImage src={user.image ?? undefined} alt={displayName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <a href={`${authBaseURL}/settings`}>
              <UserCircleIcon />
              Account
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`${authBaseURL}/settings/security`}>
              <ShieldCheckIcon />
              Security
            </a>
          </DropdownMenuItem>
          <AccountSwitcherSubmenu />
          <DropdownMenuItem asChild>
            <a href={`${authBaseURL}/settings/organizations`}>
              <Building2Icon />
              Organizations
            </a>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <a href={`${authBaseURL}/settings`}>
              <SettingsIcon />
              Settings
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <PaletteIcon />
            <ThemeMenuControl />
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void authClient.signOut().then(() => {
              window.location.assign(`${authBaseURL}/auth/sign-in`);
            });
          }}
        >
          <LogOutIcon />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppChrome({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-4">
            <SidebarTrigger />
            <a
              href={APP_LINKS.console}
              className="min-w-0 truncate text-sm font-semibold"
            >
              NiteOwl.dev
            </a>
            <div className="ml-auto flex min-w-0 items-center gap-2">
              <OrganizationHeaderSelector />
              <AccountMenu />
            </div>
          </header>
          <div className="min-h-0 flex-1">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
