import { NextRequest, NextResponse } from "next/server";
import { toDataURL } from "qrcode";
import { getSession } from "@/lib/auth/session";
import { startTotpEnrollment } from "@/lib/auth/totp";
import { assertSameOrigin, jsonError } from "@/lib/http";

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await getSession();
  if (!auth) return jsonError("unauthorized", 401);

  const otpauthUri = await startTotpEnrollment(auth.user.id, auth.user.email);
  const qrDataUrl = await toDataURL(otpauthUri, { margin: 1, width: 240 });

  return NextResponse.json({ otpauthUri, qrDataUrl });
}
