import { getTranslations } from "next-intl/server";
import { getStatus, listDevices } from "@/lib/airvpn/client";
import { getSession } from "@/lib/auth/session";
import { decryptUserApiKey } from "@/lib/airvpn/userKey";
import { ProfileGeneratorForm } from "./ProfileGeneratorForm";

export default async function VpnProfilesPage() {
  const t = await getTranslations("vpnProfiles");
  const auth = await getSession();

  let servers: { name: string; location: string; country: string; load: number }[] = [];
  try {
    const status = await getStatus();
    servers = status.servers
      .filter((server) => server.health !== "error")
      .map((server) => ({
        name: server.public_name,
        location: server.location,
        country: server.country_name,
        load: server.currentload,
      }))
      .sort((a, b) => a.load - b.load);
  } catch {
    // The form still renders; server search will simply be empty.
  }

  let devices: { name: string; description: string | null }[] = [];
  const apiKey = auth ? decryptUserApiKey(auth.user) : null;
  if (auth && apiKey) {
    try {
      const response = await listDevices(auth.user.id, apiKey);
      devices = response.devices.map((device) => ({
        name: device.name,
        description: device.description || null,
      }));
    } catch {
      // Device list is a convenience; the form falls back to the default device.
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t("subtitle")}</p>
      </div>

      <ProfileGeneratorForm servers={servers} devices={devices} />
    </div>
  );
}
