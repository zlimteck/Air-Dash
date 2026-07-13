import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { deleteDevice, listDevices } from "@/lib/airvpn/client";
import { decryptUserApiKey } from "@/lib/airvpn/userKey";
import { AirVpnApiError } from "@/lib/airvpn/errors";
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

  const apiKey = decryptUserApiKey(auth.user);
  if (!apiKey) return jsonError("no_api_key", 404);

  const { id } = await params;
  if (!/^[a-f0-9]{10,64}$/i.test(id)) return jsonError("invalid_request", 400);

  try {
    // Only ids that belong to this account's device list may be deleted.
    const { devices } = await listDevices(auth.user.id, apiKey);
    const device = devices.find((d) => d.id === id);
    if (!device) return jsonError("invalid_request", 404);

    await deleteDevice(auth.user.id, apiKey, id);

    await writeAuditLog({
      userId: auth.user.id,
      action: "device.remove",
      ipAddress: clientIp(request),
      userAgent: userAgent(request),
      metadata: { name: device.name },
    });
  } catch (err) {
    if (err instanceof AirVpnApiError && err.code === "invalid_key") {
      return jsonError("invalid_api_key", 400);
    }
    return jsonError("airvpn_unavailable", 502);
  }

  return NextResponse.json({ status: "ok" });
}
