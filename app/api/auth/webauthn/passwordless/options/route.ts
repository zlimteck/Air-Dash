import { NextRequest, NextResponse } from "next/server";
import { createPasswordlessOptions } from "@/lib/auth/webauthn";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import { assertSameOrigin, clientIp, jsonError } from "@/lib/http";

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  if (!checkRateLimit(`pwl-options:${clientIp(request)}`, 20, 15 * 60 * 1000)) {
    return jsonError("rate_limited", 429);
  }

  const { options, challengeId } = await createPasswordlessOptions();
  return NextResponse.json({ options, challengeId });
}
