"use client";

import Link from "next/link";

import { useShallow } from "zustand/react/shallow";

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
            <SidebarMenuButton asChild size="lg" className="h-12">
              <Link prefetch={false} href={homeUrl}>
                <span className="flex size-9 items-center justify-center rounded-md border border-[var(--sidebar-active-border)] bg-[var(--sidebar-active)] font-bold text-[13px] text-[var(--sidebar-text)] shadow-[inset_0_0_0_1px_rgba(255,255,255,.04)]">
                  DC
                </span>
                <span className="font-bold text-[var(--sidebar-text)] text-lg tracking-wider">DENS CAKRA</span>
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
