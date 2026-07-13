import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { isProduction } from "@/lib/env";
import type { Session, User } from "@/lib/generated/prisma/client";

export const SESSION_COOKIE = "airvpn_session";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
// lastSeenAt is only touched if older than this, to avoid a write per request.
const LAST_SEEN_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export interface AuthContext {
  session: Session;
  user: User;
}

export async function createSession(
  userId: string,
  options: {
    amrMethods: string[];
    ipAddress?: string | null;
    userAgent?: string | null;
  },
): Promise<Session> {
  const session = await db.session.create({
    data: {
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      amrMethods: JSON.stringify(options.amrMethods),
      ipAddress: options.ipAddress ?? null,
      userAgent: options.userAgent ?? null,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "strict",
    path: "/",
    expires: session.expiresAt,
  });

  return session;
}

/** Authoritative session check: cookie → DB lookup → expiry/revocation. */
export async function getSession(): Promise<AuthContext | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });
  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;

  if (Date.now() - session.lastSeenAt.getTime() > LAST_SEEN_TOUCH_INTERVAL_MS) {
    await db.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });
  }

  const { user, ...bare } = session;
  return { session: bare, user };
}

export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    await db.session.updateMany({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function revokeAllSessionsForUser(userId: string, exceptSessionId?: string): Promise<void> {
  await db.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  });
}
