FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./

RUN npm ci

# Copy source and tsconfig
COPY tsconfig*.json ./
COPY src/ ./src

# Build TypeScript -> dist
RUN npm run build

# Prune dev deps to production-only in the builder (keeps one node_modules tree)
RUN npm prune --omit=dev

FROM node:20-alpine AS production
WORKDIR /app

# Copy the already-pruned node_modules and built files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Never bake secrets; set at runtime instead
ENV NODE_ENV=production
ENV PORT=4000

USER node

EXPOSE 4000

CMD ["node", "dist/server.js"]
