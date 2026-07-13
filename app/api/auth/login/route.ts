import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { rateLimitAuthAttempt } from "@/lib/auth/rateLimit";
import { writeAuditLog } from "@/lib/audit";
import { loginSchema } from "@/lib/validation/auth";
import { assertSameOrigin, clientIp, jsonError, userAgent } from "@/lib/http";
import { issuePendingAuthTicket } from "@/lib/auth/pendingAuth";

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const ip = clientIp(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("invalid_request", 400);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return jsonError("invalid_credentials", 401);
  const { email, password } = parsed.data;

  if (!rateLimitAuthAttempt(ip, email)) {
    return jsonError("rate_limited", 429);
  }

  const user = await db.user.findUnique({
    where: { email },
    include: { twoFactor: true, webauthnCredentials: { select: { id: true } } },
  });

  const passwordOk = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !passwordOk) {
    await writeAuditLog({
      userId: user?.id,
      action: "login.failed",
      ipAddress: ip,
      userAgent: userAgent(request),
    });
    return jsonError("invalid_credentials", 401);
  }

  if (!user.emailVerified) {
    return jsonError("email_not_verified", 403);
  }

  const totpEnabled = user.twoFactor?.enabled ?? false;
  const hasPasskeys = user.webauthnCredentials.length > 0;

  if (totpEnabled || hasPasskeys) {
    const ticket = await issuePendingAuthTicket(user.id);
    return NextResponse.json({
      status: "second_factor_required",
      methods: [...(totpEnabled ? ["totp"] : []), ...(hasPasskeys ? ["webauthn"] : [])],
      ticket,
    });
  }

  await createSession(user.id, {
    amrMethods: ["pwd"],
    ipAddress: ip,
    userAgent: userAgent(request),
  });

  await writeAuditLog({
    userId: user.id,
    action: "login.success",
    ipAddress: ip,
    userAgent: userAgent(request),
  });

  return NextResponse.json({ status: "ok" });
}
