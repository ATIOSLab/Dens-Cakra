import type { ReactNode } from "react";

import { cookies } from "next/headers";

import { AppSidebar } from "@/app/(main)/dashboard/_components/sidebar/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { requireSession } from "@/lib/auth/server-session";
import { cn } from "@/lib/utils";
import { getPreference } from "@/server/server-actions";

import { AccountSwitcher } from "./_components/sidebar/account-switcher";
import { ClientNetworkBadge, ClientNetworkProvider } from "./_components/sidebar/client-network";
import { LayoutControls } from "./_components/sidebar/layout-controls";
import { NotificationsMenu } from "./_components/sidebar/notifications-menu";
import { RoleWorkspaceProvider } from "./_components/sidebar/role-workspace-provider";
import { SearchDialog } from "./_components/sidebar/search-dialog";
import { ThemeSwitcher } from "./_components/sidebar/theme-switcher";

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
        <ClientNetworkProvider
          network={{
            ipAddress: principal.session.ipAddress ?? "IP tidak tersedia",
            locationLabel: principal.session.locationLabel ?? "Lokasi tidak tersedia",
          }}
        >
          <AppSidebar variant={variant} collapsible={collapsible} />
          <SidebarInset
            className={cn(
              "[html[data-content-layout=centered]_&>*]:mx-auto",
              "[html[data-content-layout=centered]_&>*]:w-full",
              "[html[data-content-layout=centered]_&>*]:max-w-screen-2xl",
              "peer-data-[variant=inset]:border",
              "[--dashboard-header-height:var(--dc-topbar-height)]",
              "min-w-0 overflow-x-clip",
            )}
          >
            <header
              className={cn(
                "flex h-14 shrink-0 items-center gap-2 border-[var(--dc-divider)] border-b bg-[color-mix(in_srgb,var(--dc-card)_86%,transparent)] shadow-[0_1px_0_var(--dc-divider)] backdrop-blur-xl transition-[width,height] ease-linear md:h-[var(--dc-topbar-height)] group-has-data-[collapsible=icon]/sidebar-wrapper:md:h-[var(--dc-topbar-height)]",
                "[html[data-navbar-style=sticky]_&]:sticky [html[data-navbar-style=sticky]_&]:top-0 [html[data-navbar-style=sticky]_&]:z-50 [html[data-navbar-style=sticky]_&]:overflow-hidden [html[data-navbar-style=sticky]_&]:rounded-t-[inherit]",
              )}
            >
              <div className="flex w-full items-center justify-between px-4 lg:px-6">
                <div className="flex items-center gap-1 lg:gap-2">
                  <SidebarTrigger className="-ml-1" />
                  <Separator
                    orientation="vertical"
                    className="mx-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
                  />
                  <SearchDialog />
                </div>
                <div className="flex items-center gap-2">
                  <ClientNetworkBadge />
                  <LayoutControls />
                  <NotificationsMenu />
                  <ThemeSwitcher />
                  <AccountSwitcher />
                </div>
              </div>
            </header>
            <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden p-3 has-data-[content-padding=false]:p-0 md:p-4 md:has-data-[content-padding=false]:p-0 xl:p-5 xl:has-data-[content-padding=false]:p-0">
              {children}
            </div>
          </SidebarInset>
        </ClientNetworkProvider>
      </RoleWorkspaceProvider>
    </SidebarProvider>
  );
}
