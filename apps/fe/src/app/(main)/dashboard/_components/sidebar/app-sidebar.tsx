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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { sidebarVariant, sidebarCollapsible, isSynced } = usePreferencesStore(
    useShallow((s) => ({
      sidebarVariant: s.values.sidebar_variant,
      sidebarCollapsible: s.values.sidebar_collapsible,
      isSynced: s.isSynced,
    })),
  );

  const variant = isSynced ? sidebarVariant : props.variant;
  const collapsible = isSynced ? sidebarCollapsible : props.collapsible;

  const [currentUser, setCurrentUser] = useState(rootUser);
  const [activeItems, setActiveItems] = useState(sidebarItems);

  useEffect(() => {
    const cookies = document.cookie.split(";").reduce((acc, cookie) => {
      const [key, val] = cookie.trim().split("=");
      if (key && val) {
        acc[key] = val;
      }
      return acc;
    }, {} as Record<string, string>);

    const activeRole = cookies["user_role"];
    switch (activeRole) {
      case "super-admin":
        setCurrentUser(users[0]);
        setActiveItems(sidebarItems);
        break;
      case "admin-nasional":
        setCurrentUser(users[1]);
        setActiveItems(adminSidebarItems);
        break;
      case "kabin-sumut":
        setCurrentUser(users[2]);
        setActiveItems(kabinSidebarItems);
        break;
      case "admin-riau":
        setCurrentUser(users[3]);
        setActiveItems(adminRiauSidebarItems);
        break;
      case "analis":
        setCurrentUser(users[4]);
        setActiveItems(analisSidebarItems);
        break;
      case "koordinator":
        setCurrentUser(users[5]);
        setActiveItems(koordinatorSidebarItems);
        break;
      case "operator":
        setCurrentUser(users[6]);
        setActiveItems(operatorSidebarItems);
        break;
      case "personel":
        setCurrentUser(users[7]);
        setActiveItems(personelSidebarItems);
        break;
      default:
        setCurrentUser(users[0]);
        setActiveItems(sidebarItems);
    }
  }, []);

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
