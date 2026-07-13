import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

const TICKET_TTL = "5m";
const ISSUER = "air-dash";
const AUDIENCE = "pending-2fa";

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env().PENDING_AUTH_SECRET);
}

/**
 * Short-lived signed ticket carrying the user between the password step and
 * the second-factor step of login. Not a session: it grants nothing except
 * the right to attempt the second factor.
 */
export async function issuePendingAuthTicket(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(TICKET_TTL)
    .sign(secretKey());
}

/** Returns the userId, or null if the ticket is invalid/expired. */
export async function verifyPendingAuthTicket(ticket: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(ticket, secretKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
