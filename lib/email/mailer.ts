import "server-only";
import nodemailer from "nodemailer";
import { env } from "@/lib/env";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    const e = env();
    transporter = nodemailer.createTransport({
      host: e.SMTP_HOST,
      port: e.SMTP_PORT,
      secure: e.SMTP_SECURE,
      auth: { user: e.SMTP_USER, pass: e.SMTP_PASSWORD },
    });
  }
  return transporter;
}

const COPY = {
  en: {
    verifySubject: "Verify your email address",
    verifyBody: (link: string) =>
      wrap(
        "Verify your email address",
        "Thanks for signing up. Click the button below to confirm your email address. This link expires in 24 hours.",
        link,
        "Verify email",
        "If you did not create this account, you can safely ignore this email.",
      ),
    resetSubject: "Reset your password",
    resetBody: (link: string) =>
      wrap(
        "Reset your password",
        "We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.",
        link,
        "Reset password",
        "If you did not request this, you can safely ignore this email — your password is unchanged.",
      ),
    existsSubject: "You already have an account",
    existsBody: () =>
      wrap(
        "You already have an account",
        "Someone tried to sign up with your email address. If it was you, simply log in instead — or use the password reset if you forgot your password.",
        null,
        null,
        "If this wasn't you, no action is needed.",
      ),
  },
  fr: {
    verifySubject: "Vérifiez votre adresse email",
    verifyBody: (link: string) =>
      wrap(
        "Vérifiez votre adresse email",
        "Merci de votre inscription. Cliquez sur le bouton ci-dessous pour confirmer votre adresse email. Ce lien expire dans 24 heures.",
        link,
        "Vérifier l'email",
        "Si vous n'avez pas créé ce compte, vous pouvez ignorer cet email.",
      ),
    resetSubject: "Réinitialisez votre mot de passe",
    resetBody: (link: string) =>
      wrap(
        "Réinitialisez votre mot de passe",
        "Nous avons reçu une demande de réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau. Ce lien expire dans 1 heure.",
        link,
        "Réinitialiser le mot de passe",
        "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email — votre mot de passe reste inchangé.",
      ),
    existsSubject: "Vous avez déjà un compte",
    existsBody: () =>
      wrap(
        "Vous avez déjà un compte",
        "Quelqu'un a tenté de s'inscrire avec votre adresse email. Si c'était vous, connectez-vous simplement — ou utilisez la réinitialisation de mot de passe si vous l'avez oublié.",
        null,
        null,
        "Si ce n'était pas vous, aucune action n'est nécessaire.",
      ),
  },
} as const;

type Locale = keyof typeof COPY;

function wrap(
  title: string,
  body: string,
  link: string | null,
  cta: string | null,
  footer: string,
): string {
  const button =
    link && cta
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;"><tr><td style="border-radius:8px;background:#4f46e5;"><a href="${link}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;">${cta}</a></td></tr></table>
      <p style="font-size:12px;color:#6b7280;word-break:break-all;">${link}</p>`
      : "";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
  <tr><td style="padding:32px;">
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#4f46e5;">Air-Dash</p>
    <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">${title}</h1>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">${body}</p>
    ${button}
    <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#9ca3af;">${footer}</p>
  </td></tr></table>
  </td></tr></table></body></html>`;
}

async function send(to: string, subject: string, html: string): Promise<void> {
  await getTransporter().sendMail({
    from: env().SMTP_FROM,
    to,
    subject,
    html,
  });
}

export async function sendVerificationEmail(to: string, rawToken: string, locale: string): Promise<void> {
  const l: Locale = locale === "fr" ? "fr" : "en";
  const link = `${env().APP_ORIGIN}/verify-email/${rawToken}`;
  await send(to, COPY[l].verifySubject, COPY[l].verifyBody(link));
}

export async function sendPasswordResetEmail(to: string, rawToken: string, locale: string): Promise<void> {
  const l: Locale = locale === "fr" ? "fr" : "en";
  const link = `${env().APP_ORIGIN}/reset-password/${rawToken}`;
  await send(to, COPY[l].resetSubject, COPY[l].resetBody(link));
}

/** Anti-enumeration: sent when someone signs up with an already-registered email. */
export async function sendAccountExistsEmail(to: string, locale: string): Promise<void> {
  const l: Locale = locale === "fr" ? "fr" : "en";
  await send(to, COPY[l].existsSubject, COPY[l].existsBody());
}
