import { useTranslations } from "next-intl";
import type { AirVpnAggregate } from "@/lib/airvpn/types";

function formatBandwidth(mbit: number) {
  if (mbit >= 1000) return `${(mbit / 1000).toFixed(1)} Gbit/s`;
  return `${mbit} Mbit/s`;
}

export function StatusSummary({ global }: { global: AirVpnAggregate | undefined }) {
  const t = useTranslations("status");

  const stats = [
    { label: t("usersOnline"), value: global ? global.users.toLocaleString() : "—" },
    { label: t("serversOnline"), value: global ? global.servers.toLocaleString() : "—" },
    { label: t("bandwidthUsed"), value: global ? formatBandwidth(global.bw) : "—" },
    { label: t("networkLoad"), value: global ? `${global.currentload}%` : "—" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
            {stat.label}
          </p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            {stat.value}
          </p>
        </div>
      ))}
      {global && (
        <div className="col-span-2 flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--color-accent-border)] bg-[var(--color-accent-subtle)] p-4 sm:col-span-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-accent)]">
              {t("recommended")}
            </p>
            <p className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">
              {global.server_best}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
