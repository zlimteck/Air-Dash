# --- Build stage ---
FROM node:24-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

COPY . .
RUN npx prisma generate

# Build-time-only placeholder env vars: Next.js evaluates lib/env.ts (Zod
# validation) while collecting page data for every route, even ones that
# don't touch the database. Real values are supplied at container start via
# docker-compose's env_file — these never end up in the built image, only
# in this ephemeral build layer's process environment.
ENV DATABASE_URL="file:/tmp/build.db" \
    APP_ORIGIN="http://localhost:3000" \
    ENCRYPTION_MASTER_KEY="MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=" \
    PENDING_AUTH_SECRET="build-time-placeholder-secret-not-used-at-runtime" \
    SMTP_HOST="localhost" \
    SMTP_PORT="587" \
    SMTP_SECURE="false" \
    SMTP_USER="build" \
    SMTP_PASSWORD="build" \
    SMTP_FROM="build@localhost"

RUN npm run build

# Assemble a complete, isolated Prisma CLI closure for `migrate deploy` at
# container start. Installing `prisma` (plus dotenv, which prisma.config.ts
# imports) pulls its full dependency tree — @prisma/config → effect, c12, … —
# so the runtime stage gets a working CLI without hand-copying transitive
# deps (which broke with `Cannot find module 'effect'`). Versions are pinned
# to exactly what `npm ci` resolved above, so there's no drift vs the lockfile.
RUN npm install --prefix /opt/prisma-cli --no-save \
      "prisma@$(node -p "require('/app/node_modules/prisma/package.json').version")" \
      "dotenv@$(node -p "require('/app/node_modules/dotenv/package.json').version")"

# --- Runtime stage ---
FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN groupadd --system app && useradd --system --gid app app

# openssl: the Prisma schema engine needs libssl (without it Prisma warns and
#   falls back to openssl-1.1.x, which fails to load on this image).
# gosu: lets the entrypoint chown the runtime-mounted volume as root, then drop
#   to the unprivileged `app` user for the actual processes.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl gosu \
    && rm -rf /var/lib/apt/lists/*

# Standalone server + static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma CLI (for `migrate deploy` at container start) + schema/config.
# Overlay the full CLI closure assembled above onto the standalone server's
# node_modules. This merges with (doesn't replace) the Next-traced modules
# already copied via .next/standalone; @prisma/client is untouched.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /opt/prisma-cli/node_modules ./node_modules

RUN chown -R app:app /app/node_modules
RUN mkdir -p /data && chown app:app /data
VOLUME /data

EXPOSE 3000

# Runs as root only to fix ownership of the mounted named volume (which mounts
# root-owned, masking the build-time chown above), then drops to `app` via gosu
# to run migrations and the server unprivileged.
CMD ["sh", "-c", "chown -R app:app /data && exec gosu app sh -c 'npx prisma migrate deploy && node server.js'"]
