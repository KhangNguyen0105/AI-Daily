# Technology Stack

**Project:** AI Daily — AI Model Pricing Intelligence Platform
**Researched:** 2026-06-10
**Overall confidence:** HIGH (versions verified via npm registry)

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Next.js** | 16.x (latest: 16.2.9) | Full-stack React framework (frontend + API routes) | App Router with Server Components for SSR/SSG of public pages; API Routes for admin backend; built-in image optimization; Turbopack for fast dev builds. Already mandated by PROJECT.md constraints. | HIGH |
| **React** | 19.x | UI library | Bundled with Next.js 16; Server Components reduce client JS; React Compiler for auto-memoization. | HIGH |
| **TypeScript** | 5.x | Type safety | Non-negotiable for a data-heavy platform with complex pricing models. Catches schema mismatches at compile time. | HIGH |
| **Tailwind CSS** | 4.x (latest: 4.3.0) | Utility-first CSS | Fast iteration for dashboard UI; pairs with Tremor components; zero-runtime CSS = fast page loads. | HIGH |

### Database & ORM

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **PostgreSQL** | 16+ | Primary relational database | Stores pricing data, articles, provider metadata, historical trends. JSONB columns for raw evidence storage. Excellent for time-series queries on pricing history. Already mandated by PROJECT.md. | HIGH |
| **Drizzle ORM** | 0.45.x (latest: 0.45.2) | TypeScript ORM | SQL-like query syntax stays close to actual SQL (important for complex pricing queries). Lighter than Prisma (no Rust binary). Excellent TypeScript inference. Drizzle Kit for migrations. Chosen over Prisma because: (1) smaller bundle for Docker, (2) closer to SQL for complex queries on pricing data, (3) faster read performance for dashboard queries. | HIGH |
| **Drizzle Kit** | (bundled with drizzle-orm) | Migration tool | `drizzle-kit generate` and `drizzle-kit push` for schema migrations. | HIGH |

**Why Drizzle over Prisma:**
- Prisma requires a separate Rust query engine binary, inflating Docker images
- Drizzle's SQL-like syntax is better for the complex aggregation queries needed for pricing trends
- Drizzle has faster cold-start times (matters for scheduled jobs)
- Both have excellent TypeScript support, but Drizzle's type inference is derived directly from schema definitions

### Job Scheduling & Queue

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **BullMQ** | 5.x (latest: 5.78.0) | Distributed job queue | Handles daily collection jobs with retries, rate limiting, priority queuing, and concurrency control. Built-in support for delayed jobs and job dependencies (collect -> extract -> generate -> publish pipeline). Bull Board for monitoring. | HIGH |
| **ioredis** | 5.x (latest: 5.11.1) | Redis client | Required by BullMQ; also used for caching dashboard data and rate-limit tracking. | HIGH |
| **Redis** | 7+ | Queue backend + cache | BullMQ requires Redis. Also caches rendered dashboard pages and provider data. Use Redis AOF for job persistence in production. | HIGH |

**Why BullMQ over node-cron:**
- node-cron is a simple cron scheduler with no persistence, no retries, no monitoring
- The collect -> extract -> generate -> publish pipeline has multiple dependent stages that need job chaining
- BullMQ provides built-in retry with exponential backoff (critical when scraping 30+ providers that may fail)
- Bull Board provides a web UI for monitoring job status without building custom tooling

### Web Scraping & Crawling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Crawlee** | 3.x (latest: 3.17.0) | Scraping framework | Production-grade crawling built by Apify. Provides `PlaywrightCrawler` and `HttpCrawler` with built-in proxy rotation, session management, request queue, automatic retries, and fingerprint protection. Handles the messy parts of scraping at scale. | HIGH |
| **Playwright** | 1.x (latest: 1.60.0) | Browser automation | Used under the hood by Crawlee for JavaScript-heavy pricing pages. Multi-browser support (Chromium, Firefox, WebKit). Better auto-waiting than Puppeteer. | HIGH |
| **Cheerio** | 1.x (latest: 1.2.0) | HTML parsing | Lightweight jQuery-like HTML parsing for static pages that don't need a browser. Used by Crawlee's `HttpCrawler` for fast extraction from server-rendered pages. | HIGH |

**Why Crawlee over raw Playwright:**
- Raw Playwright requires manual setup of: request queues, proxy rotation, session management, retry logic, concurrency control, fingerprint evasion
- Crawlee provides all of this out of the box with `PlaywrightCrawler`
- Built-in dataset storage for saving scraped results
- Automatic scaling based on available system resources

### AI / LLM Integration

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Vercel AI SDK** | 6.x (latest: 6.0.199) | Unified LLM interface | `generateObject()` for structured extraction of pricing data with Zod schema validation. `generateText()` for article generation. Provider-agnostic: swap between Claude, OpenAI, Gemini via config. Streaming support for admin preview. | HIGH |
| **@ai-sdk/openai** | (companion) | OpenAI provider | For GPT-4o / GPT-4.1 extraction and generation. | HIGH |
| **@ai-sdk/anthropic** | (companion) | Anthropic provider | For Claude extraction and generation. | HIGH |
| **Zod** | 4.x (latest: 4.4.3) | Schema validation | Used by Vercel AI SDK's `generateObject()` for type-safe structured output. Also validates API inputs and environment variables. | HIGH |

**Why Vercel AI SDK over raw API calls:**
- Unified interface across OpenAI, Anthropic, Google, etc. — matches the "multi-provider AI generation" key decision
- `generateObject()` with Zod schemas ensures extracted pricing data matches expected structure
- Built-in retry logic and error handling for LLM calls
- Streaming support for admin dashboard preview of generated articles

### Data Visualization & UI Components

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Recharts** | 3.x (latest: 3.8.1) | Charts (line, bar, area) | Most popular React charting library. Built on D3 with React-native API. Perfect for pricing trend lines, comparison bar charts, and historical data visualization. Large community, well-documented. | HIGH |
| **Tremor** | 3.x (latest: 3.18.7) | Dashboard UI components | Pre-built dashboard components: stat cards, bar lists, callouts, badges, tables. Tailwind-based. Accelerates building the admin dashboard and public comparison views. | HIGH |
| **@tanstack/react-table** | 8.x (latest: 8.21.3) | Headless table component | For the complex comparison tables (30+ providers, multiple pricing dimensions). Headless = full control over styling with Tailwind. Sorting, filtering, pagination built in. | HIGH |

**Why Recharts over alternatives:**
- Recharts: Best balance of simplicity and capability for pricing trend charts
- Tremor: Purpose-built for dashboard UI, complements Recharts for non-chart components
- Nivo: More chart types but heavier; overkill for this use case
- ECharts: More powerful but larger bundle and less React-native API

### Admin Authentication

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **NextAuth.js (Auth.js)** | 5.x (latest: v5 beta / stable) | Admin-only auth | Simple credential-based auth for single admin. No user registration needed (read-only public site). Integrates directly with Next.js App Router via middleware. Session management built in. | MEDIUM |

**Why NextAuth over alternatives:**
- The project has a single admin user — no need for complex auth providers
- NextAuth's credential provider with a hardcoded admin password (or env var) is sufficient for v1
- Alternatives like Clerk, Lucia, or custom JWT are overkill for "admin-only content management"
- Can add OAuth providers later if needed

**Note:** For v1, even simpler approaches work: a single shared secret checked in middleware, or basic HTTP auth. NextAuth is recommended for future extensibility but is not strictly required.

### Form & Content Management

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **react-hook-form** | 7.x | Form handling | Admin forms for editing pricing data, articles, provider config. Performant with minimal re-renders. | HIGH |
| **@hookform/resolvers** | (companion) | Zod integration | Bridges react-hook-form with Zod schemas for validation. | HIGH |
| **date-fns** | 4.x (latest: 4.4.0) | Date utilities | Formatting pricing dates, chart axis labels, article timestamps. Tree-shakeable, immutable. | HIGH |

### Development & Build Tools

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **pnpm** | 9.x | Package manager | Faster than npm, stricter dependency resolution, disk-efficient with content-addressable storage. Monorepo-ready if needed later. | HIGH |
| **ESLint** | 9.x | Linting | Next.js default. Flat config format in v9. | HIGH |
| **Prettier** | 3.x | Code formatting | Consistent code style across the project. | HIGH |
| **Vitest** | 2.x | Unit testing | Faster than Jest, native TypeScript/ESM support, Vite-powered. | HIGH |
| **Playwright Test** | 1.x | E2E testing | Same tool used for scraping = single dependency for browser automation and testing. | HIGH |

### Infrastructure & Deployment

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Docker** | latest | Containerization | Mandated by PROJECT.md. Multi-stage builds for Next.js (build stage + runtime stage). | HIGH |
| **Docker Compose** | v2 | Multi-container orchestration | Orchestrates Next.js app + PostgreSQL + Redis + scheduled worker in development and production. | HIGH |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| ORM | Drizzle ORM | Prisma | Prisma's Rust query engine adds binary overhead to Docker images and slower cold starts. Drizzle's SQL-like syntax is better for complex pricing aggregation queries. |
| Job Queue | BullMQ | node-cron | node-cron has no persistence, no retries, no monitoring. BullMQ handles the multi-stage pipeline (collect -> extract -> generate -> publish) with proper job chaining. |
| Job Queue | BullMQ | Temporal.io | Temporal is overkill for a daily batch pipeline. BullMQ + Redis is simpler to deploy and sufficient. |
| Scraping | Crawlee | Raw Playwright | Raw Playwright requires manual proxy rotation, session management, retry logic, and fingerprint evasion. Crawlee provides all out of the box. |
| Scraping | Crawlee | Puppeteer | Puppeteer is Chrome-only and less actively developed than Playwright. Crawlee uses Playwright under the hood. |
| Charts | Recharts | Nivo | Nivo has more chart types but larger bundle. Recharts covers all needed chart types (line, bar, area) with a simpler API. |
| Charts | Recharts | ECharts | ECharts is more powerful but has a larger bundle size and less React-native API. Overkill for pricing trend visualization. |
| Dashboard UI | Tremor | Shadcn/ui | Shadcn/ui is more general-purpose. Tremor has purpose-built dashboard components (stat cards, bar lists) that match this use case. Can use both together. |
| LLM Integration | Vercel AI SDK | Raw API calls | Raw calls require manual retry logic, schema validation, and provider abstraction. Vercel AI SDK handles all three with `generateObject()`. |
| Auth | NextAuth.js | Clerk | Clerk is a full auth platform with user management — overkill for a single admin. NextAuth's credential provider is simpler. |
| Auth | NextAuth.js | Custom JWT | Custom JWT requires manual session management, CSRF protection, and token refresh. NextAuth handles all of this. |
| Package Manager | pnpm | npm | npm is slower and has less strict dependency resolution. pnpm's content-addressable storage saves disk space in Docker. |
| Testing | Vitest | Jest | Jest is slower and has poorer ESM/TypeScript support. Vitest is Vite-native and significantly faster. |

## Installation

```bash
# Create project with pnpm
pnpm create next-app@latest ai-daily --typescript --tailwind --eslint --app --src-dir

# Core dependencies
pnpm add drizzle-orm ioredis bullmq crawlee playwright cheerio \
  ai @ai-sdk/openai @ai-sdk/anthropic zod \
  recharts @tremor/react @tanstack/react-table \
  react-hook-form @hookform/resolvers date-fns \
  next-auth

# Database driver (PostgreSQL)
pnpm add pg
pnpm add -D @types/pg

# Dev dependencies
pnpm add -D drizzle-kit vitest @playwright/test \
  eslint prettier

# Initialize Drizzle
pnpm drizzle-kit init
```

## Docker Compose Structure

```yaml
# docker-compose.yml (development)
services:
  app:
    build: .
    ports: ["3000:3000"]
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
    environment:
      DATABASE_URL: postgresql://user:pass@postgres:5432/aidaily
      REDIS_URL: redis://redis:6379

  worker:
    build: .
    command: pnpm worker  # BullMQ job processor
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }

  postgres:
    image: postgres:16-alpine
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: pg_isready -U user -d aidaily
      interval: 5s

  redis:
    image: redis:7-alpine
    volumes: [redisdata:/data]
    healthcheck:
      test: redis-cli ping
      interval: 5s

volumes:
  pgdata:
  redisdata:
```

## Version Summary (Verified)

| Package | Version | Verified |
|---------|---------|----------|
| next | 16.2.9 | npm registry |
| crawlee | 3.17.0 | npm registry |
| drizzle-orm | 0.45.2 | npm registry |
| bullmq | 5.78.0 | npm registry |
| ioredis | 5.11.1 | npm registry |
| ai (Vercel AI SDK) | 6.0.199 | npm registry |
| recharts | 3.8.1 | npm registry |
| @tremor/react | 3.18.7 | npm registry |
| @tanstack/react-table | 8.21.3 | npm registry |
| playwright | 1.60.0 | npm registry |
| cheerio | 1.2.0 | npm registry |
| tailwindcss | 4.3.0 | npm registry |
| next-auth | 4.24.14 | npm registry |
| zod | 4.4.3 | npm registry |
| date-fns | 4.4.0 | npm registry |

## Sources

- npm registry (version verification via `npm view`)
- Crawlee documentation: https://crawlee.dev
- Drizzle ORM documentation: https://orm.drizzle.team
- BullMQ documentation: https://docs.bullmq.io
- Vercel AI SDK documentation: https://sdk.vercel.ai
- Next.js 15/16 documentation: https://nextjs.org/docs
- Tremor documentation: https://www.tremor.so
- Recharts documentation: https://recharts.org
