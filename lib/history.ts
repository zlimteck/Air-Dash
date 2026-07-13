import "server-only";
import { db } from "@/lib/db";
import type { AirVpnUserInfo } from "@/lib/airvpn/types";

/**
 * Records a userinfo snapshot into the local connection history. Called on
 * every dashboard render (~30s while the page is open thanks to the
 * auto-refresh), so granularity depends on the dashboard being open —
 * AirVPN itself keeps no history at all.
 *
 * One row per connection, identified by (userId, serverName,
 * connectedSinceUnix, deviceName): bytes/lastSeenAt are updated while the
 * session lives; open rows that disappear from the snapshot get endedAt.
 * Best-effort: any failure is swallowed so the dashboard never breaks.
 */
export async function recordSessionsSnapshot(userId: string, info: AirVpnUserInfo): Promise<void> {
  try {
    const sessions = (info.sessions ?? []).filter((s) => s.server_name && s.connected_since_unix);
    const now = new Date();

    const liveKeys = new Set(
      sessions.map((s) => `${s.server_name}|${s.connected_since_unix}|${s.device_name ?? ""}`),
    );

    const openRows = await db.vpnConnectionLog.findMany({
      where: { userId, endedAt: null },
    });

    const operations = [];

    // Close rows whose session vanished from the snapshot.
    for (const row of openRows) {
      const key = `${row.serverName}|${row.connectedSinceUnix}|${row.deviceName ?? ""}`;
      if (!liveKeys.has(key)) {
        operations.push(
          db.vpnConnectionLog.update({
            where: { id: row.id },
            data: { endedAt: now },
          }),
        );
      }
    }

    // Upsert live sessions.
    for (const session of sessions) {
      operations.push(
        db.vpnConnectionLog.upsert({
          where: {
            userId_serverName_connectedSinceUnix_deviceName: {
              userId,
              serverName: session.server_name!,
              connectedSinceUnix: BigInt(session.connected_since_unix!),
              deviceName: session.device_name ?? "",
            },
          },
          create: {
            userId,
            serverName: session.server_name!,
            deviceName: session.device_name ?? "",
            serverCountry: session.server_country ?? null,
            serverLocation: session.server_location ?? null,
            exitIp: session.exit_ip ?? null,
            connectedSinceUnix: BigInt(session.connected_since_unix!),
            bytesRead: BigInt(session.bytes_read ?? 0),
            bytesWrite: BigInt(session.bytes_write ?? 0),
          },
          update: {
            bytesRead: BigInt(session.bytes_read ?? 0),
            bytesWrite: BigInt(session.bytes_write ?? 0),
            lastSeenAt: now,
            endedAt: null,
          },
        }),
      );
    }

    if (operations.length > 0) {
      await db.$transaction(operations);
    }
  } catch {
    // History is best-effort.
  }
}

export interface ConnectionHistoryEntry {
  id: string;
  deviceName: string | null;
  serverName: string;
  serverCountry: string | null;
  serverLocation: string | null;
  connectedSince: Date;
  lastSeenAt: Date;
  endedAt: Date | null;
  totalBytes: number;
}

export async function getConnectionHistory(
  userId: string,
  limit = 10,
): Promise<ConnectionHistoryEntry[]> {
  const rows = await db.vpnConnectionLog.findMany({
    where: { userId },
    orderBy: { lastSeenAt: "desc" },
    take: limit,
  });
  return rows.map((row) => ({
    id: row.id,
    deviceName: row.deviceName || null,
    serverName: row.serverName,
    serverCountry: row.serverCountry,
    serverLocation: row.serverLocation,
    connectedSince: new Date(Number(row.connectedSinceUnix) * 1000),
    lastSeenAt: row.lastSeenAt,
    endedAt: row.endedAt,
    totalBytes: Number(row.bytesRead) + Number(row.bytesWrite),
  }));
}
