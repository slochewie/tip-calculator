import type { ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { buildNavigation, getDefaultAppUrls } from "@niteowl/app-config";
import { AppSidebarIdentity, NiteOwlNavigationIcon } from "@niteowl/ui";
import {
  Building2Icon,
  LogOutIcon,
  PaletteIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UserCircleIcon,
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

const APP_LINKS = getDefaultAppUrls(new URL(authBaseURL).hostname);

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
                const icon = (
                  <NiteOwlNavigationIcon
                    icon={item.icon}
                    overrides={{
                      "seven-shifts": <SevenShiftsLogo className="size-4" />,
                    }}
                  />
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
        <AppSidebarIdentity
          href={APP_LINKS.console}
          appName="Tip Calculator"
        />
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
