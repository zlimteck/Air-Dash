import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, revokeAllSessionsForUser } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { passwordSchema } from "@/lib/validation/auth";
import { assertSameOrigin, clientIp, jsonError, userAgent } from "@/lib/http";

const schema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await getSession();
  if (!auth) return jsonError("unauthorized", 401);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const newIssue = parsed.error.issues.find((i) => i.path[0] === "newPassword");
    return jsonError(newIssue ? "invalid_password" : "invalid_request", 400);
  }

  const currentOk = await verifyPassword(parsed.data.currentPassword, auth.user.passwordHash);
  if (!currentOk) return jsonError("invalid_credentials", 403);

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await db.user.update({
    where: { id: auth.user.id },
    data: { passwordHash },
  });

  // Sign out every other session; the current one stays valid.
  await revokeAllSessionsForUser(auth.user.id, auth.session.id);

  await writeAuditLog({
    userId: auth.user.id,
    action: "password.changed",
    ipAddress: clientIp(request),
    userAgent: userAgent(request),
  });

  return NextResponse.json({ status: "ok" });
}
