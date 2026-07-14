import { type NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "denscakra.session_token";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSessionCookie = Boolean(request.cookies.get(AUTH_COOKIE_NAME)?.value);
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
