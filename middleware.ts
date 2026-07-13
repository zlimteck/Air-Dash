import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/settings", "/vpn-profiles", "/stats"];
const SESSION_COOKIE = "airvpn_session";

/**
 * Cheap cookie-presence redirect only — the authoritative session check
 * (DB lookup, expiry, revocation) happens in the (app) layout / route
 * handlers, since Prisma is not available in the edge runtime.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !request.cookies.get(SESSION_COOKIE)?.value) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/vpn-profiles/:path*", "/stats/:path*"],
};
