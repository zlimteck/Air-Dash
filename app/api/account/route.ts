import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { getSession, SESSION_COOKIE } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { assertSameOrigin, clientIp, jsonError, userAgent } from "@/lib/http";

const schema = z.object({ password: z.string().min(1).max(128) });

/** Permanently deletes the account and everything attached to it (cascades). */
export async function DELETE(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await getSession();
  if (!auth) return jsonError("unauthorized", 401);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("invalid_request", 400);

  const passwordOk = await verifyPassword(parsed.data.password, auth.user.passwordHash);
  if (!passwordOk) return jsonError("invalid_credentials", 403);

  // Audit before deletion: the row survives with userId nulled (SetNull).
  await writeAuditLog({
    userId: auth.user.id,
    action: "account.deleted",
    ipAddress: clientIp(request),
    userAgent: userAgent(request),
    metadata: { email: auth.user.email },
  });

  await db.user.delete({ where: { id: auth.user.id } });

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);

  return NextResponse.json({ status: "ok" });
}
