"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
/* eslint-disable @next/next/no-img-element -- QR code is a data URL, next/image adds nothing */
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ShieldCheck, X } from "lucide-react";

export function TwoFactorPanel({ enabled }: { enabled: boolean }) {
  const t = useTranslations("settings.security");
  const tAuth = useTranslations("auth");
  const router = useRouter();

  const [step, setStep] = useState<"idle" | "qr" | "codes">("idle");
  const [qr, setQr] = useState<{ qrDataUrl: string; otpauthUri: string } | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDisable, setShowDisable] = useState(false);

  async function startSetup() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      if (!res.ok) {
        setError("unknown");
        return;
      }
      setQr(await res.json());
      setStep("qr");
    } catch {
      setError("unknown");
    } finally {
      setLoading(false);
    }
  }

  async function confirmSetup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/2fa/verify-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: form.get("code") }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "unknown");
        return;
      }
      setBackupCodes(data.backupCodes);
      setStep("codes");
    } catch {
      setError("unknown");
    } finally {
      setLoading(false);
    }
  }

  async function disable(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: form.get("password") }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "unknown");
        return;
      }
      setShowDisable(false);
      router.refresh();
    } catch {
      setError("unknown");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-sm)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            {t("twoFactorTitle")}
          </h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {enabled ? t("twoFactorOn") : t("twoFactorOff")}
          </p>
        </div>
        {enabled && (
          <span className="flex items-center gap-1.5 rounded-full bg-[var(--color-success-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--color-success)]">
            <ShieldCheck size={13} />
            2FA
          </span>
        )}
      </div>

      {error && (
        <div className="mt-4">
          <Alert tone="error">
            {tAuth(`errors.${error}` as Parameters<typeof tAuth>[0])}
          </Alert>
        </div>
      )}

      {!enabled && step === "idle" && (
        <Button type="button" onClick={startSetup} loading={loading} className="mt-4">
          {t("enable")}
        </Button>
      )}

      {step === "qr" && qr && (
        <div className="mt-4 flex flex-col gap-4">
          <p className="text-sm text-[var(--color-text-secondary)]">{t("scanQr")}</p>
          <img
            src={qr.qrDataUrl}
            alt="TOTP QR code"
            width={180}
            height={180}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-2"
          />
          <details className="text-xs text-[var(--color-text-muted)]">
            <summary className="cursor-pointer">{t("manualEntry")}</summary>
            <code className="mt-1 block break-all font-mono">{qr.otpauthUri}</code>
          </details>
          <form onSubmit={confirmSetup} className="flex max-w-xs flex-col gap-3">
            <Field
              label={t("confirmCode")}
              name="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              autoComplete="one-time-code"
              required
              maxLength={6}
            />
            <Button type="submit" loading={loading}>
              {t("confirm")}
            </Button>
          </form>
        </div>
      )}

      {step === "codes" && (
        <div className="mt-4 flex flex-col gap-4">
          <Alert tone="info">{t("backupCodesBody")}</Alert>
          <div className="grid grid-cols-2 gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-4 font-mono text-sm sm:grid-cols-5">
            {backupCodes.map((code) => (
              <span key={code}>{code}</span>
            ))}
          </div>
          <Button
            type="button"
            onClick={() => {
              setStep("idle");
              setBackupCodes([]);
              router.refresh();
            }}
          >
            {t("backupCodesDone")}
          </Button>
        </div>
      )}

      {enabled && !showDisable && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => setShowDisable(true)}
          className="mt-4"
        >
          {t("disable")}
        </Button>
      )}

      {enabled && showDisable && (
        <form onSubmit={disable} className="mt-4 flex max-w-xs flex-col gap-3">
          <Field
            label={t("passwordConfirm")}
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
          <div className="flex gap-2">
            <Button type="submit" variant="danger" loading={loading}>
              {t("disable")}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowDisable(false)}>
              <X size={15} />
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
