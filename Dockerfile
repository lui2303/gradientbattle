FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_TELEMETRY_DISABLED=1
# Shared location so the pnpm that root bakes in is still visible to `USER node`.
ENV COREPACK_HOME=/opt/corepack
# `corepack enable` alone leaves pnpm to be downloaded on first use — baking the
# pinned version in keeps container start independent of the npm registry.
RUN corepack enable \
    && corepack prepare pnpm@10.0.0 --activate \
    && apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app


FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/core/package.json ./packages/core/
# apps/web has a `postinstall: prisma generate`, so the schema and its config
# must already be present when pnpm install runs.
COPY apps/web/prisma ./apps/web/prisma
COPY apps/web/prisma.config.ts ./apps/web/
RUN pnpm install --frozen-lockfile


FROM deps AS build
COPY . .
# Inlined into the client bundle by `next build` — supplying it only at runtime
# leaves the compiled default (ws://localhost:3001) in the shipped JS.
ARG NEXT_PUBLIC_BATTLE_WS_URL
ENV NEXT_PUBLIC_BATTLE_WS_URL=$NEXT_PUBLIC_BATTLE_WS_URL
# Compose interpolates this build arg from the shell or ./.env — never from
# env_file — so a forgotten `--env-file .env.production` resolves it to "" and
# ships a bundle with an empty WebSocket URL. Fail loudly instead.
RUN test -n "$NEXT_PUBLIC_BATTLE_WS_URL" \
    || { echo "ERROR: NEXT_PUBLIC_BATTLE_WS_URL is empty - build with --env-file .env.production" >&2; exit 1; }
RUN pnpm --filter web build && rm -rf apps/web/.next/cache


FROM base AS runner
ENV NODE_ENV=production
# Not pruned to production deps on purpose: the battle server runs through `tsx`
# and the migrate step through the `prisma` CLI, both devDependencies.
COPY --from=build --chown=node:node /app /app
USER node
CMD ["pnpm", "--filter", "web", "start"]
