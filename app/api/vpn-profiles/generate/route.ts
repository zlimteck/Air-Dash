import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { toDataURL } from "qrcode";
import { getSession } from "@/lib/auth/session";
import {
  generateProfile,
  OPENVPN_PORTS,
  WIREGUARD_PORTS,
} from "@/lib/airvpn/configGenerator";
import { decryptUserApiKey } from "@/lib/airvpn/userKey";
import { AirVpnApiError } from "@/lib/airvpn/errors";
import { writeAuditLog } from "@/lib/audit";
import { assertSameOrigin, clientIp, jsonError, userAgent } from "@/lib/http";

const schema = z.object({
  protocol: z.enum(["openvpn", "wireguard"]),
  serverName: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9-]+$/),
  port: z.number().int().optional(),
  deviceName: z
    .string()
    .trim()
    .max(64)
    .regex(/^[A-Za-z0-9 _.-]*$/)
    .optional(),
});

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await getSession();
  if (!auth) return jsonError("unauthorized", 401);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("invalid_request", 400);
  const { protocol, port } = parsed.data;

  const validPorts: readonly number[] = protocol === "wireguard" ? WIREGUARD_PORTS : OPENVPN_PORTS;
  if (port !== undefined && !validPorts.includes(port)) {
    return jsonError("invalid_request", 400);
  }

  const apiKey = decryptUserApiKey(auth.user);
  if (!apiKey) return jsonError("no_api_key", 404);

  try {
    const profile = await generateProfile(apiKey, parsed.data);

    // WireGuard configs are small enough for a QR code, which the WireGuard
    // mobile apps can import directly. OpenVPN files are far too large.
    let qrDataUrl: string | null = null;
    if (protocol === "wireguard") {
      try {
        qrDataUrl = await toDataURL(profile.content, { margin: 1, width: 280 });
      } catch {
        // QR is a bonus; the file download must still succeed.
      }
    }

    await writeAuditLog({
      userId: auth.user.id,
      action: "vpn.profile_generated",
      ipAddress: clientIp(request),
      userAgent: userAgent(request),
      metadata: {
        protocol,
        server: parsed.data.serverName,
        port: port ?? null,
      },
    });

    return NextResponse.json({ status: "ok", profile, qrDataUrl });
  } catch (err) {
    if (err instanceof AirVpnApiError) {
      if (err.code === "invalid_key") return jsonError("invalid_api_key", 400);
      if (err.code === "upstream_error") return jsonError("generator_error", 502);
    }
    return jsonError("airvpn_unavailable", 502);
  }
}
