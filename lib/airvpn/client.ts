import { AirVpnApiError } from "./errors";
import { KeyedTtlCache, TtlCache } from "./cache";
import type { AirVpnDevicesResponse, AirVpnStatusResponse, AirVpnUserInfo } from "./types";

const AIRVPN_API_BASE = "https://airvpn.org/api";

// Public, no API key required — identical response for every visitor, so a
// single shared cache is correct. AirVPN bans IPs that exceed 600 requests
// per 10 minutes, so these TTLs are deliberately conservative.
const statusCache = new TtlCache<AirVpnStatusResponse>(60_000);
// Keyed by our internal userId (never by the raw API key).
const userInfoCache = new KeyedTtlCache<string, AirVpnUserInfo>(20_000);
const devicesCache = new KeyedTtlCache<string, AirVpnDevicesResponse>(60_000);

/**
 * Calls an AirVPN API service via POST (JSON body) so the API key never
 * appears in a URL, where it could leak into logs.
 */
async function callAirVpnApi<T>(service: string, params: Record<string, string> = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${AIRVPN_API_BASE}/${service}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "json", ...params }),
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

  let data: { result?: string } & Record<string, unknown>;
  try {
    data = await response.json();
  } catch {
    throw new AirVpnApiError("AirVPN returned an unreadable response.", "upstream_error");
  }

  if (data.result !== "ok") {
    // AirVPN reports key problems through the error message rather than
    // HTTP status codes; never echo the raw message (it may contain params).
    const message = String(data.error ?? "").toLowerCase();
    if (message.includes("key") || message.includes("auth")) {
      throw new AirVpnApiError("AirVPN rejected the API key.", "invalid_key");
    }
    throw new AirVpnApiError("AirVPN service reported an error.", "upstream_error");
  }

  return data as T;
}

export async function getStatus(): Promise<AirVpnStatusResponse> {
  return statusCache.getOrFetch(() => callAirVpnApi<AirVpnStatusResponse>("status"));
}

/** Validates a candidate API key with a direct (uncached) userinfo call. */
export async function validateApiKey(apiKey: string): Promise<AirVpnUserInfo> {
  return callAirVpnApi<AirVpnUserInfo>("userinfo", { key: apiKey });
}

export async function getUserInfo(userId: string, apiKey: string): Promise<AirVpnUserInfo> {
  return userInfoCache.getOrFetch(userId, () =>
    callAirVpnApi<AirVpnUserInfo>("userinfo", { key: apiKey }),
  );
}

export async function listDevices(userId: string, apiKey: string): Promise<AirVpnDevicesResponse> {
  return devicesCache.getOrFetch(userId, () =>
    callAirVpnApi<AirVpnDevicesResponse>("devices", { key: apiKey }),
  );
}

/**
 * Creates a new device on the AirVPN account. The service ignores every
 * naming parameter (probed empirically) — the device is always born
 * "New device" and must be renamed on airvpn.org. Returns its id.
 */
export async function addDevice(userId: string, apiKey: string): Promise<string> {
  const response = await callAirVpnApi<{ id: string }>("devices", {
    key: apiKey,
    action: "add",
  });
  devicesCache.invalidate(userId);
  return response.id;
}

/**
 * Deletes a device — AirVPN revokes its keys; existing profiles stop working.
 * Quirk observed empirically: AirVPN answers "ok" but does NOT actually
 * delete a device created seconds earlier (backend replication lag);
 * deleting anything older than ~1 minute works reliably.
 */
export async function deleteDevice(userId: string, apiKey: string, deviceId: string): Promise<void> {
  await callAirVpnApi("devices", { key: apiKey, action: "delete", id: deviceId });
  devicesCache.invalidate(userId);
}

export async function disconnectSessions(
  apiKey: string,
  options: { server?: string; device?: string } = {},
): Promise<void> {
  await callAirVpnApi("disconnect", {
    key: apiKey,
    ...(options.server ? { server: options.server } : {}),
    ...(options.device ? { device: options.device } : {}),
  });
}
