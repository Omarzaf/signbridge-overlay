# ==========================================
# Stage 1: Builder
# Pinned base image version to prevent unverified floating updates (A1.8)
# ==========================================
FROM node:22.14.0-slim AS builder

WORKDIR /app

# pnpm aborts a non-interactive node_modules purge without this. The production
# prune at the end of this stage changes the installed set and must be able to
# remove the dev tree without a TTY to confirm against.
ENV CI=true

# Enable pnpm via Corepack
RUN corepack enable && corepack prepare pnpm@11.10.0 --activate

# Copy package descriptors for dependency caching. pnpm-workspace.yaml is
# required: without it pnpm does not recognise services/authoring as a
# workspace member and every --filter below matches nothing.
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY services/authoring/package.json ./services/authoring/

# A hoisted node_modules is a real directory tree. pnpm's default symlinked
# layout points into /app/node_modules/.pnpm and would arrive broken in the
# runner stage, which copies node_modules out of this one. pnpm 11 takes this
# setting from pnpm-workspace.yaml rather than `pnpm config set`; appending it
# here keeps the change inside the image instead of altering local development.
RUN printf '\nnodeLinker: hoisted\n' >> pnpm-workspace.yaml

# Install the full workspace: the build below needs the root-level TypeScript
# toolchain, which a --filter install of the service alone would omit.
RUN pnpm install --frozen-lockfile

# Copy source code and build TypeScript assets
COPY tsconfig.json ./
COPY services/authoring ./services/authoring
RUN pnpm --filter ./services/authoring build

# Re-resolve to production dependencies only, so the runner carries
# @google/genai at its locked version without the build toolchain.
RUN pnpm install --frozen-lockfile --filter ./services/authoring... --prod

# ==========================================
# Stage 2: Production Runner
# Pinned base image version (A1.8)
# ==========================================
FROM node:22.14.0-slim AS runner

# OCI Container Provenance and SBOM Metadata (A1.8)
LABEL org.opencontainers.image.title="signbridge-authoring-service"
LABEL org.opencontainers.image.description="SignBridge AI Authoring Service (Hardened Trust Boundary)"
LABEL org.opencontainers.image.version="0.1.0"
LABEL org.opencontainers.image.vendor="SignBridge Project"
LABEL org.opencontainers.image.licenses="Apache-2.0"
LABEL org.opencontainers.image.source="https://github.com/signbridge/signbridge-overlay"
LABEL org.opencontainers.image.documentation="https://github.com/signbridge/signbridge-overlay/tree/main/services/authoring"

WORKDIR /app

# Define default environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Security: Run as non-root user
USER node

# Copy compiled JavaScript output and the hoisted production dependency tree.
# node_modules sits beside dist at /app so Node's upward resolution finds it.
COPY --from=builder --chown=node:node /app/services/authoring/dist ./dist
COPY --from=builder --chown=node:node /app/services/authoring/package.json ./package.json
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

EXPOSE 8080

CMD ["node", "dist/server.js"]
