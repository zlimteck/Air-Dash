import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { addDevice } from "@/lib/airvpn/client";
import { decryptUserApiKey } from "@/lib/airvpn/userKey";
import { AirVpnApiError } from "@/lib/airvpn/errors";
import { writeAuditLog } from "@/lib/audit";
import { assertSameOrigin, clientIp, jsonError, userAgent } from "@/lib/http";

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await getSession();
  if (!auth) return jsonError("unauthorized", 401);

  const apiKey = decryptUserApiKey(auth.user);
  if (!apiKey) return jsonError("no_api_key", 404);

  let deviceId: string;
  try {
    deviceId = await addDevice(auth.user.id, apiKey);
  } catch (err) {
    if (err instanceof AirVpnApiError && err.code === "invalid_key") {
      return jsonError("invalid_api_key", 400);
    }
    return jsonError("airvpn_unavailable", 502);
  }

  await writeAuditLog({
    userId: auth.user.id,
    action: "device.add",
    ipAddress: clientIp(request),
    userAgent: userAgent(request),
  });

  return NextResponse.json({ status: "ok", deviceId });
}
