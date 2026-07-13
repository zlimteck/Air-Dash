"use client";

import { useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { SpeedSparkline } from "@/components/dashboard/SpeedSparkline";
import { ArrowDown, ArrowUp, Globe, Unplug } from "lucide-react";
import type { AirVpnVpnSession } from "@/lib/airvpn/types";

function formatBytes(bytes: number | undefined): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[i]}`;
}

function formatSpeed(bytesPerSecond: number | undefined): string {
  if (!bytesPerSecond) return "0 Mbit/s";
  const mbit = (bytesPerSecond * 8) / 1_000_000;
  return mbit >= 1000 ? `${(mbit / 1000).toFixed(2)} Gbit/s` : `${mbit.toFixed(1)} Mbit/s`;
}

export function SessionCard({
  session,
  fetchedAt,
}: {
  session: AirVpnVpnSession;
  fetchedAt: number;
}) {
  const t = useTranslations("dashboard");
  const format = useFormatter();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function disconnect() {
    if (!window.confirm(t("disconnectConfirm"))) return;
    setLoading(true);
    try {
      await fetch("/api/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(session.device_name ? { device: session.device_name } : {}),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent)]">
            <Globe size={16} />
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              {session.server_name}
              {session.device_name && (
                <span className="ml-2 font-normal text-[var(--color-text-muted)]">
                  {session.device_name}
                </span>
              )}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {session.server_location}, {session.server_country}
            </p>
          </div>
        </div>
        <Button type="button" variant="secondary" onClick={disconnect} loading={loading}>
          <Unplug size={14} />
          {t("disconnect")}
        </Button>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-[var(--color-text-muted)]">{t("exitIp")}</dt>
          <dd className="mt-0.5 font-mono text-[13px] text-[var(--color-text-primary)]">
            {session.exit_ip ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--color-text-muted)]">{t("vpnIp")}</dt>
          <dd className="mt-0.5 font-mono text-[13px] text-[var(--color-text-primary)]">
            {session.vpn_ip ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
            <ArrowDown size={11} />
            {t("download")}
          </dt>
          <dd className="mt-0.5 text-[13px] text-[var(--color-text-primary)]">
            {formatSpeed(session.speed_write)}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
            <ArrowUp size={11} />
            {t("upload")}
          </dt>
          <dd className="mt-0.5 text-[13px] text-[var(--color-text-primary)]">
            {formatSpeed(session.speed_read)}
          </dd>
        </div>
      </dl>

      <div className="mt-3 border-t border-[var(--color-border)] pt-3">
        <SpeedSparkline
          sessionKey={`${session.server_name}-${session.device_name}-${session.connected_since_unix}`}
          speedRead={session.speed_read ?? 0}
          speedWrite={session.speed_write ?? 0}
          fetchedAt={fetchedAt}
        />
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
          {/* Date and time formatted separately: the combined dateStyle+timeStyle
              connector ("à" vs ",") differs between server and browser ICU,
              which caused a hydration mismatch. */}
          {session.connected_since_unix &&
            `${t("connectedSince")} ${format.dateTime(new Date(session.connected_since_unix * 1000), { dateStyle: "medium" })}, ${format.dateTime(new Date(session.connected_since_unix * 1000), { timeStyle: "short" })} · `}
          <span className="inline-flex items-center gap-1">
            <ArrowDown size={10} className="text-[var(--color-accent)]" />
            {formatBytes(session.bytes_write)}
          </span>
          {" · "}
          <span className="inline-flex items-center gap-1">
            <ArrowUp size={10} className="text-[var(--color-success)]" />
            {formatBytes(session.bytes_read)}
          </span>
        </p>
      </div>
    </div>
  );
}
