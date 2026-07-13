import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { assertSameOrigin, clientIp, jsonError, userAgent } from "@/lib/http";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await getSession();
  if (!auth) return jsonError("unauthorized", 401);

  const { id } = await params;

  const deleted = await db.webAuthnCredential.deleteMany({
    where: { id, userId: auth.user.id },
  });
  if (deleted.count === 0) return jsonError("invalid_request", 404);

  await writeAuditLog({
    userId: auth.user.id,
    action: "passkey.remove",
    ipAddress: clientIp(request),
    userAgent: userAgent(request),
  });

  return NextResponse.json({ status: "ok" });
}
