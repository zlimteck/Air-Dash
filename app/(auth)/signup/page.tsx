"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { AuthCard } from "@/components/ui/AuthCard";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export default function SignupPage() {
  const t = useTranslations("auth");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "unknown");
        return;
      }
      setDone(true);
    } catch {
      setError("unknown");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AuthCard title={t("checkEmailTitle")}>
        <p className="text-sm text-[var(--color-text-secondary)]">{t("checkEmailBody")}</p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
        >
          {t("backToLogin")}
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("signupTitle")} subtitle={t("signupSubtitle")}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && <Alert tone="error">{t(`errors.${error}` as Parameters<typeof t>[0])}</Alert>}
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
          autoComplete="new-password"
          required
          minLength={10}
          maxLength={128}
          hint={t("passwordHint")}
        />
        <Button type="submit" loading={loading}>
          {t("signupButton")}
        </Button>
      </form>
      <p className="mt-5 text-sm text-[var(--color-text-secondary)]">
        {t("signupHaveAccount")}{" "}
        <Link
          href="/login"
          className="font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
        >
          {t("loginButton")}
        </Link>
      </p>
    </AuthCard>
  );
}
