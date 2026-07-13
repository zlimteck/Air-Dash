import "server-only";
import { unseal } from "@/lib/crypto/secretBox";
import type { User } from "@/lib/generated/prisma/client";

/**
 * Decrypts the user's AirVPN API key in memory, immediately before an
 * outbound AirVPN call. Never return the result to the client or log it.
 */
export function decryptUserApiKey(user: User): string | null {
  if (!user.airvpnKeyCiphertext || !user.airvpnKeyIv || !user.airvpnKeyAuthTag) {
    return null;
  }
  return unseal({
    ciphertext: user.airvpnKeyCiphertext,
    iv: user.airvpnKeyIv,
    authTag: user.airvpnKeyAuthTag,
  });
}
