import { NextRequest, NextResponse } from "next/server";
import { destroyCurrentSession, getSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { assertSameOrigin, clientIp, userAgent } from "@/lib/http";

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await getSession();
  await destroyCurrentSession();

  if (auth) {
    await writeAuditLog({
      userId: auth.user.id,
      action: "logout",
      ipAddress: clientIp(request),
      userAgent: userAgent(request),
    });
  }

  return NextResponse.json({ status: "ok" });
}
