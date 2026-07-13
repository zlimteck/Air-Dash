"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { AuthCard } from "@/components/ui/AuthCard";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export default function ForgotPasswordPage() {
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
      const res = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email") }),
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

  return (
    <AuthCard title={t("forgotTitle")} subtitle={done ? undefined : t("forgotSubtitle")}>
      {done ? (
        <>
          <Alert tone="info">{t("forgotCheckEmail")}</Alert>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
          >
            {t("backToLogin")}
          </Link>
        </>
      ) : (
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
          <Button type="submit" loading={loading}>
            {t("forgotButton")}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
