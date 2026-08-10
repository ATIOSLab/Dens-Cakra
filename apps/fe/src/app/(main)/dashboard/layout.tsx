import type { ReactNode } from "react";

import { cookies } from "next/headers";

import { AppSidebar } from "@/app/(main)/dashboard/_components/sidebar/app-sidebar";
import { RouteProgressBar } from "@/components/route-progress-bar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { requireSession } from "@/lib/auth/server-session";
import { cn } from "@/lib/utils";
import { getPreference } from "@/server/server-actions";

import { LiveOperationsIndicator } from "./_components/live-operations-indicator";
import { SessionHeartbeat } from "./_components/session-heartbeat";
import { AccountSwitcher } from "./_components/sidebar/account-switcher";
import { ClientNetworkBadge, ClientNetworkProvider } from "./_components/sidebar/client-network";
import { LayoutControls } from "./_components/sidebar/layout-controls";
import { NotificationsMenu } from "./_components/sidebar/notifications-menu";
import { RoleWorkspaceProvider } from "./_components/sidebar/role-workspace-provider";
import { SearchDialog } from "./_components/sidebar/search-dialog";
import { ThemeSwitcher } from "./_components/sidebar/theme-switcher";
import { UserAreaBadge } from "./_components/sidebar/user-area-badge";

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
  const principal = await requireSession();
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const [variant, collapsible] = await Promise.all([
    getPreference("sidebar_variant"),
    getPreference("sidebar_collapsible"),
  ]);

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={
        {
          "--sidebar-width": "var(--dc-sidebar-width)",
          "--sidebar-width-icon": "var(--dc-sidebar-collapsed)",
        } as React.CSSProperties
      }
    >
      <RoleWorkspaceProvider principal={principal}>
        <RouteProgressBar />
        <SessionHeartbeat />
        <ClientNetworkProvider
          network={{
            ipAddress: principal.session.ipAddress ?? "IP tidak tersedia",
            locationLabel: principal.session.locationLabel ?? "Lokasi tidak tersedia",
          }}
        >
          <AppSidebar variant={variant} collapsible={collapsible} />
          <SidebarInset
            className={cn(
              "peer-data-[variant=inset]:border",
              "[--dashboard-header-height:var(--dc-topbar-height)]",
              "min-w-0 overflow-x-clip",
            )}
          >
            <header
              className={cn(
                "flex h-[var(--dc-topbar-height)] shrink-0 items-center gap-2 border-[var(--dc-divider)] border-b bg-[color-mix(in_srgb,var(--dc-card)_94%,transparent)] shadow-[0_1px_0_var(--dc-divider)] backdrop-blur-xl transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-[var(--dc-topbar-height)]",
                "[html[data-navbar-style=sticky]_&]:sticky [html[data-navbar-style=sticky]_&]:top-0 [html[data-navbar-style=sticky]_&]:z-50 [html[data-navbar-style=sticky]_&]:overflow-hidden [html[data-navbar-style=sticky]_&]:rounded-t-[inherit]",
              )}
            >
              <div className="flex w-full min-w-0 items-center justify-between gap-2 px-[var(--dc-page-gutter)] lg:gap-3">
                <div className="flex min-w-0 items-center gap-1 lg:gap-2">
                  <SidebarTrigger className="-ml-1" />
                  <Separator
                    orientation="vertical"
                    className="mx-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
                  />
                  <SearchDialog />
                </div>
                <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-1.5 lg:gap-2">
                  <LiveOperationsIndicator />
                  <UserAreaBadge />
                  <ClientNetworkBadge />
                  <LayoutControls />
                  <NotificationsMenu />
                  <ThemeSwitcher />
                  <AccountSwitcher />
                </div>
              </div>
            </header>
            <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden p-[var(--dc-page-gutter)] has-data-[content-padding=false]:p-0">
              <div className="dc-dashboard-stage">{children}</div>
            </div>
          </SidebarInset>
        </ClientNetworkProvider>
      </RoleWorkspaceProvider>
    </SidebarProvider>
  );
}
