import "server-only";

import { cache } from "react";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  getSystemRoleHomeRoute,
  parseSystemRole,
  type SystemRole,
} from "@/navigation/sidebar/system-roles";

import { getBackendInternalUrl } from "./backend-url";
import type { SessionPrincipal } from "./types";

type AuthMeResponse = {
  user?: {
    id?: string;
    name?: string;
    email?: string;
    image?: string | null;
    role?: string | null;
    emailVerified?: boolean;
  } | null;
  session?: {
    id?: string;
    expiresAt?: string;
  } | null;
};

async function buildForwardedHeaders() {
  const requestHeaders = await headers();
  const forwardedHeaders = new Headers({
    accept: "application/json",
  });

  for (const headerName of ["cookie", "user-agent", "accept-language", "x-forwarded-for"]) {
    const value = requestHeaders.get(headerName);

    if (value) {
      forwardedHeaders.set(headerName, value);
    }
  }

  return forwardedHeaders;
}

export const getSessionPrincipal = cache(async (): Promise<SessionPrincipal | null> => {
  const forwardedHeaders = await buildForwardedHeaders();

  if (!forwardedHeaders.get("cookie")) {
    return null;
  }

  const response = await fetch(`${getBackendInternalUrl()}/v1/auth/me`, {
    headers: forwardedHeaders,
    cache: "no-store",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load authenticated session. Received ${response.status}.`);
  }

  const payload = (await response.json()) as AuthMeResponse;
  const role = parseSystemRole(payload.user?.role);

  if (
    !role ||
    !payload.user?.id ||
    !payload.user.name ||
    !payload.user.email ||
    !payload.session?.id ||
    !payload.session.expiresAt
  ) {
    return null;
  }

  return {
    user: {
      id: payload.user.id,
      name: payload.user.name,
      email: payload.user.email,
      image: payload.user.image ?? null,
      role,
      emailVerified: Boolean(payload.user.emailVerified),
    },
    session: {
      ...payload.session,
      id: payload.session.id,
      expiresAt: payload.session.expiresAt,
    },
    role,
    homeRoute: getSystemRoleHomeRoute(role),
  };
});

export async function requireSession(loginRedirect = "/auth/login"): Promise<SessionPrincipal> {
  const principal = await getSessionPrincipal();

  if (!principal) {
    redirect(loginRedirect);
  }

  return principal;
}

export async function requireRole(role: SystemRole): Promise<SessionPrincipal> {
  const principal = await requireSession();

  if (principal.role !== role) {
    redirect("/unauthorized");
  }

  return principal;
}
