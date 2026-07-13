import { getTranslations, getFormatter } from "next-intl/server";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getStatus, getUserInfo, listDevices } from "@/lib/airvpn/client";
import { decryptUserApiKey } from "@/lib/airvpn/userKey";
import { AirVpnApiError } from "@/lib/airvpn/errors";
import { getConnectionHistory, recordSessionsSnapshot } from "@/lib/history";
import { SessionCard } from "@/components/dashboard/SessionCard";
import { AutoRefresh } from "@/components/dashboard/AutoRefresh";
import { DeviceCards } from "@/components/dashboard/DeviceCards";
import { ConnectionHistory } from "@/components/dashboard/ConnectionHistory";
import { WorldMap } from "@/components/dashboard/WorldMap";
import { Alert } from "@/components/ui/Alert";
import { BadgeCheck, CircleOff, KeyRound, Wifi } from "lucide-react";
import type { AirVpnDevice, AirVpnUserInfo } from "@/lib/airvpn/types";

export const dynamic = "force-dynamic";

// Every AirVPN premium plan includes 5 simultaneous connections.
const MAX_CONNECTIONS = 5;

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const format = await getFormatter();
  const auth = await getSession();
  if (!auth) return null;

  const apiKey = decryptUserApiKey(auth.user);

  if (!apiKey) {
    return (
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <div className="mt-4 flex flex-col items-start gap-4 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-sm)]">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent)]">
            <KeyRound size={18} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              {t("noKeyTitle")}
            </h2>
            <p className="mt-1 max-w-xl text-sm text-[var(--color-text-secondary)]">
              {t("noKeyBody")}
            </p>
          </div>
          <Link
            href="/settings"
            className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-text-on-accent)] transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            {t("goToSettings")}
          </Link>
        </div>
      </div>
    );
  }

  let info: AirVpnUserInfo | null = null;
  let errorKind: "invalid_key" | "unavailable" | null = null;
  try {
    info = await getUserInfo(auth.user.id, apiKey);
  } catch (err) {
    errorKind =
      err instanceof AirVpnApiError && err.code === "invalid_key" ? "invalid_key" : "unavailable";
  }

  if (!info) {
    return (
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <div className="mt-4">
          <Alert tone="error">
            {errorKind === "invalid_key" ? t("invalidKey") : t("unavailable")}
          </Alert>
        </div>
      </div>
    );
  }

  const user = info.user;
  const sessions = info.sessions ?? [];
  const connected = user.connected ?? sessions.length > 0;
  // Server component runs once per request — Date.now() marks this fetch so
  // the client sparklines record one sample per auto-refresh.
  // eslint-disable-next-line react-hooks/purity
  const fetchedAt = Date.now();

  // Best-effort side data: history snapshot, devices, map locations.
  await recordSessionsSnapshot(auth.user.id, info);

  let devices: AirVpnDevice[] = [];
  try {
    devices = (await listDevices(auth.user.id, apiKey)).devices;
  } catch {
    // Devices row simply not shown.
  }

  let serverLocations: string[] = [];
  try {
    serverLocations = (await getStatus()).servers.map((server) => server.location);
  } catch {
    // Map falls back to active sessions only.
  }

  const history = await getConnectionHistory(auth.user.id, 10);
  const connectedDeviceNames = new Set(
    sessions.map((session) => session.device_name).filter((name): name is string => !!name),
  );

  // Expiration progress: remaining days against a one-year window.
  const expirationDays = typeof user.expiration_days === "number" ? user.expiration_days : null;
  const expirationRatio =
    expirationDays !== null ? Math.max(0, Math.min(1, expirationDays / 365)) : null;
  const expirationTone =
    expirationDays === null
      ? "var(--color-accent)"
      : expirationDays < 30
        ? "var(--color-danger)"
        : expirationDays < 90
          ? "var(--color-warning)"
          : "var(--color-success)";

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <AutoRefresh />
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={t("login")} value={user.login} />
        <StatCard
          label={t("account")}
          value={user.premium ? t("premium") : t("free")}
          icon={user.premium ? <BadgeCheck size={15} className="text-[var(--color-success)]" /> : undefined}
        />
        <StatCard
          label={t("expires")}
          value={
            user.expiration_unix
              ? format.dateTime(new Date(user.expiration_unix * 1000), { dateStyle: "medium" })
              : "—"
          }
          hint={expirationDays !== null ? t("expiresIn", { days: expirationDays }) : undefined}
          extra={
            expirationRatio !== null ? (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-bg-subtle)]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${expirationRatio * 100}%`, backgroundColor: expirationTone }}
                />
              </div>
            ) : undefined
          }
        />
        <StatCard
          label={connected ? t("connected") : t("notConnected")}
          value={
            connected ? (
              <span className="flex items-center gap-2 text-[var(--color-success)]">
                <Wifi size={18} />
                {sessions.length || 1}
                <span className="text-sm font-normal text-[var(--color-text-muted)]">
                  / {MAX_CONNECTIONS}
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-2 text-[var(--color-text-muted)]">
                <CircleOff size={18} />0
                <span className="text-sm font-normal">/ {MAX_CONNECTIONS}</span>
              </span>
            )
          }
        />
      </div>

      <h2 className="mb-3 mt-8 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
        {t("map")}
      </h2>
      <WorldMap
        sessions={sessions.map((session) => ({
          serverName: session.server_name ?? "",
          location: session.server_location,
          country: session.server_country,
        }))}
        serverLocations={serverLocations}
      />

      <h2 className="mb-3 mt-8 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
        {t("sessions")}
      </h2>
      {sessions.length === 0 ? (
        <p className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-text-muted)]">
          {t("noSessions")}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {sessions.map((session, index) => (
            <SessionCard
              key={`${session.server_name}-${session.device_name}-${index}`}
              session={session}
              fetchedAt={fetchedAt}
            />
          ))}
        </div>
      )}

      <DeviceCards devices={devices} connectedDeviceNames={connectedDeviceNames} />

      <ConnectionHistory entries={history} />
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

function StatCard({
  label,
  value,
  hint,
  icon,
  extra,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </p>
      <div className="mt-1.5 flex items-center gap-1.5 text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">
        {icon}
        {value}
      </div>
      {hint && <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{hint}</p>}
      {extra}
    </div>
  );
}
