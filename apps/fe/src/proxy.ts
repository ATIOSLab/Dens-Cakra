import { type NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "denscakra.session_token";
const AUTH_ROUTES = new Set(["/auth/login", "/auth/forgot-password"]);
const CANONICAL_FIELD_OFFICER_ROUTES: Record<string, string> = {
  "/dashboard/field-officer/alert": "/dashboard/field-officer/ALERT",
  "/dashboard/field-officer/baket": "/dashboard/field-officer/BAKET",
  "/dashboard/field-officer/beranda": "/dashboard/field-officer/BERANDA",
  "/dashboard/field-officer/live-location": "/dashboard/field-officer/LIVE-LOCATION",
  "/dashboard/field-officer/report-map": "/dashboard/field-officer/REPORT-MAP",
  "/dashboard/field-officer/tugas-saya": "/dashboard/field-officer/tugas-saya",
  "/dashboard/field-officer/whatsapp": "/dashboard/field-officer/WHATSAPP",
};

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const canonicalPath = CANONICAL_FIELD_OFFICER_ROUTES[pathname.toLowerCase()];
  const hasSessionCookie = Boolean(request.cookies.get(AUTH_COOKIE_NAME)?.value);
  const isProtectedDashboardRoute = pathname.startsWith("/dashboard");
  const isPublicAuthRoute = AUTH_ROUTES.has(pathname);

  if (canonicalPath && pathname !== canonicalPath) {
    return NextResponse.redirect(new URL(`${canonicalPath}${search}`, request.url));
  }

  if (!hasSessionCookie && isProtectedDashboardRoute) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", `${canonicalPath || pathname}${search}`);
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
