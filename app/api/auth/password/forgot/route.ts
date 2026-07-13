import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { createPasswordResetToken } from "@/lib/auth/tokens";
import { sendPasswordResetEmail } from "@/lib/email/mailer";
import { rateLimitAuthAttempt } from "@/lib/auth/rateLimit";
import { writeAuditLog } from "@/lib/audit";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { assertSameOrigin, clientIp, jsonError, userAgent } from "@/lib/http";
import { localeCookieName } from "@/i18n/routing";

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

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) return jsonError("invalid_request", 400);
  const { email } = parsed.data;

  if (!rateLimitAuthAttempt(ip, email)) {
    return jsonError("rate_limited", 429);
  }

  const cookieStore = await cookies();
  const locale = cookieStore.get(localeCookieName)?.value ?? "en";

  const user = await db.user.findUnique({ where: { email } });
  // Anti-enumeration: identical response whether or not the account exists.
  if (user) {
    const token = await createPasswordResetToken(user.id);
    sendPasswordResetEmail(email, token, user.preferredLocale ?? locale).catch(() => {});
    await writeAuditLog({
      userId: user.id,
      action: "password.reset_requested",
      ipAddress: ip,
      userAgent: userAgent(request),
    });
  }

  return NextResponse.json({ status: "check_email" });
}
