"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocale } from "@/lib/actions/locale";
import { locales } from "@/i18n/routing";

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("locale");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div
      role="radiogroup"
      aria-label={t("toggle")}
      className="inline-flex items-center gap-0.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5"
    >
      {locales.map((value) => {
        const active = locale === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await setLocale(value);
                router.refresh();
              })
            }
            className={`flex h-7 items-center justify-center rounded-[var(--radius-sm)] px-2 text-xs font-medium uppercase tracking-wide transition-colors cursor-pointer ${
              active
                ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}
