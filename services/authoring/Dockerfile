# ==========================================
# Stage 1: Builder
# ==========================================
FROM node:20-slim AS builder

WORKDIR /app

# Enable pnpm via Corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package descriptors for dependency caching
COPY package.json pnpm-lock.yaml* ./
COPY services/authoring/package.json ./services/authoring/

# Install dependencies for the authoring service
RUN pnpm install --frozen-lockfile --filter ./services/authoring...

# Copy source code and build TypeScript assets
COPY tsconfig.json ./
COPY services/authoring ./services/authoring
RUN pnpm --filter ./services/authoring build

# ==========================================
# Stage 2: Production Runner
# ==========================================
FROM node:20-slim AS runner

WORKDIR /app/authoring

# Define default environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Security: Run as non-root user
USER node

# Copy compiled JavaScript output and production dependencies
COPY --from=builder --chown=node:node /app/services/authoring/dist ./dist
COPY --from=builder --chown=node:node /app/services/authoring/package.json ./package.json
COPY --from=builder --chown=node:node /app/services/authoring/node_modules ./node_modules

EXPOSE 8080

CMD ["node", "dist/server.js"]
