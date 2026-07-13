import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { consumeEmailVerificationToken } from "@/lib/auth/tokens";
import { writeAuditLog } from "@/lib/audit";
import { AuthCard } from "@/components/ui/AuthCard";
import { Alert } from "@/components/ui/Alert";

export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const t = await getTranslations("auth");

  const userId = await consumeEmailVerificationToken(token);

  if (!userId) {
    return (
      <AuthCard title={t("verifyErrorTitle")}>
        <Alert tone="error">{t("verifyErrorBody")}</Alert>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
        >
          {t("backToLogin")}
        </Link>
      </AuthCard>
    );
  }

  await writeAuditLog({ userId, action: "email.verified" });

  return (
    <AuthCard title={t("verifySuccessTitle")}>
      <Alert tone="success">{t("verifySuccessBody")}</Alert>
      <Link
        href="/login"
        className="mt-6 inline-block text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
      >
        {t("backToLogin")}
      </Link>
    </AuthCard>
  );
}
