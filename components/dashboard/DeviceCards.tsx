import { getTranslations, getFormatter } from "next-intl/server";
import { MonitorSmartphone, Wifi } from "lucide-react";
import { AddDeviceButton, DeleteDeviceButton } from "@/components/dashboard/DeviceActions";
import type { AirVpnDevice } from "@/lib/airvpn/types";

export async function DeviceCards({
  devices,
  connectedDeviceNames,
}: {
  devices: AirVpnDevice[];
  connectedDeviceNames: Set<string>;
}) {
  const t = await getTranslations("dashboard");
  const format = await getFormatter();

  return (
    <>
      <h2 className="mb-3 mt-8 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
        {t("devices")}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {devices.map((device) => {
          const connected = connectedDeviceNames.has(device.name);
          return (
            <div
              key={device.id}
              className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]">
                    <MonitorSmartphone size={15} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {device.name}
                    </p>
                    {device.description && (
                      <p className="text-xs text-[var(--color-text-muted)]">{device.description}</p>
                    )}
                  </div>
                </div>
                <span className="flex items-center gap-1.5">
                  {connected ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-[var(--color-success-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--color-success)]">
                      <Wifi size={11} />
                      {t("connected")}
                    </span>
                  ) : (
                    <span className="rounded-full bg-[var(--color-bg-subtle)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
                      {t("offline")}
                    </span>
                  )}
                  {!connected && (
                    <DeleteDeviceButton deviceId={device.id} deviceName={device.name} />
                  )}
                </span>
              </div>
              <dl className="mt-3 flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
                {device.wireguard_ipv4 && (
                  <div className="flex justify-between">
                    <dt>{t("wireguardIp")}</dt>
                    <dd className="font-mono text-[var(--color-text-secondary)]">
                      {device.wireguard_ipv4}
                    </dd>
                  </div>
                )}
                {device.vpn_last_from_unix ? (
                  <div className="flex justify-between">
                    <dt>{t("lastConnection")}</dt>
                    <dd className="text-[var(--color-text-secondary)]">
                      {format.dateTime(new Date(device.vpn_last_from_unix * 1000), {
                        dateStyle: "medium",
                      })}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          );
        })}
      </div>
      <div className="mt-4">
        <AddDeviceButton />
      </div>
    </>
  );
}
