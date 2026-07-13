"use client";

import { useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { MonitorSmartphone, LogOut } from "lucide-react";

export interface LoginSessionSummary {
  id: string;
  isCurrent: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
}

/** Compact human label from a user-agent string. */
function describeUserAgent(ua: string | null, fallback: string): string {
  if (!ua) return fallback;
  const browser = ua.includes("Firefox/")
    ? "Firefox"
    : ua.includes("Edg/")
      ? "Edge"
      : ua.includes("Chrome/")
        ? "Chrome"
        : ua.includes("Safari/")
          ? "Safari"
          : fallback;
  const os = ua.includes("Windows")
    ? "Windows"
    : ua.includes("Mac OS X")
      ? "macOS"
      : ua.includes("Android")
        ? "Android"
        : ua.includes("iPhone") || ua.includes("iPad")
          ? "iOS"
          : ua.includes("Linux")
            ? "Linux"
            : null;
  return os ? `${browser} · ${os}` : browser;
}

export function SessionsPanel({ sessions }: { sessions: LoginSessionSummary[] }) {
  const t = useTranslations("settings.sessions");
  const format = useFormatter();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function revoke(id: string) {
    setLoading(id);
    try {
      await fetch(`/api/account/sessions/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function revokeAll() {
    setLoading("all");
    try {
      await fetch("/api/account/sessions/revoke-all", { method: "POST" });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  const others = sessions.filter((session) => !session.isCurrent);

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-sm)]">
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{t("title")}</h3>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t("body")}</p>

      <ul className="mt-4 flex flex-col divide-y divide-[var(--color-border)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
        {sessions.map((session) => (
          <li key={session.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <MonitorSmartphone
                size={16}
                className={
                  session.isCurrent
                    ? "shrink-0 text-[var(--color-accent)]"
                    : "shrink-0 text-[var(--color-text-muted)]"
                }
              />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                  {describeUserAgent(session.userAgent, t("unknownDevice"))}
                  {session.isCurrent && (
                    <span className="rounded-full bg-[var(--color-accent-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--color-accent)]">
                      {t("current")}
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-[var(--color-text-muted)]">
                  {session.ipAddress ?? "—"}
                  {" · "}
                  {t("lastActive", {
                    date: format.relativeTime(new Date(session.lastSeenAt), new Date()),
                  })}
                </p>
              </div>
            </div>
            {!session.isCurrent && (
              <button
                type="button"
                onClick={() => revoke(session.id)}
                disabled={loading === session.id}
                className="shrink-0 rounded-[var(--radius-sm)] px-2 py-1 text-xs font-medium text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger-subtle)] disabled:opacity-60"
              >
                {t("revoke")}
              </button>
            )}
          </li>
        ))}
      </ul>

      {others.length > 0 && (
        <Button
          type="button"
          variant="secondary"
          onClick={revokeAll}
          loading={loading === "all"}
          className="mt-4"
        >
          <LogOut size={14} />
          {t("revokeAll")}
        </Button>
      )}
    </section>
  );
}
