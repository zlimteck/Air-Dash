import "server-only";
import { db } from "@/lib/db";

export type AuditAction =
  | "signup"
  | "login.success"
  | "login.failed"
  | "login.2fa_failed"
  | "logout"
  | "email.verified"
  | "email.change_requested"
  | "password.changed"
  | "account.deleted"
  | "password.reset_requested"
  | "password.reset_completed"
  | "api_key.update"
  | "api_key.remove"
  | "device.add"
  | "device.remove"
  | "2fa.enable"
  | "2fa.disable"
  | "2fa.backup_codes_regenerated"
  | "passkey.register"
  | "passkey.remove"
  | "session.revoked"
  | "vpn.disconnect"
  | "vpn.profile_generated";

/**
 * Best-effort audit trail. metadata must never contain secrets
 * (passwords, API keys, TOTP secrets/codes).
 */
export async function writeAuditLog(options: {
  userId?: string | null;
  action: AuditAction;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: options.userId ?? null,
        action: options.action,
        ipAddress: options.ipAddress ?? null,
        userAgent: options.userAgent ?? null,
        metadata: options.metadata ? JSON.stringify(options.metadata) : null,
      },
    });
  } catch {
    // Auditing must never break the main flow.
  }
}
