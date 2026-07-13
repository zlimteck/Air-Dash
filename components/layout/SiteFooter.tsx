import { useTranslations } from "next-intl";

export function SiteFooter() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t border-[var(--color-border)] py-6">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-left text-xs text-[var(--color-text-muted)]">{t("tagline")}</p>
      </div>
    </footer>
  );
}
