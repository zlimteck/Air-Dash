import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPendingAuthTicket } from "@/lib/auth/pendingAuth";
import { createAuthenticationOptions } from "@/lib/auth/webauthn";
import { assertSameOrigin, jsonError } from "@/lib/http";

const schema = z.object({ ticket: z.string().min(1) });

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("invalid_request", 400);

  const userId = await verifyPendingAuthTicket(parsed.data.ticket);
  if (!userId) return jsonError("invalid_token", 401);

  const options = await createAuthenticationOptions(userId);
  if (!options) return jsonError("invalid_request", 400);

  return NextResponse.json(options);
}
