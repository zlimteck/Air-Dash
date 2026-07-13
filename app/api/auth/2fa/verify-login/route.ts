import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth/session";
import { verifyPendingAuthTicket } from "@/lib/auth/pendingAuth";
import { consumeBackupCode, verifyTotpCode } from "@/lib/auth/totp";
import { rateLimitAuthAttempt } from "@/lib/auth/rateLimit";
import { writeAuditLog } from "@/lib/audit";
import { assertSameOrigin, clientIp, jsonError, userAgent } from "@/lib/http";

const schema = z.object({
  ticket: z.string().min(1),
  code: z.string().trim().min(1).max(64),
  type: z.enum(["totp", "backup"]).default("totp"),
});

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const ip = clientIp(request);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("invalid_code", 400);
  const { ticket, code, type } = parsed.data;

  const userId = await verifyPendingAuthTicket(ticket);
  if (!userId) return jsonError("invalid_token", 401);

  if (!rateLimitAuthAttempt(ip, `2fa:${userId}`)) {
    return jsonError("rate_limited", 429);
  }

  const valid =
    type === "backup"
      ? await consumeBackupCode(userId, code)
      : await verifyTotpCode(userId, code);

  if (!valid) {
    await writeAuditLog({
      userId,
      action: "login.2fa_failed",
      ipAddress: ip,
      userAgent: userAgent(request),
    });
    return jsonError("invalid_code", 401);
  }

  await createSession(userId, {
    amrMethods: ["pwd", type === "backup" ? "backup_code" : "totp"],
    ipAddress: ip,
    userAgent: userAgent(request),
  });

  await writeAuditLog({
    userId,
    action: "login.success",
    ipAddress: ip,
    userAgent: userAgent(request),
    metadata: { secondFactor: type },
  });

  return NextResponse.json({ status: "ok" });
}
