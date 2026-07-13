import "server-only";
import { generateSecret, generateURI, verify } from "otplib";
import { randomBytes } from "crypto";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { seal, unseal } from "@/lib/crypto/secretBox";

const ISSUER = "Air-Dash";
const BACKUP_CODE_COUNT = 10;
// Tolerate one 30s time-step of clock drift on either side.
const EPOCH_TOLERANCE_SECONDS = 30;

/**
 * Starts (or restarts) TOTP enrollment: generates and stores an encrypted
 * secret with enabled=false, returning the otpauth URI for the QR code.
 */
export async function startTotpEnrollment(userId: string, email: string): Promise<string> {
  const secret = generateSecret();
  const sealed = seal(secret);

  await db.twoFactorSecret.upsert({
    where: { userId },
    create: {
      userId,
      secretCiphertext: sealed.ciphertext,
      secretIv: sealed.iv,
      secretAuthTag: sealed.authTag,
      enabled: false,
    },
    update: {
      secretCiphertext: sealed.ciphertext,
      secretIv: sealed.iv,
      secretAuthTag: sealed.authTag,
      enabled: false,
      confirmedAt: null,
    },
  });

  return generateURI({ issuer: ISSUER, label: email, secret });
}

export async function verifyTotpCode(userId: string, code: string): Promise<boolean> {
  const record = await db.twoFactorSecret.findUnique({ where: { userId } });
  if (!record) return false;

  const secret = unseal({
    ciphertext: record.secretCiphertext,
    iv: record.secretIv,
    authTag: record.secretAuthTag,
  });
  const result = await verify({
    token: code,
    secret,
    epochTolerance: EPOCH_TOLERANCE_SECONDS,
  });
  return result.valid;
}

/**
 * Confirms enrollment with a first valid code, enables 2FA and generates
 * backup codes. Returns the plaintext codes (shown exactly once) or null
 * if the code was wrong.
 */
export async function confirmTotpEnrollment(userId: string, code: string): Promise<string[] | null> {
  const record = await db.twoFactorSecret.findUnique({ where: { userId } });
  if (!record || record.enabled) return null;

  const valid = await verifyTotpCode(userId, code);
  if (!valid) return null;

  await db.twoFactorSecret.update({
    where: { userId },
    data: { enabled: true, confirmedAt: new Date() },
  });

  return regenerateBackupCodes(userId);
}

/** Replaces all backup codes. Returns the new plaintext codes (shown exactly once). */
export async function regenerateBackupCodes(userId: string): Promise<string[]> {
  const record = await db.twoFactorSecret.findUnique({ where: { userId } });
  if (!record) throw new Error("2FA not initialized");

  const codes = Array.from({ length: BACKUP_CODE_COUNT }, () =>
    randomBytes(5).toString("hex"),
  );
  const hashes = await Promise.all(codes.map((c) => bcrypt.hash(c, 10)));

  await db.$transaction([
    db.twoFactorBackupCode.deleteMany({ where: { twoFactorId: record.id } }),
    db.twoFactorBackupCode.createMany({
      data: hashes.map((codeHash) => ({ twoFactorId: record.id, codeHash })),
    }),
  ]);

  return codes;
}

/** Consumes a backup code (single use). Returns true if it matched an unused code. */
export async function consumeBackupCode(userId: string, code: string): Promise<boolean> {
  const record = await db.twoFactorSecret.findUnique({
    where: { userId },
    include: { backupCodes: { where: { usedAt: null } } },
  });
  if (!record) return false;

  for (const backup of record.backupCodes) {
    if (await bcrypt.compare(code, backup.codeHash)) {
      await db.twoFactorBackupCode.update({
        where: { id: backup.id },
        data: { usedAt: new Date() },
      });
      return true;
    }
  }
  return false;
}

export async function disableTotp(userId: string): Promise<void> {
  await db.twoFactorSecret.deleteMany({ where: { userId } });
}
