"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Plus, Trash2 } from "lucide-react";

export function AddDeviceButton() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [added, setAdded] = useState(false);

  async function add() {
    setError(false);
    setAdded(false);
    setLoading(true);
    try {
      const res = await fetch("/api/account/devices", { method: "POST" });
      if (!res.ok) {
        setError(true);
        return;
      }
      setAdded(true);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <Alert tone="error">{t("deviceError")}</Alert>}
      {added && <Alert tone="info">{t("deviceAdded")}</Alert>}
      <Button type="button" variant="secondary" onClick={add} loading={loading} className="w-fit">
        <Plus size={15} />
        {t("addDevice")}
      </Button>
    </div>
  );
}

export function DeleteDeviceButton({
  deviceId,
  deviceName,
}: {
  deviceId: string;
  deviceName: string;
}) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function remove() {
    if (!window.confirm(t("deleteDeviceConfirm", { name: deviceName }))) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/account/devices/${deviceId}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={loading}
      title={t("deleteDevice")}
      className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-danger-subtle)] hover:text-[var(--color-danger)] disabled:opacity-60"
    >
      <Trash2 size={14} />
    </button>
  );
}
