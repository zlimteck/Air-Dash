"use server";

import { cookies } from "next/headers";
import { isLocale, localeCookieName, type Locale } from "@/i18n/routing";

export async function setLocale(locale: string) {
  if (!isLocale(locale)) return;
  const cookieStore = await cookies();
  cookieStore.set(localeCookieName, locale satisfies Locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "strict",
    httpOnly: false,
  });
}
