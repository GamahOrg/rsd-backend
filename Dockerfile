FROM node:20-alpine AS builder
WORKDIR /app

# Use Corepack to pin pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Only copy what's needed for deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build
COPY tsconfig*.json ./
COPY src ./src
RUN pnpm build

# Prune dev deps
RUN pnpm prune --prod


FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copy as non-root without extra chown layer
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./
COPY --from=builder --chown=node:node /app/dist ./dist

USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]