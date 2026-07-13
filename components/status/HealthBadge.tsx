import { useTranslations } from "next-intl";
import type { AirVpnHealth } from "@/lib/airvpn/types";

const STYLES: Record<AirVpnHealth, string> = {
  ok: "bg-[var(--color-success-subtle)] text-[var(--color-success)]",
  warning: "bg-[var(--color-warning-subtle)] text-[var(--color-warning)]",
  error: "bg-[var(--color-danger-subtle)] text-[var(--color-danger)]",
};

export function HealthBadge({ health }: { health: AirVpnHealth }) {
  const t = useTranslations("status.health");

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[health]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {t(health)}
    </span>
  );
}
