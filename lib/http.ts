import "server-only";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function userAgent(request: NextRequest): string | null {
  return request.headers.get("user-agent");
}

/**
 * CSRF defense-in-depth for state-changing routes: the request's Origin
 * (or Referer fallback) must match the app's own origin.
 */
export function assertSameOrigin(request: NextRequest): NextResponse | null {
  const expected = new URL(env().APP_ORIGIN).origin;
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  const actual = origin ?? (referer ? new URL(referer).origin : null);
  if (actual !== expected) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  return null;
}

export function jsonError(error: string, status: number): NextResponse {
  return NextResponse.json({ error }, { status });
}
