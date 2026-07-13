import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { disconnectSessions } from "@/lib/airvpn/client";
import { decryptUserApiKey } from "@/lib/airvpn/userKey";
import { AirVpnApiError } from "@/lib/airvpn/errors";
import { writeAuditLog } from "@/lib/audit";
import { assertSameOrigin, clientIp, jsonError, userAgent } from "@/lib/http";

const schema = z.object({
  server: z.string().trim().max(64).optional(),
  device: z.string().trim().max(64).optional(),
});

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await getSession();
  if (!auth) return jsonError("unauthorized", 401);

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError("invalid_request", 400);

  const apiKey = decryptUserApiKey(auth.user);
  if (!apiKey) return jsonError("no_api_key", 404);

  try {
    await disconnectSessions(apiKey, parsed.data);
  } catch (err) {
    if (err instanceof AirVpnApiError && err.code === "invalid_key") {
      return jsonError("invalid_api_key", 400);
    }
    return jsonError("airvpn_unavailable", 502);
  }

  await writeAuditLog({
    userId: auth.user.id,
    action: "vpn.disconnect",
    ipAddress: clientIp(request),
    userAgent: userAgent(request),
    metadata: {
      server: parsed.data.server ?? null,
      device: parsed.data.device ?? null,
    },
  });

  return NextResponse.json({ status: "ok" });
}
