import { getTranslations, getFormatter } from "next-intl/server";
import { History } from "lucide-react";
import type { ConnectionHistoryEntry } from "@/lib/history";

function formatBytes(bytes: number): string {
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

export async function ConnectionHistory({ entries }: { entries: ConnectionHistoryEntry[] }) {
  const t = await getTranslations("dashboard");
  const format = await getFormatter();

  if (entries.length === 0) return null;

  return (
    <>
      <h2 className="mb-3 mt-8 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
        <History size={13} />
        {t("history")}
      </h2>
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
              <th className="px-4 py-2.5 font-medium">{t("server")}</th>
              <th className="px-4 py-2.5 font-medium">{t("device")}</th>
              <th className="px-4 py-2.5 font-medium">{t("historyStart")}</th>
              <th className="px-4 py-2.5 font-medium">{t("historyEnd")}</th>
              <th className="px-4 py-2.5 font-medium">{t("historyData")}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-2.5">
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {entry.serverName}
                  </span>
                  {entry.serverLocation && (
                    <span className="ml-2 text-xs text-[var(--color-text-muted)]">
                      {entry.serverLocation}, {entry.serverCountry}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">
                  {entry.deviceName ?? "—"}
                </td>
                <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">
                  {`${format.dateTime(entry.connectedSince, { dateStyle: "medium" })}, ${format.dateTime(entry.connectedSince, { timeStyle: "short" })}`}
                </td>
                <td className="px-4 py-2.5">
                  {entry.endedAt ? (
                    <span className="text-[var(--color-text-secondary)]">
                      {`${format.dateTime(entry.endedAt, { dateStyle: "medium" })}, ${format.dateTime(entry.endedAt, { timeStyle: "short" })}`}
                    </span>
                  ) : (
                    <span className="rounded-full bg-[var(--color-success-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--color-success)]">
                      {t("historyOngoing")}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">
                  {formatBytes(entry.totalBytes)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-[var(--color-text-muted)]">{t("historyNote")}</p>
    </>
  );
}
