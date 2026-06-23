# Deploy AI Daily to Render

## Overview

This guide deploys AI Daily to Render using Docker containers with:
- PostgreSQL database
- Redis cache/queue
- Web application (Next.js)
- Worker process (BullMQ + Playwright)

## Prerequisites

1. **Render Account** — Sign up at https://render.com
2. **GitHub Repository** — Push code to GitHub
3. **API Keys** — MIMO API key (or OpenAI/Anthropic)

## Quick Deploy (Recommended)

### Step 1: Connect Repository

1. Go to https://dashboard.render.com/blueprints
2. Click **"New Blueprint Instance"**
3. Connect your GitHub repository
4. Select the repository: `KhangNguyen0105/AI-Daily`
5. Render will detect `render.yaml` automatically

### Step 2: Configure Environment Variables

After the blueprint creates services, set these variables in the Render dashboard:

**For `ai-daily-web` service:**
```
ADMIN_PASSWORD=your-secure-password-here
MIMO_API_KEY=your-mimo-api-key-here
```

**For `ai-daily-worker` service:**
```
MIMO_API_KEY=your-mimo-api-key-here
```

### Step 3: Deploy

1. Click **"Apply"** to create all services
2. Wait for builds to complete (~5-10 minutes)
3. Check service logs for any errors

### Step 4: Initialize Database

After deployment, run database migrations:

1. Go to **ai-daily-web** service
2. Open **Shell** tab
3. Run:
```bash
npx drizzle-kit push
```

### Step 5: Verify

1. Visit your web service URL: `https://ai-daily-web.onrender.com`
2. Check `/digest` page
3. Check `/admin` page (login with ADMIN_PASSWORD)
4. Check worker logs for pipeline activity

---

## Manual Deploy (Alternative)

If you prefer to create services manually:

### Step 1: Create Database

1. Go to https://dashboard.render.com/new/database
2. Select **PostgreSQL**
3. Name: `ai-daily-postgres`
4. Database: `aidaily`
5. User: `aidaily`
6. Plan: **starter_256mb** ($6.20/month) or **Free** (90 days)
7. Click **Create Database**

### Step 2: Create Redis

1. Go to https://dashboard.render.com/new/redis
2. Name: `ai-daily-redis`
3. Plan: **starter_256mb** ($6.20/month) or **Free** (90 days)
4. Click **Create Redis**

### Step 3: Create Web Service

1. Go to https://dashboard.render.com/new/web-service
2. Connect GitHub repository
3. Configure:
   - **Name:** `ai-daily-web`
   - **Runtime:** Node
   - **Build Command:**
     ```bash
     corepack enable pnpm
     pnpm install --frozen-lockfile
     pnpm build
     ```
   - **Start Command:**
     ```bash
     corepack enable pnpm
     node server.js
     ```
   - **Plan:** starter ($7/month) or Free
4. Add Environment Variables:
   - `DATABASE_URL` — from PostgreSQL service
   - `REDIS_HOST` — from Redis service
   - `REDIS_PORT` — from Redis service
   - `NODE_ENV=production`
   - `PORT=3000`
   - `ADMIN_PASSWORD` — your password
   - `NEXTAUTH_SECRET` — generate random string
   - `AI_PROVIDER=mimo`
   - `AI_FALLBACK_PROVIDER=mimo`
   - `MIMO_API_KEY` — your API key
   - `MIMO_BASE_URL=https://token-plan-sgp.xiaomimimo.com/v1`
   - `MIMO_MODEL=mimo-v2.5-pro`
5. Click **Create Web Service**

### Step 4: Create Worker Service

1. Go to https://dashboard.render.com/new/web-service
2. Connect same GitHub repository
3. Configure:
   - **Name:** `ai-daily-worker`
   - **Runtime:** Node
   - **Build Command:**
     ```bash
     corepack enable pnpm
     pnpm install --frozen-lockfile
     npx playwright install chromium
     ```
   - **Start Command:**
     ```bash
     corepack enable pnpm
     node --import tsx src/pipeline/worker-entry.ts
     ```
   - **Plan:** Standard ($20/month) — needs more RAM for Playwright
4. Add same Environment Variables as web service
5. Click **Create Worker Service**

---

## Pricing

### Free Tier (90 days)
- PostgreSQL: Free (256MB, 90 days)
- Redis: Free (256MB, limited)
- Web Service: Free (750 hours/month)
- Worker: **Not available on free tier**

### Paid Tier
- PostgreSQL starter_256mb: $6.20/month
- Redis starter_256mb: $10/month
- Web Service starter: $7/month
- Worker standard: $20/month

**Total: ~$43/month**

---

## Post-Deployment

### 1. Run Database Migrations

```bash
# In Render Shell for ai-daily-web
npx drizzle-kit push
```

### 2. Seed Initial Data (Optional)

If you want to pre-populate with sample data:

```bash
# In Render Shell
node scripts/seed-providers.js
```

### 3. Monitor Pipeline

1. Go to `/admin` page
2. Login with ADMIN_PASSWORD
3. Check Pipeline status
4. Trigger manual run if needed

### 4. Set Up Custom Domain (Optional)

1. Go to **Settings** → **Custom Domains**
2. Add your domain
3. Configure DNS records

---

## Troubleshooting

### Worker Not Starting

Check worker logs for:
- Playwright installation errors
- Database connection issues
- Redis connection issues

**Fix:** Ensure Chromium is installed in build command:
```bash
npx playwright install chromium
```

### Database Connection Failed

**Fix:** Check DATABASE_URL format:
```
postgresql://user:password@host:5432/database
```

### Redis Connection Failed

**Fix:** Check REDIS_HOST and REDIS_PORT values from Redis service.

### Pipeline Not Running

1. Check worker logs
2. Verify Redis connection
3. Check `/admin` pipeline page
4. Trigger manual run

### Build Failures

**Fix:** Ensure pnpm-lock.yaml is committed:
```bash
git add pnpm-lock.yaml
git commit -m "add lockfile"
git push
```

---

## Monitoring

### Health Checks

- Web: `https://your-app.onrender.com/`
- Admin: `https://your-app.onrender.com/admin`

### Logs

- Web: Render Dashboard → ai-daily-web → Logs
- Worker: Render Dashboard → ai-daily-worker → Logs

### Metrics

- CPU/Memory: Render Dashboard → Metrics tab
- Database: Render Dashboard → ai-daily-postgres → Metrics

---

## Updates

### Auto-Deploy

Render auto-deploys on push to `main` branch:
1. Push changes to GitHub
2. Render detects changes
3. Auto-builds and deploys

### Manual Deploy

1. Go to Render Dashboard
2. Click **Manual Deploy** → **Deploy latest commit**

---

## Rollback

If deployment fails:
1. Go to Render Dashboard
2. Click **Manual Deploy**
3. Select **Deploy previous commit**
4. Choose last working commit

---

## Support

- Render Docs: https://render.com/docs
- Community: https://community.render.com
- Status: https://status.render.com
