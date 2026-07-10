import { type NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "denscakra.session_token";
const AUTH_ROUTES = new Set(["/auth/login", "/auth/forgot-password"]);

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSessionCookie = Boolean(request.cookies.get(AUTH_COOKIE_NAME)?.value);
  const isProtectedDashboardRoute = pathname.startsWith("/dashboard");
  const isPublicAuthRoute = AUTH_ROUTES.has(pathname);

  if (!hasSessionCookie && isProtectedDashboardRoute) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSessionCookie && isPublicAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
