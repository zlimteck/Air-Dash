import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { verifyRegistration } from "@/lib/auth/webauthn";
import { writeAuditLog } from "@/lib/audit";
import { assertSameOrigin, clientIp, jsonError, userAgent } from "@/lib/http";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";

const schema = z.object({
  response: z.record(z.string(), z.unknown()),
  deviceName: z.string().trim().max(64).optional(),
});

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await getSession();
  if (!auth) return jsonError("unauthorized", 401);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("invalid_request", 400);

  const ok = await verifyRegistration(
    auth.user.id,
    parsed.data.response as unknown as RegistrationResponseJSON,
    parsed.data.deviceName ?? null,
  );
  if (!ok) return jsonError("invalid_request", 400);

  await writeAuditLog({
    userId: auth.user.id,
    action: "passkey.register",
    ipAddress: clientIp(request),
    userAgent: userAgent(request),
  });

  return NextResponse.json({ status: "ok" });
}
