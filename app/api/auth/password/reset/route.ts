import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { consumePasswordResetToken } from "@/lib/auth/tokens";
import { revokeAllSessionsForUser } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { assertSameOrigin, clientIp, jsonError, userAgent } from "@/lib/http";

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("invalid_request", 400);
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    const passwordIssue = parsed.error.issues.find((i) => i.path[0] === "password");
    return jsonError(passwordIssue ? "invalid_password" : "invalid_token", 400);
  }
  const { token, password } = parsed.data;

  const userId = await consumePasswordResetToken(token);
  if (!userId) return jsonError("invalid_token", 400);

  const passwordHash = await hashPassword(password);
  await db.user.update({
    where: { id: userId },
    // A password reset proves email ownership, so mark verified too.
    data: { passwordHash, emailVerified: true },
  });

  // A password reset invalidates every existing session.
  await revokeAllSessionsForUser(userId);

  await writeAuditLog({
    userId,
    action: "password.reset_completed",
    ipAddress: clientIp(request),
    userAgent: userAgent(request),
  });

  return NextResponse.json({ status: "ok" });
}
