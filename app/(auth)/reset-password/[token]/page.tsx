import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { peekPasswordResetToken } from "@/lib/auth/tokens";
import { AuthCard } from "@/components/ui/AuthCard";
import { Alert } from "@/components/ui/Alert";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const t = await getTranslations("auth");

  const userId = await peekPasswordResetToken(token);
  if (!userId) {
    return (
      <AuthCard title={t("verifyErrorTitle")}>
        <Alert tone="error">{t("errors.invalid_token")}</Alert>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
        >
          {t("forgotTitle")}
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("resetTitle")}>
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
