"use client";

import { useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { KeyRound, Trash2 } from "lucide-react";

export function ApiKeyForm({
  hasKey,
  updatedAt,
}: {
  hasKey: boolean;
  updatedAt: string | null;
}) {
  const t = useTranslations("settings.apiKey");
  const format = useFormatter();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const showForm = !hasKey || editing;

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/account/api-key", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: form.get("apiKey") }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "unknown");
        return;
      }
      setSaved(true);
      setEditing(false);
      router.refresh();
    } catch {
      setError("unknown");
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!window.confirm(t("removeConfirm"))) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/account/api-key", { method: "DELETE" });
      if (!res.ok) {
        setError("unknown");
        return;
      }
      setSaved(false);
      router.refresh();
    } catch {
      setError("unknown");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-2">
        <KeyRound size={16} className="text-[var(--color-accent)]" />
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{t("title")}</h3>
      </div>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        {hasKey ? t("bodyHasKey") : t("bodyNoKey")}
      </p>
      {hasKey && updatedAt && (
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {t("updatedAt", {
            // Separate date/time formats: the combined connector differs
            // between server and browser ICU (hydration mismatch).
            date: `${format.dateTime(new Date(updatedAt), { dateStyle: "medium" })}, ${format.dateTime(new Date(updatedAt), { timeStyle: "short" })}`,
          })}
        </p>
      )}

      {error && (
        <div className="mt-4">
          <Alert tone="error">{t(`errors.${error}` as Parameters<typeof t>[0])}</Alert>
        </div>
      )}
      {saved && (
        <div className="mt-4">
          <Alert tone="success">{t("saved")}</Alert>
        </div>
      )}

      {showForm ? (
        <form onSubmit={save} className="mt-4 flex max-w-md flex-col gap-3">
          <Field
            label={t("title")}
            name="apiKey"
            type="password"
            autoComplete="off"
            placeholder={t("placeholder")}
            required
            minLength={8}
            maxLength={256}
          />
          <div className="flex gap-2">
            <Button type="submit" loading={loading}>
              {t("save")}
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-4 flex gap-2">
          <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
            {t("replace")}
          </Button>
          <Button type="button" variant="danger" onClick={remove} loading={loading}>
            <Trash2 size={14} />
            {t("remove")}
          </Button>
        </div>
      )}
    </section>
  );
}
