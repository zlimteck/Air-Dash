import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { createEmailVerificationToken } from "@/lib/auth/tokens";
import { sendVerificationEmail } from "@/lib/email/mailer";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { emailSchema } from "@/lib/validation/auth";
import { rateLimitAuthAttempt } from "@/lib/auth/rateLimit";
import { assertSameOrigin, clientIp, jsonError, userAgent } from "@/lib/http";

const schema = z.object({
  password: z.string().min(1).max(128),
  newEmail: emailSchema,
});

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await getSession();
  if (!auth) return jsonError("unauthorized", 401);

  const ip = clientIp(request);
  if (!rateLimitAuthAttempt(ip, `email-change:${auth.user.id}`)) {
    return jsonError("rate_limited", 429);
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("invalid_request", 400);
  const { password, newEmail } = parsed.data;

  const passwordOk = await verifyPassword(password, auth.user.passwordHash);
  if (!passwordOk) return jsonError("invalid_credentials", 403);

  if (newEmail === auth.user.email) return jsonError("invalid_request", 400);

  // Anti-enumeration: same response whether or not the address is taken;
  // the switch simply never completes for a taken address.
  const taken = await db.user.findUnique({ where: { email: newEmail } });
  if (!taken) {
    await db.user.update({
      where: { id: auth.user.id },
      data: { pendingEmail: newEmail },
    });
    const token = await createEmailVerificationToken(auth.user.id);
    sendVerificationEmail(newEmail, token, auth.user.preferredLocale ?? "en").catch(() => {});
  }

  await writeAuditLog({
    userId: auth.user.id,
    action: "email.change_requested",
    ipAddress: ip,
    userAgent: userAgent(request),
  });

  return NextResponse.json({ status: "check_email" });
}
