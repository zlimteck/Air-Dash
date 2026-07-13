"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

export function LogoutButton({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const t = useTranslations("nav");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (variant === "mobile") {
    return (
      <button
        type="button"
        onClick={logout}
        disabled={loading}
        className="mt-4 flex h-9 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-subtle)] disabled:opacity-60"
      >
        <LogOut size={15} />
        {t("logout")}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      title={t("logout")}
      className="ml-1 flex h-8 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] px-3 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-subtle)] disabled:opacity-60"
    >
      <LogOut size={14} />
      {t("logout")}
    </button>
  );
}
