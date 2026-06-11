# Stage 1: Install dependencies
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable pnpm
COPY package.json pnpm-lock.yaml .npmrc* pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable pnpm
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Stage 3: Run
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
