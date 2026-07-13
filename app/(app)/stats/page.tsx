import { getTranslations, getFormatter } from "next-intl/server";
import { getSession } from "@/lib/auth/session";
import { getUsageStats, type NamedTotal } from "@/lib/stats";

export const dynamic = "force-dynamic";

const HISTORY_DAYS = 14;

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

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${Math.round(hours / 24)} j (${Math.round(hours)} h)`;
}

export default async function StatsPage() {
  const t = await getTranslations("stats");
  const format = await getFormatter();
  const auth = await getSession();
  if (!auth) return null;

  const stats = await getUsageStats(auth.user.id, HISTORY_DAYS);

  if (stats.totalConnections === 0) {
    return (
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <p className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-text-muted)]">
          {t("empty")}
        </p>
      </div>
    );
  }

  const maxDayHours = Math.max(...stats.hoursPerDay.map((d) => d.hours), 1);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t("totalData")} value={formatBytes(stats.totalBytes)} />
        <StatTile label={t("totalConnections")} value={String(stats.totalConnections)} />
        <StatTile label={t("totalDuration")} value={formatHours(stats.totalHours)} />
        <StatTile label={t("distinctServers")} value={String(stats.distinctServers)} />
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
            {t("hoursPerDay")}
          </h2>
          <span className="text-xs text-[var(--color-text-muted)]">
            {t("lastDays", { count: HISTORY_DAYS })}
          </span>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)]">
          <div className="flex items-end justify-between gap-1" style={{ height: 140 }}>
            {stats.hoursPerDay.map((day) => {
              const heightPct = Math.max((day.hours / maxDayHours) * 100, day.hours > 0 ? 3 : 1);
              const label = format.dateTime(new Date(`${day.date}T12:00:00`), {
                day: "numeric",
                month: "short",
              });
              return (
                <div
                  key={day.date}
                  className="group relative flex h-full flex-1 flex-col items-center justify-end"
                  title={`${label} — ${t("hoursShort", { hours: day.hours })}`}
                >
                  <div
                    className="w-full max-w-7 rounded-t-[4px] bg-[var(--color-accent)] transition-opacity group-hover:opacity-80"
                    style={{ height: `${heightPct}%`, opacity: day.hours > 0 ? 1 : 0.15 }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between gap-1 border-t border-[var(--color-border)] pt-2">
            {stats.hoursPerDay.map((day, index) => (
              <span
                key={day.date}
                className="flex-1 text-center text-[10px] text-[var(--color-text-muted)]"
              >
                {index % 2 === 0
                  ? format.dateTime(new Date(`${day.date}T12:00:00`), {
                      day: "numeric",
                      month: "short",
                    })
                  : ""}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <BarList title={t("topServers")} items={stats.topServers} metric="bytes" />
        <BarList title={t("byDevice")} items={stats.byDevice} metric="hours" />
        <BarList title={t("byCountry")} items={stats.byCountry} metric="bytes" />
      </div>
    </div>
  );
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
        {title}
      </h1>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="mt-1.5 text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">
        {value}
      </p>
    </div>
  );
}

function BarList({
  title,
  items,
  metric,
}: {
  title: string;
  items: NamedTotal[];
  metric: "bytes" | "hours";
}) {
  const max = Math.max(...items.map((item) => (metric === "bytes" ? item.bytes : item.hours)), 1);
  return (
    <section>
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
        {title}
      </h2>
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)]">
        <ul className="flex flex-col gap-3">
          {items.map((item) => {
            const value = metric === "bytes" ? item.bytes : item.hours;
            return (
              <li key={item.name}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate font-medium text-[var(--color-text-primary)]">
                    {item.name}
                  </span>
                  <span className="shrink-0 text-xs text-[var(--color-text-secondary)]">
                    {metric === "bytes" ? formatBytes(item.bytes) : formatHours(item.hours)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--color-bg-subtle)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-accent)]"
                    style={{ width: `${(value / max) * 100}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
