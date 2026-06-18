FROM node:22-alpine

# Install system dependencies for Playwright/Chromium
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    python3 \
    make \
    g++

# Pin pnpm version to match local
RUN corepack enable && corepack use pnpm@11.5.2

WORKDIR /app

# Copy .npmrc and package files
COPY .npmrc package.json pnpm-lock.yaml ./

# Approve build scripts and install
RUN pnpm approve-builds --all && pnpm install

# Install Playwright chromium browser
ENV PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright
RUN npx playwright install chromium

# Source code will be mounted as volume
CMD ["node", "--import", "tsx", "src/pipeline/worker-entry.ts"]
