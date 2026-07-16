import "server-only";

import { cache } from "react";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getSystemRoleHomeRoute, parseSystemRole, type SystemRole } from "@/navigation/sidebar/system-roles";

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
    ipAddress?: string | null;
    userAgent?: string | null;
    locationLabel?: string | null;
  } | null;
};

type ApiEnvelope<T> = {
  success: true;
  data: T;
};

type AuthSessionPayload = AuthMeResponse | null;

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

  let response: Response;
  try {
    response = await fetch(`${getBackendInternalUrl()}/api/auth/get-session`, {
      headers: forwardedHeaders,
      cache: "no-store",
    });
  } catch {
    return null;
  }

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load authenticated session. Received ${response.status}.`);
  }

  const envelope = (await response.json()) as ApiEnvelope<AuthSessionPayload> | AuthSessionPayload;
  const payload = envelope && "success" in envelope ? envelope.data : envelope;

  if (!payload) {
    return null;
  }
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
      ipAddress: payload.session.ipAddress ?? null,
      userAgent: payload.session.userAgent ?? null,
      locationLabel: payload.session.locationLabel ?? null,
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
