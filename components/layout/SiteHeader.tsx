import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { getSession } from "@/lib/auth/session";
import { ShieldCheck } from "lucide-react";

export async function SiteHeader() {
  const t = await getTranslations("nav");
  const auth = await getSession();
  const isLoggedIn = !!auth;

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-md">
      <div className="relative mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
          <ShieldCheck size={18} className="text-[var(--color-accent)]" strokeWidth={2.25} />
          Air-Dash
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-[var(--color-text-secondary)] lg:flex">
          <Link href="/" className="transition-colors hover:text-[var(--color-text-primary)]">
            {t("status")}
          </Link>
          {isLoggedIn && (
            <>
              <Link
                href="/dashboard"
                className="transition-colors hover:text-[var(--color-text-primary)]"
              >
                {t("dashboard")}
              </Link>
              <Link
                href="/vpn-profiles"
                className="transition-colors hover:text-[var(--color-text-primary)]"
              >
                {t("vpnProfiles")}
              </Link>
              <Link
                href="/stats"
                className="transition-colors hover:text-[var(--color-text-primary)]"
              >
                {t("stats")}
              </Link>
              <Link
                href="/settings"
                className="transition-colors hover:text-[var(--color-text-primary)]"
              >
                {t("settings")}
              </Link>
            </>
          )}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <LocaleSwitcher />
          <ThemeToggle />
          {isLoggedIn ? (
            <LogoutButton />
          ) : (
            <Link
              href="/login"
              className="ml-1 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3.5 py-1.5 text-sm font-medium text-[var(--color-text-on-accent)] transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              {t("login")}
            </Link>
          )}
        </div>

        <MobileMenu isLoggedIn={isLoggedIn} />
      </div>
    </header>
  );
}
