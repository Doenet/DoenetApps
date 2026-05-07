# syntax=docker/dockerfile:1

# Note: the build context should be the project root, not this package
# Run with:
# docker build -f apps/api/Dockerfile .

########################################
# Stage 1 — Build
########################################

FROM node:lts-trixie-slim AS builder
WORKDIR /DoenetTools

# Copy workspace manifests first so dependency install can cache well
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

# Copy prisma schema
COPY apps/api/prisma/schema.prisma ./apps/api/prisma/schema.prisma

# Install all dependencies
# This is more than we need, but it doesn't hurt.
# We really just need `api`, `shared`, and the root
RUN npm ci

# Copy source after install for better layer caching
COPY tsconfig.json ./
COPY configs/typescript configs/typescript
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

# Build
RUN npm run build --workspace=@doenet-tools/api

########################################
# Stage 2 — Production runtime
########################################
FROM node:lts-trixie-slim AS runtime
WORKDIR /DoenetTools
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
# Preserve the monorepo layout so npm workspace resolution still works
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

# Install only production deps for the api workspace
# --ignore-scripts skips postinstall (prisma:generate) since the Prisma client is copied from the builder
RUN npm ci --omit=dev --ignore-scripts --workspace=@doenet-tools/api

# Copy built application artifacts
COPY --from=builder /DoenetTools/apps/api/dist ./apps/api/dist
COPY --from=builder /DoenetTools/packages/shared/dist ./packages/shared/dist

# Copy Prisma runtime artifacts
COPY --from=builder /DoenetTools/apps/api/prisma ./apps/api/prisma
COPY --from=builder /DoenetTools/node_modules/.prisma/client ./node_modules/.prisma/client

# Copy entrypoint script
COPY apps/api/entrypoint.sh ./apps/api/entrypoint.sh
RUN chmod +x ./apps/api/entrypoint.sh

WORKDIR /DoenetTools/apps/api

# Run migrations then start server
ENTRYPOINT ["./entrypoint.sh"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

RUN useradd serveruser
RUN chown -R serveruser:serveruser /DoenetTools/node_modules/@prisma /DoenetTools/node_modules/.prisma
USER serveruser