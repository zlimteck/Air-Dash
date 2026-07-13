import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createRegistrationOptions } from "@/lib/auth/webauthn";
import { assertSameOrigin, jsonError } from "@/lib/http";

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await getSession();
  if (!auth) return jsonError("unauthorized", 401);

  const options = await createRegistrationOptions(auth.user.id, auth.user.email);
  return NextResponse.json(options);
}
