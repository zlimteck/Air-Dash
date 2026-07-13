import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth/session";
import { verifyPendingAuthTicket } from "@/lib/auth/pendingAuth";
import { verifyAuthentication } from "@/lib/auth/webauthn";
import { rateLimitAuthAttempt } from "@/lib/auth/rateLimit";
import { writeAuditLog } from "@/lib/audit";
import { assertSameOrigin, clientIp, jsonError, userAgent } from "@/lib/http";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

const schema = z.object({
  ticket: z.string().min(1),
  response: z.record(z.string(), z.unknown()),
});

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const ip = clientIp(request);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("invalid_request", 400);

  const userId = await verifyPendingAuthTicket(parsed.data.ticket);
  if (!userId) return jsonError("invalid_token", 401);

  if (!rateLimitAuthAttempt(ip, `webauthn:${userId}`)) {
    return jsonError("rate_limited", 429);
  }

  const ok = await verifyAuthentication(
    userId,
    parsed.data.response as unknown as AuthenticationResponseJSON,
  );
  if (!ok) {
    await writeAuditLog({
      userId,
      action: "login.2fa_failed",
      ipAddress: ip,
      userAgent: userAgent(request),
      metadata: { secondFactor: "webauthn" },
    });
    return jsonError("invalid_code", 401);
  }

  await createSession(userId, {
    amrMethods: ["pwd", "webauthn"],
    ipAddress: ip,
    userAgent: userAgent(request),
  });

  await writeAuditLog({
    userId,
    action: "login.success",
    ipAddress: ip,
    userAgent: userAgent(request),
    metadata: { secondFactor: "webauthn" },
  });

  return NextResponse.json({ status: "ok" });
}
