import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { TwoFactorPanel } from "@/components/settings/TwoFactorPanel";
import { PasskeyPanel } from "@/components/settings/PasskeyPanel";
import { ApiKeyForm } from "@/components/settings/ApiKeyForm";
import { AccountPanel } from "@/components/settings/AccountPanel";
import { SessionsPanel } from "@/components/settings/SessionsPanel";

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  const auth = await getSession();
  if (!auth) return null;

  const [twoFactor, credentials, loginSessions] = await Promise.all([
    db.twoFactorSecret.findUnique({ where: { userId: auth.user.id } }),
    db.webAuthnCredential.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: "desc" },
    }),
    db.session.findMany({
      where: { userId: auth.user.id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: "desc" },
    }),
  ]);

  const passkeys = credentials.map((cred) => ({
    id: cred.id,
    deviceName: cred.deviceName,
    createdAt: cred.createdAt.toISOString(),
    lastUsedAt: cred.lastUsedAt?.toISOString() ?? null,
  }));

  const sessions = loginSessions.map((session) => ({
    id: session.id,
    isCurrent: session.id === auth.session.id,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    createdAt: session.createdAt.toISOString(),
    lastSeenAt: session.lastSeenAt.toISOString(),
  }));

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t("subtitle")}</p>
      </div>

      <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
        AirVPN
      </h2>
      <div className="mb-8 flex flex-col gap-4">
        <ApiKeyForm
          hasKey={!!auth.user.airvpnKeyCiphertext}
          updatedAt={auth.user.airvpnKeyUpdatedAt?.toISOString() ?? null}
        />
      </div>

      <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
        {t("security.title")}
      </h2>
      <div className="mb-8 flex flex-col gap-4">
        <TwoFactorPanel enabled={twoFactor?.enabled ?? false} />
        <PasskeyPanel passkeys={passkeys} />
        <SessionsPanel sessions={sessions} />
      </div>

      <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
        {t("account.title")}
      </h2>
      <div className="flex flex-col gap-4">
        <AccountPanel email={auth.user.email} pendingEmail={auth.user.pendingEmail} />
      </div>
    </div>
  );
}
