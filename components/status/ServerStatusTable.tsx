"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from "lucide-react";
import { HealthBadge } from "./HealthBadge";
import type { AirVpnServer } from "@/lib/airvpn/types";

type SortKey = "server" | "location" | "load" | "health";
type SortDirection = "asc" | "desc";

const HEALTH_RANK: Record<string, number> = { ok: 0, warning: 1, error: 2 };

const COMPARATORS: Record<SortKey, (a: AirVpnServer, b: AirVpnServer) => number> = {
  server: (a, b) => a.public_name.localeCompare(b.public_name),
  location: (a, b) =>
    a.country_name.localeCompare(b.country_name) || a.location.localeCompare(b.location),
  load: (a, b) => a.currentload - b.currentload,
  health: (a, b) => (HEALTH_RANK[a.health] ?? 3) - (HEALTH_RANK[b.health] ?? 3),
};

export function ServerStatusTable({ servers }: { servers: AirVpnServer[] }) {
  const t = useTranslations("status");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("load");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection(key === "load" ? "desc" : "asc");
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? servers.filter(
          (s) =>
            s.public_name.toLowerCase().includes(q) ||
            s.country_name.toLowerCase().includes(q) ||
            s.location.toLowerCase().includes(q),
        )
      : servers;
    const sorted = [...list].sort(COMPARATORS[sortKey]);
    if (sortDirection === "desc") sorted.reverse();
    return sorted;
  }, [servers, query, sortKey, sortDirection]);

  const columns: { key: SortKey; label: string }[] = [
    { key: "server", label: t("server") },
    { key: "location", label: t("location") },
    { key: "load", label: t("load") },
    { key: "health", label: t("healthLabel") },
  ];

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
        <Search size={15} className="text-[var(--color-text-muted)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("server")}
          className="w-full bg-transparent text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
              {columns.map(({ key, label }) => (
                <th key={key} className="px-4 py-2.5 font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort(key)}
                    aria-sort={
                      sortKey === key
                        ? sortDirection === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                    className="flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-[var(--color-text-primary)]"
                  >
                    {label}
                    {sortKey === key ? (
                      sortDirection === "asc" ? (
                        <ArrowUp size={12} />
                      ) : (
                        <ArrowDown size={12} />
                      )
                    ) : (
                      <ChevronsUpDown size={12} className="opacity-40" />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((server) => (
              <tr
                key={server.public_name}
                className="border-t border-[var(--color-border)] transition-colors hover:bg-[var(--color-bg-subtle)]"
              >
                <td className="px-4 py-2.5 font-medium text-[var(--color-text-primary)]">
                  {server.public_name}
                </td>
                <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">
                  {server.location}, {server.country_name}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--color-bg-subtle)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-accent)]"
                        style={{ width: `${Math.min(server.currentload, 100)}%` }}
                      />
                    </div>
                    <span className="text-[var(--color-text-secondary)]">{server.currentload}%</span>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <HealthBadge health={server.health} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
            {t("noResults")}
          </p>
        )}
      </div>
    </div>
  );
}
