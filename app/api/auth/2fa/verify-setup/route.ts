import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { confirmTotpEnrollment } from "@/lib/auth/totp";
import { writeAuditLog } from "@/lib/audit";
import { assertSameOrigin, clientIp, jsonError, userAgent } from "@/lib/http";

const schema = z.object({ code: z.string().trim().regex(/^\d{6}$/) });

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await getSession();
  if (!auth) return jsonError("unauthorized", 401);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("invalid_code", 400);

  const backupCodes = await confirmTotpEnrollment(auth.user.id, parsed.data.code);
  if (!backupCodes) return jsonError("invalid_code", 400);

  await writeAuditLog({
    userId: auth.user.id,
    action: "2fa.enable",
    ipAddress: clientIp(request),
    userAgent: userAgent(request),
  });

  return NextResponse.json({ status: "ok", backupCodes });
}
