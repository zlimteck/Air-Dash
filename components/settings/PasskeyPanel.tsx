"use client";

import { useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { useRouter } from "next/navigation";
import { startRegistration } from "@simplewebauthn/browser";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Fingerprint, Trash2 } from "lucide-react";

export interface PasskeySummary {
  id: string;
  deviceName: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

export function PasskeyPanel({ passkeys }: { passkeys: PasskeySummary[] }) {
  const t = useTranslations("settings.security");
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const router = useRouter();

  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function register(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const deviceName = String(form.get("deviceName") ?? "").trim() || undefined;

    try {
      const optionsRes = await fetch("/api/auth/webauthn/register/options", { method: "POST" });
      if (!optionsRes.ok) {
        setError("passkey");
        return;
      }
      const options = await optionsRes.json();

      const attestation = await startRegistration({ optionsJSON: options });

      const verifyRes = await fetch("/api/auth/webauthn/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: attestation, deviceName }),
      });
      if (!verifyRes.ok) {
        setError("passkey");
        return;
      }
      setAdding(false);
      router.refresh();
    } catch {
      setError("passkey");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/auth/webauthn/credentials/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setError("unknown");
        return;
      }
      router.refresh();
    } catch {
      setError("unknown");
    }
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-sm)]">
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
        {t("passkeysTitle")}
      </h3>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t("passkeysBody")}</p>

      {error === "passkey" && (
        <div className="mt-4">
          <Alert tone="error">{tAuth("passkeyError")}</Alert>
        </div>
      )}
      {error && error !== "passkey" && (
        <div className="mt-4">
          <Alert tone="error">{tAuth("errors.unknown")}</Alert>
        </div>
      )}

      {passkeys.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--color-text-muted)]">{t("noPasskeys")}</p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-[var(--color-border)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
          {passkeys.map((passkey) => (
            <li key={passkey.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3">
                <Fingerprint size={16} className="text-[var(--color-accent)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">
                    {passkey.deviceName || "Passkey"}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {t("addedOn", {
                      date: format.dateTime(new Date(passkey.createdAt), { dateStyle: "medium" }),
                    })}
                    {" · "}
                    {passkey.lastUsedAt
                      ? t("lastUsed", {
                          date: format.dateTime(new Date(passkey.lastUsedAt), {
                            dateStyle: "medium",
                          }),
                        })
                      : t("neverUsed")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(passkey.id)}
                title={t("remove")}
                className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-danger-subtle)] hover:text-[var(--color-danger)]"
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <form onSubmit={register} className="mt-4 flex max-w-xs flex-col gap-3">
          <Field
            label={t("passkeyName")}
            name="deviceName"
            type="text"
            placeholder={t("passkeyNamePlaceholder")}
            maxLength={64}
          />
          <div className="flex gap-2">
            <Button type="submit" loading={loading}>
              {t("addPasskey")}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setAdding(false)}>
              {tCommon("cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" variant="secondary" onClick={() => setAdding(true)} className="mt-4">
          <Fingerprint size={15} />
          {t("addPasskey")}
        </Button>
      )}
    </section>
  );
}
