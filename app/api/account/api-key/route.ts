import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { seal } from "@/lib/crypto/secretBox";
import { validateApiKey } from "@/lib/airvpn/client";
import { AirVpnApiError } from "@/lib/airvpn/errors";
import { writeAuditLog } from "@/lib/audit";
import { assertSameOrigin, clientIp, jsonError, userAgent } from "@/lib/http";

const schema = z.object({ apiKey: z.string().trim().min(8).max(256) });

export async function PUT(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await getSession();
  if (!auth) return jsonError("unauthorized", 401);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("invalid_request", 400);
  const { apiKey } = parsed.data;

  // Validate against AirVPN before storing, so the user gets immediate
  // feedback instead of a broken dashboard later.
  try {
    await validateApiKey(apiKey);
  } catch (err) {
    if (err instanceof AirVpnApiError && err.code === "invalid_key") {
      return jsonError("invalid_api_key", 400);
    }
    return jsonError("airvpn_unavailable", 502);
  }

  const sealed = seal(apiKey);
  await db.user.update({
    where: { id: auth.user.id },
    data: {
      airvpnKeyCiphertext: sealed.ciphertext,
      airvpnKeyIv: sealed.iv,
      airvpnKeyAuthTag: sealed.authTag,
      airvpnKeyUpdatedAt: new Date(),
    },
  });

  await writeAuditLog({
    userId: auth.user.id,
    action: "api_key.update",
    ipAddress: clientIp(request),
    userAgent: userAgent(request),
  });

  return NextResponse.json({ status: "ok" });
}

export async function DELETE(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await getSession();
  if (!auth) return jsonError("unauthorized", 401);

  await db.user.update({
    where: { id: auth.user.id },
    data: {
      airvpnKeyCiphertext: null,
      airvpnKeyIv: null,
      airvpnKeyAuthTag: null,
      airvpnKeyUpdatedAt: null,
    },
  });

  await writeAuditLog({
    userId: auth.user.id,
    action: "api_key.remove",
    ipAddress: clientIp(request),
    userAgent: userAgent(request),
  });

  return NextResponse.json({ status: "ok" });
}
