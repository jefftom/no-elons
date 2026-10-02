# syntax=docker/dockerfile:1.7
# Production image: a standalone Next.js server that applies migrations on boot.
#   docker build -t noelons .
#   docker run -p 3000:3000 -e DATABASE_URL=... -v noelons-media:/data/media noelons

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    MEDIA_DIR=/data/media
RUN groupadd --system app && useradd --system --gid app app && mkdir -p /data/media && chown app:app /data/media

COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
# Migrations run with plain node; give the migrator its full dependencies.
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=deps /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=deps /app/node_modules/postgres ./node_modules/postgres

USER app
EXPOSE 3000
VOLUME ["/data/media"]
CMD ["sh", "-c", "node scripts/migrate.mjs && node server.js"]
