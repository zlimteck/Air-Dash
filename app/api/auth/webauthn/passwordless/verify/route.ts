import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth/session";
import { verifyPasswordlessAuthentication } from "@/lib/auth/webauthn";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import { writeAuditLog } from "@/lib/audit";
import { assertSameOrigin, clientIp, jsonError, userAgent } from "@/lib/http";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

const schema = z.object({
  challengeId: z.string().uuid(),
  response: z.record(z.string(), z.unknown()),
});

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const ip = clientIp(request);
  if (!checkRateLimit(`pwl-verify:${ip}`, 20, 15 * 60 * 1000)) {
    return jsonError("rate_limited", 429);
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("invalid_request", 400);

  const userId = await verifyPasswordlessAuthentication(
    parsed.data.challengeId,
    parsed.data.response as unknown as AuthenticationResponseJSON,
  );
  if (!userId) {
    await writeAuditLog({
      action: "login.failed",
      ipAddress: ip,
      userAgent: userAgent(request),
      metadata: { method: "passkey" },
    });
    return jsonError("invalid_code", 401);
  }

  // A user-verified passkey is inherently two-factor (possession +
  // biometric/PIN), so no additional TOTP step is required.
  await createSession(userId, {
    amrMethods: ["webauthn"],
    ipAddress: ip,
    userAgent: userAgent(request),
  });

  await writeAuditLog({
    userId,
    action: "login.success",
    ipAddress: ip,
    userAgent: userAgent(request),
    metadata: { method: "passkey" },
  });

  return NextResponse.json({ status: "ok" });
}
