import type { ReactNode } from "react";

import { cookies } from "next/headers";

import { requireSession } from "@/lib/auth/server-session";
import { getPreference } from "@/server/server-actions";

import { DashboardChrome } from "./_components/dashboard-chrome";

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
  const principal = await requireSession();
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const [variant, collapsible] = await Promise.all([
    getPreference("sidebar_variant"),
    getPreference("sidebar_collapsible"),
  ]);

  return (
    <DashboardChrome
      collapsible={collapsible}
      defaultOpen={defaultOpen}
      principal={principal}
      variant={variant}
    >
      {children}
    </DashboardChrome>
  );
}
