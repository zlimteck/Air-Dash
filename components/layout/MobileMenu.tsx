"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { LogoutButton } from "@/components/layout/LogoutButton";

export function MobileMenu({ isLoggedIn }: { isLoggedIn: boolean }) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={t("menu")}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)]"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-14 z-20 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-4 shadow-[var(--shadow-lg)]">
          <nav className="flex flex-col gap-3 text-sm text-[var(--color-text-secondary)]">
            <Link href="/" onClick={() => setOpen(false)} className="hover:text-[var(--color-text-primary)]">
              {t("status")}
            </Link>
            {isLoggedIn && (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="hover:text-[var(--color-text-primary)]"
                >
                  {t("dashboard")}
                </Link>
                <Link
                  href="/vpn-profiles"
                  onClick={() => setOpen(false)}
                  className="hover:text-[var(--color-text-primary)]"
                >
                  {t("vpnProfiles")}
                </Link>
                <Link
                  href="/stats"
                  onClick={() => setOpen(false)}
                  className="hover:text-[var(--color-text-primary)]"
                >
                  {t("stats")}
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setOpen(false)}
                  className="hover:text-[var(--color-text-primary)]"
                >
                  {t("settings")}
                </Link>
              </>
            )}
          </nav>

          <div className="mt-4 flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>

          {isLoggedIn ? (
            <LogoutButton variant="mobile" />
          ) : (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="mt-4 flex h-9 w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] text-sm font-medium text-[var(--color-text-on-accent)] transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              {t("login")}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
