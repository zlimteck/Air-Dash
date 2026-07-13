import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createEmailVerificationToken } from "@/lib/auth/tokens";
import { sendAccountExistsEmail, sendVerificationEmail } from "@/lib/email/mailer";
import { rateLimitAuthAttempt } from "@/lib/auth/rateLimit";
import { writeAuditLog } from "@/lib/audit";
import { signupSchema } from "@/lib/validation/auth";
import { assertSameOrigin, clientIp, jsonError, userAgent } from "@/lib/http";
import { cookies } from "next/headers";
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

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    const passwordIssue = parsed.error.issues.find((i) => i.path[0] === "password");
    return jsonError(passwordIssue ? "invalid_password" : "invalid_request", 400);
  }
  const { email, password } = parsed.data;

  if (!rateLimitAuthAttempt(ip, email)) {
    return jsonError("rate_limited", 429);
  }

  const cookieStore = await cookies();
  const locale = cookieStore.get(localeCookieName)?.value ?? "en";

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    // Anti-enumeration: same response as success; notify the real owner instead.
    sendAccountExistsEmail(email, locale).catch(() => {});
    return NextResponse.json({ status: "check_email" });
  }

  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: { email, passwordHash, preferredLocale: locale },
  });

  const token = await createEmailVerificationToken(user.id);

  try {
    await sendVerificationEmail(email, token, locale);
  } catch {
    // Keep the account; the user can request a fresh link from the login page.
  }

  await writeAuditLog({
    userId: user.id,
    action: "signup",
    ipAddress: ip,
    userAgent: userAgent(request),
  });

  return NextResponse.json({ status: "check_email" });
}
