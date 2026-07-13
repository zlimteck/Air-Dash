import { NextRequest, NextResponse } from "next/server";
import { getSession, revokeAllSessionsForUser } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { assertSameOrigin, clientIp, jsonError, userAgent } from "@/lib/http";

/** Revokes every session except the current one. */
export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await getSession();
  if (!auth) return jsonError("unauthorized", 401);

  await revokeAllSessionsForUser(auth.user.id, auth.session.id);

  await writeAuditLog({
    userId: auth.user.id,
    action: "session.revoked",
    ipAddress: clientIp(request),
    userAgent: userAgent(request),
    metadata: { scope: "all_others" },
  });

  return NextResponse.json({ status: "ok" });
}
