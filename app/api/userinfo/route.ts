import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUserInfo } from "@/lib/airvpn/client";
import { decryptUserApiKey } from "@/lib/airvpn/userKey";
import { AirVpnApiError } from "@/lib/airvpn/errors";
import { jsonError } from "@/lib/http";

export async function GET() {
  const auth = await getSession();
  if (!auth) return jsonError("unauthorized", 401);

  const apiKey = decryptUserApiKey(auth.user);
  if (!apiKey) return jsonError("no_api_key", 404);

  try {
    const info = await getUserInfo(auth.user.id, apiKey);
    return NextResponse.json(info);
  } catch (err) {
    if (err instanceof AirVpnApiError && err.code === "invalid_key") {
      return jsonError("invalid_api_key", 400);
    }
    return jsonError("airvpn_unavailable", 502);
  }
}
