import "server-only";
import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

function generateToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: hashToken(raw) };
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Creates a verification token; only the hash is persisted. Returns the raw token for the email link. */
export async function createEmailVerificationToken(userId: string): Promise<string> {
  const { raw, hash } = generateToken();
  await db.emailVerificationToken.create({
    data: {
      userId,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
    },
  });
  return raw;
}

/**
 * Marks the token used and the user verified. If an email change is pending,
 * the new address becomes the login email. Returns the userId, or null if
 * invalid/expired/used.
 */
export async function consumeEmailVerificationToken(raw: string): Promise<string | null> {
  const record = await db.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: { user: { select: { pendingEmail: true } } },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) return null;

  const pendingEmail = record.user.pendingEmail;
  if (pendingEmail) {
    // Another account may have claimed the address in the meantime.
    const taken = await db.user.findUnique({ where: { email: pendingEmail } });
    if (taken) return null;
  }

  await db.$transaction([
    db.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    db.user.update({
      where: { id: record.userId },
      data: {
        emailVerified: true,
        ...(pendingEmail ? { email: pendingEmail, pendingEmail: null } : {}),
      },
    }),
  ]);
  return record.userId;
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const { raw, hash } = generateToken();
  await db.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    },
  });
  return raw;
}

/** Returns the userId for a valid unused token without consuming it (used to render the reset form). */
export async function peekPasswordResetToken(raw: string): Promise<string | null> {
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(raw) },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) return null;
  return record.userId;
}

/** Consumes the token. Returns the userId, or null if invalid/expired/used. */
export async function consumePasswordResetToken(raw: string): Promise<string | null> {
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(raw) },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) return null;

  await db.passwordResetToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });
  return record.userId;
}
