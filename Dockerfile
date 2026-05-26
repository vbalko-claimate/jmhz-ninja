# syntax=docker/dockerfile:1.7
# JMHZ Ninja — Next.js standalone build for Coolify / Azure VM

ARG NODE_VERSION=24-bookworm-slim

###############################################
# 1) deps stage — install with pnpm and build native modules
###############################################
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

###############################################
# 2) build stage
###############################################
FROM node:${NODE_VERSION} AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build needs some envs to type-check the Auth.js config. Production envs are
# injected by Coolify at runtime.
ENV AUTH_SECRET="build-time-only"
ENV ADMIN_EMAILS="build@example.com"

RUN pnpm build

###############################################
# 3) runtime stage — small, non-root
###############################################
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DB_PATH=/app/data/svj.db

# Standalone output ships only what's needed
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/lib ./lib
COPY --from=build /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=build /app/node_modules/bindings ./node_modules/bindings
COPY --from=build /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path
COPY --from=build /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY scripts ./scripts
COPY docker/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh \
 && mkdir -p /app/data /app/tmp \
 && chown -R node:node /app

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server.js"]
