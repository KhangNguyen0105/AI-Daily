# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Stage 2: Build and install browsers
FROM node:20-alpine AS runner
WORKDIR /app

# Install dependencies for Playwright
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./

# Copy source code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV CRAWLEE_STORAGE_DIR=/tmp/crawlee-storage

# Run the worker process
CMD ["node", "--import", "tsx", "src/pipeline/worker-entry.ts"]
