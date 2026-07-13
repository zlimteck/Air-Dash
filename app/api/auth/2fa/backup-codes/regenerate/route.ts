import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { regenerateBackupCodes } from "@/lib/auth/totp";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { assertSameOrigin, clientIp, jsonError, userAgent } from "@/lib/http";

const schema = z.object({ password: z.string().min(1).max(128) });

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await getSession();
  if (!auth) return jsonError("unauthorized", 401);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("invalid_request", 400);

  const passwordOk = await verifyPassword(parsed.data.password, auth.user.passwordHash);
  if (!passwordOk) return jsonError("invalid_credentials", 403);

  const twoFactor = await db.twoFactorSecret.findUnique({ where: { userId: auth.user.id } });
  if (!twoFactor?.enabled) return jsonError("invalid_request", 400);

  const backupCodes = await regenerateBackupCodes(auth.user.id);

  await writeAuditLog({
    userId: auth.user.id,
    action: "2fa.backup_codes_regenerated",
    ipAddress: clientIp(request),
    userAgent: userAgent(request),
  });

  return NextResponse.json({ status: "ok", backupCodes });
}
