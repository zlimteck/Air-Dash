"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { startAuthentication } from "@simplewebauthn/browser";
import { AuthCard } from "@/components/ui/AuthCard";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Fingerprint } from "lucide-react";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [loginLoading, setLoginLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(false);
  const [lastEmail, setLastEmail] = useState("");
  const [resendDone, setResendDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setShowResend(false);
    setLoginLoading(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    setLastEmail(email);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: form.get("password") }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "unknown");
        if (data.error === "email_not_verified") setShowResend(true);
        return;
      }

      if (data.status === "second_factor_required") {
        sessionStorage.setItem("pending2fa", JSON.stringify({ ticket: data.ticket, methods: data.methods }));
        router.push("/login/2fa");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("unknown");
    } finally {
      setLoginLoading(false);
    }
  }

  async function loginWithPasskey() {
    setError(null);
    setPasskeyLoading(true);
    try {
      const optionsRes = await fetch("/api/auth/webauthn/passwordless/options", {
        method: "POST",
      });
      if (!optionsRes.ok) {
        const data = await optionsRes.json().catch(() => ({}));
        setError(data.error === "rate_limited" ? "rate_limited" : "passkey");
        return;
      }
      const { options, challengeId } = await optionsRes.json();

      const assertion = await startAuthentication({ optionsJSON: options });

      const verifyRes = await fetch("/api/auth/webauthn/passwordless/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, response: assertion }),
      });
      if (!verifyRes.ok) {
        setError("passkey");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      // Includes the user dismissing the passkey prompt.
      setError("passkey");
    } finally {
      setPasskeyLoading(false);
    }
  }

  async function resendVerification() {
    setResendDone(true);
    await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: lastEmail }),
    }).catch(() => {});
  }

  return (
    <AuthCard title={t("loginTitle")} subtitle={t("loginSubtitle")}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error === "passkey" ? (
          <Alert tone="error">{t("passkeyError")}</Alert>
        ) : error ? (
          <Alert tone="error">{t(`errors.${error}` as Parameters<typeof t>[0])}</Alert>
        ) : null}
        {showResend && !resendDone && (
          <button
            type="button"
            onClick={resendVerification}
            className="text-left text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
          >
            {t("resendVerification")}
          </button>
        )}
        {resendDone && <Alert tone="info">{t("checkEmailBody")}</Alert>}
        <Field
          label={t("email")}
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
        />
        <Field
          label={t("password")}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
        />
        <Button type="submit" loading={loginLoading}>
          {t("loginButton")}
        </Button>
      </form>

      <div className="mt-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
          {t("or")}
        </span>
        <span className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      <Button
        type="button"
        variant="secondary"
        onClick={loginWithPasskey}
        loading={passkeyLoading}
        className="mt-4 w-full"
      >
        <Fingerprint size={15} />
        {t("loginWithPasskey")}
      </Button>
      <div className="mt-5 flex flex-col gap-2 text-sm text-[var(--color-text-secondary)]">
        <Link
          href="/forgot-password"
          className="font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
        >
          {t("forgotPassword")}
        </Link>
        <p>
          {t("loginNoAccount")}{" "}
          <Link
            href="/signup"
            className="font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
          >
            {t("signupButton")}
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
