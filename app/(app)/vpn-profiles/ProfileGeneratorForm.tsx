"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { FileDown, Network, Share2, Shield } from "lucide-react";

interface ServerOption {
  name: string;
  location: string;
  country: string;
  load: number;
}

interface DeviceOption {
  name: string;
  description: string | null;
}

const PORTS: Record<"wireguard" | "openvpn", number[]> = {
  wireguard: [1637, 47107, 51820],
  openvpn: [443, 1194, 2018, 80, 53],
};

export function ProfileGeneratorForm({
  servers,
  devices,
}: {
  servers: ServerOption[];
  devices: DeviceOption[];
}) {
  const t = useTranslations("vpnProfiles");
  const [protocol, setProtocol] = useState<"openvpn" | "wireguard">("wireguard");
  const [port, setPort] = useState<number>(PORTS.wireguard[0]);
  const [device, setDevice] = useState<string>(devices[0]?.name ?? "");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [shareFile, setShareFile] = useState<File | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return servers;
    return servers.filter(
      (server) =>
        server.name.toLowerCase().includes(q) ||
        server.location.toLowerCase().includes(q) ||
        server.country.toLowerCase().includes(q),
    );
  }, [servers, query]);

  function switchProtocol(value: "openvpn" | "wireguard") {
    setProtocol(value);
    setPort(PORTS[value][0]);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    setDownloaded(null);
    setQrDataUrl(null);
    setShareFile(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const deviceName = devices.length > 0 ? device : String(form.get("deviceName") ?? "").trim();
    try {
      const res = await fetch("/api/vpn-profiles/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          protocol,
          serverName: selected,
          port,
          deviceName: deviceName || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.profile) {
        setError(data?.error ?? "unknown");
        return;
      }

      const blob = new Blob([data.profile.content], { type: data.profile.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.profile.filename;
      a.click();
      URL.revokeObjectURL(url);
      setDownloaded(data.profile.filename);
      setQrDataUrl(data.qrDataUrl ?? null);

      // Web Share with a file: on mobile/tablet the share sheet offers
      // WireGuard/OpenVPN, which import the profile directly.
      const file = new File([data.profile.content], data.profile.filename, {
        type: "application/octet-stream",
      });
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        setShareFile(file);
      }
    } catch {
      setError("unknown");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-xl flex-col gap-6">
      {error && (
        <Alert tone="error">{t(`errors.${error}` as Parameters<typeof t>[0])}</Alert>
      )}
      {downloaded && <Alert tone="success">{t("downloaded", { filename: downloaded })}</Alert>}
      {shareFile && (
        <div className="flex flex-col gap-1.5">
          <Button
            type="button"
            variant="secondary"
            className="w-fit"
            onClick={() => {
              navigator.share({ files: [shareFile] }).catch(() => {
                // User dismissed the share sheet — nothing to do.
              });
            }}
          >
            <Share2 size={15} />
            {t("openInApp")}
          </Button>
          <p className="text-xs text-[var(--color-text-muted)]">{t("openInAppHint")}</p>
        </div>
      )}
      {qrDataUrl && (
        <div className="flex flex-col items-start gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL, next/image adds nothing */}
          <img
            src={qrDataUrl}
            alt={t("qrAlt")}
            width={200}
            height={200}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-2"
          />
          <p className="text-xs text-[var(--color-text-muted)]">{t("qrHint")}</p>
        </div>
      )}

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-[var(--color-text-primary)]">
          {t("protocol")}
        </legend>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { value: "wireguard", label: "WireGuard", icon: Network },
              { value: "openvpn", label: "OpenVPN", icon: Shield },
            ] as const
          ).map(({ value, label, icon: Icon }) => (
            <label
              key={value}
              className={`flex cursor-pointer items-center gap-3 rounded-[var(--radius-lg)] border p-4 transition-colors ${
                protocol === value
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-subtle)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]"
              }`}
            >
              <input
                type="radio"
                name="protocol"
                value={value}
                checked={protocol === value}
                onChange={() => switchProtocol(value)}
                className="sr-only"
              />
              <Icon
                size={18}
                className={protocol === value ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"}
              />
              <span className="text-sm font-medium text-[var(--color-text-primary)]">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label
          htmlFor="port"
          className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]"
        >
          {t("port")}
        </label>
        <select
          id="port"
          value={port}
          onChange={(e) => setPort(Number(e.target.value))}
          className="h-10 w-40 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-subtle)]"
        >
          {PORTS[protocol].map((value) => (
            <option key={value} value={value}>
              UDP {value}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]">
          {t("server")}
        </label>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
          }}
          placeholder={t("serverPlaceholder")}
          className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-sm text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-subtle)]"
        />
        <ul className="mt-2 flex max-h-72 flex-col divide-y divide-[var(--color-border)] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)]">
          {filtered.map((server) => (
            <li key={server.name}>
              <button
                type="button"
                onClick={() => setSelected(server.name)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                  selected === server.name
                    ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent)]"
                    : "bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]"
                }`}
              >
                <span className="min-w-24 font-medium">{server.name}</span>
                <span className="flex-1 truncate text-xs text-[var(--color-text-muted)]">
                  {server.location}, {server.country}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="h-1.5 w-14 overflow-hidden rounded-full bg-[var(--color-bg-subtle)]">
                    <span
                      className="block h-full rounded-full bg-[var(--color-accent)]"
                      style={{ width: `${Math.min(server.load, 100)}%` }}
                    />
                  </span>
                  <span className="w-9 text-right text-xs tabular-nums text-[var(--color-text-secondary)]">
                    {server.load}%
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {devices.length > 0 ? (
        <div>
          <label
            htmlFor="device"
            className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]"
          >
            {t("device")}
          </label>
          <select
            id="device"
            value={device}
            onChange={(e) => setDevice(e.target.value)}
            className="h-10 w-full max-w-xs rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-subtle)]"
          >
            {devices.map((option) => (
              <option key={option.name} value={option.name}>
                {option.description ? `${option.name} — ${option.description}` : option.name}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">{t("deviceHint")}</p>
        </div>
      ) : (
        <Field
          label={t("deviceName")}
          name="deviceName"
          type="text"
          placeholder={t("deviceNamePlaceholder")}
          maxLength={64}
        />
      )}

      <Button type="submit" loading={loading} disabled={!selected} className="w-fit">
        <FileDown size={15} />
        {t("generate")}
      </Button>
    </form>
  );
}
