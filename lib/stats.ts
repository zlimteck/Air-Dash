import "server-only";
import { db } from "@/lib/db";

export interface DayUsage {
  /** ISO date (YYYY-MM-DD), local server time. */
  date: string;
  hours: number;
}

export interface NamedTotal {
  name: string;
  bytes: number;
  hours: number;
}

export interface UsageStats {
  totalBytes: number;
  totalConnections: number;
  totalHours: number;
  distinctServers: number;
  hoursPerDay: DayUsage[];
  topServers: NamedTotal[];
  byDevice: NamedTotal[];
  byCountry: NamedTotal[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Overlap in hours between [start, end] and the given day. */
function overlapHours(start: Date, end: Date, dayStart: Date): number {
  const dayEnd = new Date(dayStart.getTime() + DAY_MS);
  const from = Math.max(start.getTime(), dayStart.getTime());
  const to = Math.min(end.getTime(), dayEnd.getTime());
  return Math.max(0, to - from) / 3_600_000;
}

export async function getUsageStats(userId: string, days = 14): Promise<UsageStats> {
  const rows = await db.vpnConnectionLog.findMany({ where: { userId } });
  const now = new Date();

  let totalBytes = 0;
  let totalHours = 0;
  const servers = new Map<string, NamedTotal>();
  const devices = new Map<string, NamedTotal>();
  const countries = new Map<string, NamedTotal>();

  const dayStarts: Date[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    dayStarts.push(d);
  }
  const hoursByDay = new Map(dayStarts.map((d) => [dayKey(d), 0]));

  for (const row of rows) {
    const start = new Date(Number(row.connectedSinceUnix) * 1000);
    // lastSeenAt is the best "still alive at" signal we have for open rows.
    const end = row.endedAt ?? row.lastSeenAt;
    const bytes = Number(row.bytesRead) + Number(row.bytesWrite);
    const hours = Math.max(0, end.getTime() - start.getTime()) / 3_600_000;

    totalBytes += bytes;
    totalHours += hours;

    const bump = (map: Map<string, NamedTotal>, name: string) => {
      const entry = map.get(name) ?? { name, bytes: 0, hours: 0 };
      entry.bytes += bytes;
      entry.hours += hours;
      map.set(name, entry);
    };
    bump(servers, row.serverName);
    if (row.deviceName) bump(devices, row.deviceName);
    if (row.serverCountry) bump(countries, row.serverCountry);

    for (const dayStart of dayStarts) {
      const key = dayKey(dayStart);
      hoursByDay.set(key, (hoursByDay.get(key) ?? 0) + overlapHours(start, end, dayStart));
    }
  }

  const byBytes = (a: NamedTotal, b: NamedTotal) => b.bytes - a.bytes;

  return {
    totalBytes,
    totalConnections: rows.length,
    totalHours,
    distinctServers: servers.size,
    hoursPerDay: dayStarts.map((d) => ({
      date: dayKey(d),
      hours: Math.round((hoursByDay.get(dayKey(d)) ?? 0) * 10) / 10,
    })),
    topServers: [...servers.values()].sort(byBytes).slice(0, 6),
    byDevice: [...devices.values()].sort(byBytes),
    byCountry: [...countries.values()].sort(byBytes).slice(0, 6),
  };
}
