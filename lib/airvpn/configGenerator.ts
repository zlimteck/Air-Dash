import "server-only";
import { AirVpnApiError } from "./errors";

const GENERATOR_URL = "https://airvpn.org/api/generator/";

export type VpnProtocol = "openvpn" | "wireguard";

export const WIREGUARD_PORTS = [1637, 47107, 51820] as const;
export const OPENVPN_PORTS = [443, 1194, 2018, 80, 53] as const;

export interface GenerateProfileParams {
  protocol: VpnProtocol;
  serverName: string;
  port?: number;
  deviceName?: string;
}

export interface GeneratedProfile {
  filename: string;
  mimeType: string;
  content: string;
}

function protocolToken(protocol: VpnProtocol, port: number | undefined): string {
  // Format observed on the (undocumented) generator service:
  // <type>_<entry-ip-index>_<transport>_<port>, e.g. wireguard_1_udp_1637.
  if (protocol === "wireguard") {
    const p = port && WIREGUARD_PORTS.includes(port as (typeof WIREGUARD_PORTS)[number]) ? port : 1637;
    return `wireguard_1_udp_${p}`;
  }
  const p = port && OPENVPN_PORTS.includes(port as (typeof OPENVPN_PORTS)[number]) ? port : 443;
  return `openvpn_1_udp_${p}`;
}

function filenameFromDisposition(header: string | null, fallback: string): string {
  const match = header?.match(/filename="([^"]+)"/);
  return match?.[1] ?? fallback;
}

/**
 * Calls AirVPN's generator service (found via the authenticated API
 * Explorer; not part of the public docs). Auth is the API-KEY header, so
 * the key never appears in the URL. Returns the config file for a single
 * server; the file may contain device private keys — never store or log it.
 */
export async function generateProfile(
  apiKey: string,
  params: GenerateProfileParams,
): Promise<GeneratedProfile> {
  const url = new URL(GENERATOR_URL);
  url.searchParams.set("servers", params.serverName);
  url.searchParams.set("protocols", protocolToken(params.protocol, params.port));
  url.searchParams.set("system", "linux");
  if (params.deviceName) url.searchParams.set("device", params.deviceName);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "API-KEY": apiKey },
      cache: "no-store",
    });
  } catch {
    throw new AirVpnApiError("AirVPN service is unreachable.", "upstream_unavailable");
  }

  if (response.status === 401 || response.status === 403) {
    throw new AirVpnApiError("AirVPN rejected the API key.", "invalid_key");
  }
  if (!response.ok) {
    throw new AirVpnApiError(`AirVPN service returned HTTP ${response.status}.`, "upstream_unavailable");
  }

  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();

  // The service answers 200 with a JSON body for both validation errors
  // ("result") and hard errors ("error"); a successful generation returns
  // the raw file as application/octetstream.
  if (contentType.includes("application/json")) {
    let message = "AirVPN generator reported an error.";
    try {
      const data = JSON.parse(body) as { error?: string; result?: string };
      message = data.error ?? data.result ?? message;
    } catch {
      // fall through with the generic message
    }
    const lowered = message.toLowerCase();
    if (lowered.includes("key") || lowered.includes("auth")) {
      throw new AirVpnApiError("AirVPN rejected the API key.", "invalid_key");
    }
    throw new AirVpnApiError(message, "upstream_error");
  }

  const extension = params.protocol === "wireguard" ? "conf" : "ovpn";
  return {
    filename: filenameFromDisposition(
      response.headers.get("content-disposition"),
      `AirVPN_${params.serverName}.${extension}`,
    ),
    mimeType: "application/octet-stream",
    content: body,
  };
}
