import type { SystemRole } from "@/navigation/sidebar/system-roles";

export type AuthPrincipalUser = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  image: string | null;
  role: SystemRole;
  emailVerified: boolean;
};

export type AuthPrincipalSession = Record<string, unknown> & {
  id: string;
  expiresAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  locationLabel?: string | null;
};

export type SessionPrincipal = {
  user: AuthPrincipalUser;
  session: AuthPrincipalSession;
  role: SystemRole;
  homeRoute: string;
};
