"use client";

import Link from "next/link";

import { useShallow } from "zustand/react/shallow";

import { AppLogo } from "@/components/app-logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { getSidebarItemsForRole } from "@/navigation/sidebar/sidebar-items";
import { getSystemRoleHomeRoute } from "@/navigation/sidebar/system-roles";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import { useRoleWorkspace } from "./role-workspace-provider";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { activeRole, activeUser } = useRoleWorkspace();
  const { sidebarVariant, sidebarCollapsible, isSynced } = usePreferencesStore(
    useShallow((s) => ({
      sidebarVariant: s.values.sidebar_variant,
      sidebarCollapsible: s.values.sidebar_collapsible,
      isSynced: s.isSynced,
    })),
  );

  const variant = isSynced ? sidebarVariant : props.variant;
  const collapsible = isSynced ? sidebarCollapsible : props.collapsible;
  const sidebarItems = getSidebarItemsForRole(activeRole);
  const homeUrl = getSystemRoleHomeRoute(activeRole);

  return (
    <Sidebar {...props} variant={variant} collapsible={collapsible}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" className="h-14 focus-visible:ring-2 focus-visible:ring-sky-300">
              <Link prefetch={false} href={homeUrl}>
                <AppLogo size="md" priority className="border-[var(--sidebar-active-border)] bg-[var(--sidebar-active)]" />
                <span className="font-semibold text-[var(--sidebar-text)] text-base tracking-[0.08em]">DENS CAKRA</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={sidebarItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={activeUser} />
      </SidebarFooter>
    </Sidebar>
  );
}
