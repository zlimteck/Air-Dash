"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { AtSign, KeySquare, TriangleAlert } from "lucide-react";

export function AccountPanel({
  email,
  pendingEmail,
}: {
  email: string;
  pendingEmail: string | null;
}) {
  const t = useTranslations("settings.account");
  const tAuth = useTranslations("auth");
  const router = useRouter();

  const [loading, setLoading] = useState<"email" | "password" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<"email_sent" | "password_changed" | null>(null);

  async function submitEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading("email");
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/account/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: form.get("password"),
          newEmail: form.get("newEmail"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "unknown");
        return;
      }
      setNotice("email_sent");
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch {
      setError("unknown");
    } finally {
      setLoading(null);
    }
  }

  async function submitPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading("password");
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.get("currentPassword"),
          newPassword: form.get("newPassword"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "unknown");
        return;
      }
      setNotice("password_changed");
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch {
      setError("unknown");
    } finally {
      setLoading(null);
    }
  }

  async function deleteAccount() {
    const password = window.prompt(t("deleteConfirm") + "\n\n" + t("currentPassword"));
    if (!password) return;
    setError(null);
    setLoading("delete");
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "unknown");
        return;
      }
      window.location.href = "/";
    } catch {
      setError("unknown");
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-sm)]">
      {error && (
        <div className="mb-4">
          <Alert tone="error">{tAuth(`errors.${error}` as Parameters<typeof tAuth>[0])}</Alert>
        </div>
      )}
      {notice === "email_sent" && (
        <div className="mb-4">
          <Alert tone="info">{t("emailCheckInbox")}</Alert>
        </div>
      )}
      {notice === "password_changed" && (
        <div className="mb-4">
          <Alert tone="success">{t("passwordChanged")}</Alert>
        </div>
      )}

      <div className="flex items-center gap-2">
        <AtSign size={16} className="text-[var(--color-accent)]" />
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
          {t("emailTitle")}
        </h3>
      </div>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t("emailBody", { email })}</p>
      {pendingEmail && (
        <p className="mt-1 text-xs text-[var(--color-warning)]">
          {t("emailPending", { email: pendingEmail })}
        </p>
      )}
      <form onSubmit={submitEmail} className="mt-3 flex max-w-md flex-col gap-3">
        <Field
          label={t("newEmail")}
          name="newEmail"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
        />
        <Field
          label={t("currentPassword")}
          name="password"
          id="password-for-email"
          type="password"
          autoComplete="current-password"
          required
        />
        <Button type="submit" variant="secondary" loading={loading === "email"} className="w-fit">
          {t("changeEmail")}
        </Button>
      </form>

      <div className="mt-6 border-t border-[var(--color-border)] pt-6">
        <div className="flex items-center gap-2">
          <KeySquare size={16} className="text-[var(--color-accent)]" />
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            {t("passwordTitle")}
          </h3>
        </div>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t("passwordBody")}</p>
        <form onSubmit={submitPassword} className="mt-3 flex max-w-md flex-col gap-3">
          <Field
            label={t("currentPassword")}
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
          <Field
            label={t("newPassword")}
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            maxLength={128}
            hint={tAuth("passwordHint")}
          />
          <Button
            type="submit"
            variant="secondary"
            loading={loading === "password"}
            className="w-fit"
          >
            {t("changePassword")}
          </Button>
        </form>
      </div>

      <div className="mt-6 border-t border-[var(--color-border)] pt-6">
        <div className="flex items-center gap-2">
          <TriangleAlert size={16} className="text-[var(--color-danger)]" />
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            {t("dangerTitle")}
          </h3>
        </div>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t("dangerBody")}</p>
        <Button
          type="button"
          variant="danger"
          onClick={deleteAccount}
          loading={loading === "delete"}
          className="mt-3"
        >
          {t("deleteAccount")}
        </Button>
      </div>
    </section>
  );
}
