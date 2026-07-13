# Air-Dash

A modern, multi-user dashboard for [AirVPN](https://airvpn.org), built on the
[public AirVPN API](https://airvpn.org/faq/api/). Not affiliated with AirVPN.

## Features

- **Public network status** — live server list, health, load and bandwidth
  (no account required), cached server-side to respect AirVPN's rate limits.
- **Personal dashboard** — your AirVPN account status, expiration, active VPN
  sessions (server, IPs, live speeds) and one-click session disconnect.
- **Multi-user accounts** — email + password sign-up with email verification,
  password reset, DB-backed revocable sessions.
- **Two-factor authentication** — TOTP (authenticator app) with single-use
  backup codes, plus **passkeys** (WebAuthn — Touch ID / Face ID / security
  keys) as a second factor.
- **Encrypted secrets** — each user's AirVPN API key and TOTP secret are
  encrypted at rest with AES-256-GCM; keys are decrypted in memory only for
  outbound AirVPN calls and never returned to the browser.
- **Bilingual** (English / French) and **light / dark / system** theming.
- **VPN profile generator** — downloads real WireGuard (`.conf`) / OpenVPN
  (`.ovpn`) configuration files for any server via AirVPN's generator
  service (undocumented but present on the API; discovered via the
  authenticated API Explorer), with port selection and optional device.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · Prisma + SQLite ·
next-intl · next-themes · @simplewebauthn · otplib · nodemailer

## Setup

```bash
cp .env.example .env
# Fill in the values (see below), then:
npm install
npx prisma migrate deploy
npm run dev
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLite path, e.g. `file:./dev.db` (Docker: `file:/data/airvpn.db`) |
| `APP_ORIGIN` | Canonical URL of the app — used in email links, WebAuthn rpID and CSRF origin checks |
| `ENCRYPTION_MASTER_KEY` | 32-byte base64 key (`openssl rand -base64 32`) encrypting AirVPN keys and TOTP secrets |
| `PENDING_AUTH_SECRET` | Secret signing the short-lived 2FA login tickets (`openssl rand -base64 32`) |
| `SMTP_*` | SMTP host/port/secure/user/password/from for verification and reset emails |

> **Back up `ENCRYPTION_MASTER_KEY`** (e.g. in your password manager).
> Losing it makes every stored AirVPN key and TOTP secret permanently
> undecryptable.

> Escape any `$` inside `.env` values as `\$` — Next.js expands `$VAR`
> references in env files.

## Docker

```bash
docker compose up -d --build
```

The app listens on port `3002` (mapped from 3000) and stores the SQLite
database on the `airvpn_data` volume. Run it behind a TLS-terminating reverse
proxy and set `APP_ORIGIN` to the public HTTPS URL — WebAuthn requires a
secure context, and session cookies are `Secure` in production.

## Security notes

- DB-backed sessions (`httpOnly`, `Secure`, `SameSite=Strict` cookie) —
  revocable server-side; password reset revokes all sessions.
- CSRF: `SameSite=Strict` plus an `Origin` header check on every mutating route.
- Rate limiting on all auth endpoints (per-IP and per-account, in-memory —
  use a shared store if you scale beyond one container).
- Security headers (CSP, HSTS, X-Frame-Options DENY, nosniff, Permissions-Policy).
- Anti-enumeration responses on signup / password-reset.
- Audit log (`AuditLog` table) for logins, key changes, 2FA/passkey changes
  and VPN disconnects — never contains secrets.
- AirVPN calls go through a server-side cache (status ~60s shared,
  userinfo ~20s per user) to stay far below AirVPN's 600 req / 10 min limit.
