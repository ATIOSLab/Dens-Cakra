"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

import { CircleHelp, ClipboardList, Database, File, Search, Settings } from "lucide-react";
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
import { APP_CONFIG } from "@/config/app-config";
import { rootUser, users } from "@/data/users";
import { 
  sidebarItems, 
  adminSidebarItems,
  kabinSidebarItems,
  adminRiauSidebarItems,
  analisSidebarItems,
  koordinatorSidebarItems,
  operatorSidebarItems,
  personelSidebarItems
} from "@/navigation/sidebar/sidebar-items";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import { SidebarSupportCard } from "./sidebar-support-card";

const _data = {
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: Settings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: CircleHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: Search,
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "#",
      icon: Database,
    },
    {
      name: "Reports",
      url: "#",
      icon: ClipboardList,
    },
    {
      name: "Word Assistant",
      url: "#",
      icon: File,
    },
  ],
};

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  initialRole?: string;
}

const getRoleData = (roleStr?: string) => {
  let activeRole = roleStr;
  if (!activeRole && typeof document !== "undefined") {
    const cookies = document.cookie.split(";").reduce((acc, cookie) => {
      const [key, val] = cookie.trim().split("=");
      if (key && val) {
        acc[key] = val;
      }
      return acc;
    }, {} as Record<string, string>);
    activeRole = cookies["user_role"];
  }

  switch (activeRole) {
    case "super-admin":
      return { user: users[0], items: sidebarItems };
    case "admin-nasional":
      return { user: users[1], items: adminSidebarItems };
    case "kabin-sumut":
      return { user: users[2], items: kabinSidebarItems };
    case "admin-riau":
      return { user: users[3], items: adminRiauSidebarItems };
    case "analis":
      return { user: users[4], items: analisSidebarItems };
    case "koordinator":
      return { user: users[5], items: koordinatorSidebarItems };
    case "operator":
      return { user: users[6], items: operatorSidebarItems };
    case "personel":
      return { user: users[7], items: personelSidebarItems };
    default:
      return { user: users[0], items: sidebarItems };
  }
};

export function AppSidebar({ initialRole, ...props }: AppSidebarProps) {
  const { sidebarVariant, sidebarCollapsible, isSynced } = usePreferencesStore(
    useShallow((s) => ({
      sidebarVariant: s.values.sidebar_variant,
      sidebarCollapsible: s.values.sidebar_collapsible,
      isSynced: s.isSynced,
    })),
  );

  const variant = isSynced ? sidebarVariant : props.variant;
  const collapsible = isSynced ? sidebarCollapsible : props.collapsible;

  const [currentUser, setCurrentUser] = useState(() => getRoleData(initialRole).user);
  const [activeItems, setActiveItems] = useState(() => getRoleData(initialRole).items);

  useEffect(() => {
    const data = getRoleData(initialRole);
    setCurrentUser(data.user);
    setActiveItems(data.items);
  }, [initialRole]);

  const firstItemUrl = activeItems[0]?.items[0]?.url || "/dashboard/default";

  return (
    <Sidebar {...props} variant={variant} collapsible={collapsible}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="h-auto p-2">
              <Link prefetch={false} href={firstItemUrl} className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-900 border border-slate-700/50 shadow-[0_0_10px_rgba(6,182,212,0.15)] overflow-hidden shrink-0 p-0">
                  <Image
                    src="/logo-badan-intelijen-negara.png"
                    alt="Logo Badan Intelijen Negara"
                    width={36}
                    height={36}
                    className="object-contain scale-125"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 leading-tight drop-shadow-[0_0_5px_rgba(6,182,212,0.3)]">DENS CAKRA</span>
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 leading-tight mt-0.5">Pusat Komando Nasional</span>
                  <span className="text-[9px] italic font-serif text-slate-500 leading-tight">Velox Et Exactus</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={activeItems} />
        {/* <NavDocuments items={data.documents} /> */}
        {/* <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  );
}
