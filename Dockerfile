# syntax=docker/dockerfile:1.7

# ---------------------------------------------------------------------------
# Business Services Platform — multi-stage image
#
# Targets:
#   deps     installed node_modules from a committed lockfile
#   dev      hot-reloading development server (used by docker-compose)
#   builder  production `next build`
#   runner   minimal production runtime (Next.js standalone output)
#   test     unit/integration/e2e runner with Playwright browsers
#   tooling  Node + tsx for migrations, seeds and operational scripts
# ---------------------------------------------------------------------------

ARG NODE_VERSION=22.23.3

# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1 \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_REGISTRY=https://registry.npmjs.org/
WORKDIR /app

# Networks that terminate TLS (corporate proxies) need their root CA trusted
# inside the image. Drop any PEM into docker/certs/ and it is picked up here;
# the directory is empty on networks that do not intercept TLS.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY docker/certs/ /usr/local/share/ca-certificates/
RUN update-ca-certificates
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --include=dev

# ---------------------------------------------------------------------------
FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---------------------------------------------------------------------------
FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time env only; real secrets are supplied at runtime.
ENV NEXT_PUBLIC_SITE_URL=http://localhost:3000
RUN npm run build

# ---------------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Nothing is written to disk at runtime: uploaded presentations go to the
# database, so the container needs no volume and no writable path.
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=20s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]

# ---------------------------------------------------------------------------
# tooling: migrations, seeding and admin provisioning.
FROM base AS tooling
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY scripts ./scripts
COPY db ./db
COPY src ./src
CMD ["npx", "tsx", "scripts/migrate.ts"]

# ---------------------------------------------------------------------------
# test: everything needed for vitest and Playwright, including browsers.
FROM base AS test
ENV NODE_ENV=test \
    CI=true \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
RUN npx --yes playwright install --with-deps chromium \
 && rm -rf /var/lib/apt/lists/*
COPY . .
CMD ["npm", "run", "test:all"]
