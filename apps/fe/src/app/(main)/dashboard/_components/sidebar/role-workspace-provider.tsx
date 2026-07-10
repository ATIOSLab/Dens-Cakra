"use client";

import { createContext, useContext } from "react";

import type { SessionPrincipal } from "@/lib/auth/types";
import type { SystemRole } from "@/navigation/sidebar/system-roles";

type RoleWorkspaceContextValue = {
  activeRole: SystemRole;
  activeUser: SessionPrincipal["user"] & {
    avatar: string;
  };
  principal: SessionPrincipal;
};

const RoleWorkspaceContext = createContext<RoleWorkspaceContextValue | null>(null);

export function RoleWorkspaceProvider({
  children,
  principal,
}: Readonly<{
  children: React.ReactNode;
  principal: SessionPrincipal;
}>) {
  const activeRole = principal.role;
  const activeUser = {
    ...principal.user,
    avatar: principal.user.image ?? "",
  };

  return (
    <RoleWorkspaceContext.Provider
      value={{
        activeRole,
        activeUser,
        principal,
      }}
    >
      {children}
    </RoleWorkspaceContext.Provider>
  );
}

export function useRoleWorkspace() {
  const context = useContext(RoleWorkspaceContext);

  if (!context) {
    throw new Error("useRoleWorkspace must be used within a RoleWorkspaceProvider.");
  }

  return context;
}
