import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { env } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

export interface SealedSecret {
  ciphertext: string;
  iv: string;
  authTag: string;
}

function masterKey(): Buffer {
  return Buffer.from(env().ENCRYPTION_MASTER_KEY, "base64");
}

/**
 * Encrypts a secret (AirVPN API key, TOTP secret) for storage at rest.
 * A fresh random IV is generated per call and must be stored alongside
 * the ciphertext; the GCM auth tag detects any tampering on decrypt.
 */
export function seal(plaintext: string): SealedSecret {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, masterKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

/** Throws if the ciphertext was tampered with or the key is wrong. */
export function unseal(sealed: SealedSecret): string {
  const decipher = createDecipheriv(ALGORITHM, masterKey(), Buffer.from(sealed.iv, "base64"));
  decipher.setAuthTag(Buffer.from(sealed.authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(sealed.ciphertext, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
