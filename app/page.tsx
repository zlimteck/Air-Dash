import { getTranslations } from "next-intl/server";
import { getStatus } from "@/lib/airvpn/client";
import { AirVpnApiError } from "@/lib/airvpn/errors";
import { StatusSummary } from "@/components/status/StatusSummary";
import { ServerStatusTable } from "@/components/status/ServerStatusTable";

export const revalidate = 60;

export default async function StatusPage() {
  const t = await getTranslations("status");

  let status: Awaited<ReturnType<typeof getStatus>> | null = null;
  let error = false;
  try {
    status = await getStatus();
  } catch (err) {
    error = err instanceof AirVpnApiError || true;
  }

  const global = status?.planets.find((p) => p.public_name === "Earth") ?? status?.planets[0];

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t("subtitle")}</p>
      </div>

      {error || !status ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-danger)]/30 bg-[var(--color-danger-subtle)] p-4 text-sm text-[var(--color-danger)]">
          {t("error")}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <StatusSummary global={global} />
          <ServerStatusTable servers={status.servers} />
        </div>
      )}
    </div>
  );
}
