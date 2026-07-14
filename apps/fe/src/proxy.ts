import { type NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAMES = ["denscakra.session_token", "__Secure-denscakra.session_token"] as const;

function hasAuthSessionCookie(request: NextRequest) {
  return AUTH_COOKIE_NAMES.some((cookieName) => Boolean(request.cookies.get(cookieName)?.value));
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSessionCookie = hasAuthSessionCookie(request);
  const isProtectedDashboardRoute = pathname.startsWith("/dashboard");

  if (!hasSessionCookie && isProtectedDashboardRoute) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
