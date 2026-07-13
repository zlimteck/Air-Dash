"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";
import { AuthCard } from "@/components/ui/AuthCard";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Fingerprint } from "lucide-react";

interface Pending {
  ticket: string;
  methods: string[];
}

function readPending(): Pending | null {
  try {
    const raw = sessionStorage.getItem("pending2fa");
    return raw ? (JSON.parse(raw) as Pending) : null;
  } catch {
    return null;
  }
}

export default function TwoFactorLoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [pending, setPending] = useState<Pending | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useBackup, setUseBackup] = useState(false);

  useEffect(() => {
    // One-time sync from sessionStorage (login page stores the pending
    // ticket there); must happen post-hydration since it is client-only.
    const stored = readPending();
    if (!stored) {
      router.replace("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPending(stored);
  }, [router]);

  if (!pending) return null;

  const hasTotp = pending.methods.includes("totp");
  const hasWebauthn = pending.methods.includes("webauthn");

  async function submitCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pending) return;
    setError(null);
    setCodeLoading(true);

    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/2fa/verify-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket: pending.ticket,
          code: form.get("code"),
          type: useBackup ? "backup" : "totp",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === "invalid_token") {
          sessionStorage.removeItem("pending2fa");
          router.replace("/login");
          return;
        }
        setError(data.error ?? "unknown");
        return;
      }
      sessionStorage.removeItem("pending2fa");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("unknown");
    } finally {
      setCodeLoading(false);
    }
  }

  async function usePasskey() {
    if (!pending) return;
    setError(null);
    setPasskeyLoading(true);
    try {
      const optionsRes = await fetch("/api/auth/webauthn/login/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket: pending.ticket }),
      });
      if (!optionsRes.ok) {
        const data = await optionsRes.json().catch(() => ({}));
        if (data.error === "invalid_token") {
          sessionStorage.removeItem("pending2fa");
          router.replace("/login");
          return;
        }
        setError("passkey");
        return;
      }
      const options = await optionsRes.json();

      const assertion = await startAuthentication({ optionsJSON: options });

      const verifyRes = await fetch("/api/auth/webauthn/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket: pending.ticket, response: assertion }),
      });
      if (!verifyRes.ok) {
        setError("passkey");
        return;
      }
      sessionStorage.removeItem("pending2fa");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("passkey");
    } finally {
      setPasskeyLoading(false);
    }
  }

  return (
    <AuthCard title={t("twoFactorTitle")} subtitle={hasTotp ? t("twoFactorSubtitle") : undefined}>
      {error === "passkey" ? (
        <div className="mb-4">
          <Alert tone="error">{t("passkeyError")}</Alert>
        </div>
      ) : error ? (
        <div className="mb-4">
          <Alert tone="error">{t(`errors.${error}` as Parameters<typeof t>[0])}</Alert>
        </div>
      ) : null}

      {hasTotp && (
        <form onSubmit={submitCode} className="flex flex-col gap-4">
          <Field
            label={useBackup ? t("twoFactorBackupCode") : t("twoFactorCode")}
            name="code"
            type="text"
            inputMode={useBackup ? "text" : "numeric"}
            autoComplete="one-time-code"
            pattern={useBackup ? undefined : "[0-9]{6}"}
            required
            maxLength={useBackup ? 20 : 6}
            autoFocus
          />
          <Button type="submit" loading={codeLoading}>
            {t("twoFactorButton")}
          </Button>
          <button
            type="button"
            onClick={() => setUseBackup((v) => !v)}
            className="text-left text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
          >
            {useBackup ? t("twoFactorUseTotp") : t("twoFactorUseBackup")}
          </button>
        </form>
      )}

      {hasWebauthn && (
        <div className={hasTotp ? "mt-4 border-t border-[var(--color-border)] pt-4" : ""}>
          <Button type="button" variant="secondary" onClick={usePasskey} loading={passkeyLoading} className="w-full">
            <Fingerprint size={15} />
            {hasTotp ? t("usePasskey") : t("passkeyPrompt")}
          </Button>
        </div>
      )}
    </AuthCard>
  );
}
