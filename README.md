# Postly

> **Live API:** `https://postly-outbox.onrender.com`
> **Telegram Bot:** Search for your bot on Telegram using the username from BotFather
> **Health Check:** [`https://postly-outbox.onrender.com/health`](https://postly-outbox.onrender.com/health)

---

Postly is a multi-platform AI content publishing backend. A user sends a raw idea to the Telegram bot, picks target platforms and tone, and the system generates platform-specific content using **Google Gemini** and publishes it automatically to **Twitter/X**, **LinkedIn**, **Instagram**, and **Threads** via a **BullMQ** queue — no frontend needed for the core publish flow.

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18 (`.nvmrc` pinned) |
| Framework | Express.js |
| Database | PostgreSQL via **Supabase** (production) |
| ORM | **Prisma** — schema-first, migrations tracked |
| Queue Broker | Redis via **Redis Cloud** |
| Queue | **BullMQ** (per-platform jobs, exponential backoff) |
| AI | **Google Gemini** (primary), **OpenAI GPT-4o**, **Anthropic Claude Sonnet** |
| Bot | **grammy** — webhook mode only in production |
| Auth | JWT — access token (15 min) + refresh token (7 days) with rotation |
| Testing | Jest + Supertest (7 suites) |
| Deployment | **Render** (single Web Service — API + Worker in-process) |
| Containerisation | Docker + docker-compose (local dev) |

> **AI Models:** All three providers have production-ready implementations. Gemini uses the platform API key (`GEMINI_API_KEY`). OpenAI and Anthropic use the user's own encrypted API keys stored in the `ai_keys` table. See [`AI_USAGE.md`](AI_USAGE.md) for full details.

---

## Telegram Bot

The Telegram bot is the primary publishing interface. All commands work from your phone.

### Commands

| Command | What it does |
|---|---|
| `/start <token>` | Link your Telegram account to Postly |
| `/post` | Begin a new post — walks through type, platforms, tone, model, idea |
| `/status` | Last 5 posts and their per-platform publish statuses |
| `/accounts` | List all connected social accounts |
| `/help` | Show command reference |

### Full Publish Flow

```
1. /post
2. Select post type   → [Announcement | Update | Engagement | Question]
3. Select platforms   → [Twitter/X | LinkedIn | Instagram | Threads]  (multi-select)
4. Select tone        → [Professional | Casual | Witty | Authoritative | Friendly]
5. Select AI model    → [Gemini 3.1 Flash | GPT-4o (OpenAI) | Claude Sonnet (Anthropic)]
6. Type your idea     → max 500 characters
7. Preview content    → per platform, with char counts and hashtags
8. Confirm / Cancel   → jobs enqueue, status returned per platform
```

---

## API Reference

All endpoints return the standard response envelope:

```json
{ "data": {}, "meta": null, "error": null }
```

### Auth
```
POST  /api/auth/register      — email, password, name
POST  /api/auth/login         — returns access_token + refresh_token
POST  /api/auth/refresh       — refresh token rotation
POST  /api/auth/logout        — invalidate refresh token
GET   /api/auth/me            — current user profile
```

### User
```
GET    /api/user/profile
PUT    /api/user/profile
POST   /api/user/social-accounts
GET    /api/user/social-accounts
DELETE /api/user/social-accounts/:id
PUT    /api/user/ai-keys
```

### Content
```
POST  /api/content/generate   — calls Gemini, returns per-platform content
```

### Posts
```
POST    /api/posts/publish       — queue immediately
POST    /api/posts/schedule      — queue with future publish_at timestamp
GET     /api/posts               — paginated list (?page=1&limit=10&status=published)
GET     /api/posts/:id           — single post + platform statuses
POST    /api/posts/:id/retry     — retry failed platform jobs
DELETE  /api/posts/:id           — cancel scheduled post
```

### Dashboard
```
GET   /api/dashboard/stats    — total posts, success rate, per-platform breakdown
```

### Misc
```
GET   /health                 — returns 200 with service status
POST  /api/bot/webhook        — Telegram webhook (validated with secret header)
```

---

## Local Setup

### Prerequisites
- Node.js 18 (`nvm use`)
- Docker + Docker Compose

### Steps

```bash
# 1. Clone
git clone https://github.com/Soham-1304/Postly.git
cd Postly

# 2. Use correct Node version
nvm use

# 3. Install dependencies
npm install

# 4. Set up environment
cp .env.example .env
# Fill in your values — see Environment Variables section below

# 5. Start PostgreSQL and Redis locally
docker-compose up -d postgres redis

# 6. Run DB migrations
npm run prisma:deploy

# 7. Start API server
npm run dev

# 8. Start queue worker (separate terminal)
npm run worker

# 9. Verify health
curl http://localhost:3000/health
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all values. No real values are stored in the example.

| Variable | Description |
|---|---|
| `PORT` | Express server port (default `3000`) |
| `NODE_ENV` | `development` or `production` |
| `DATABASE_URL` | PostgreSQL connection string (pooled) |
| `DIRECT_URL` | PostgreSQL direct URL (used by Prisma migrations) |
| `REDIS_URL` | Redis connection string (Redis Cloud in production) |
| `ACCESS_TOKEN_SECRET` | Long random string for JWT access token signing |
| `REFRESH_TOKEN_SECRET` | Long random string for JWT refresh token signing |
| `ENCRYPTION_KEY` | 32-byte hex string — used to AES-256-GCM encrypt stored tokens/keys |
| `GEMINI_API_KEY` | Google AI Studio API key (`gemini-3.1-flash-lite-preview`) |
| `TELEGRAM_BOT_TOKEN` | Token from BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | Random secret, validated on every webhook request |
| `APP_BASE_URL` | Public HTTPS URL of the deployed API (used for webhook setup) |
| `LINKEDIN_ACCESS_TOKEN` | LinkedIn access token (.env fallback for testing) |
| `LINKEDIN_PERSON_URN` | LinkedIn person URN (e.g. `urn:li:person:ABC123`) |

---

## Telegram Webhook Setup

After deploying to Render, register your webhook once:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://postly-api.onrender.com/api/bot/webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

Verify it is live:
```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

---

## Render Deployment

A single Web Service handles both the API and the BullMQ background worker in one process.

### Web Service (`postly-outbox`)
| Field | Value |
|---|---|
| Build Command | `npm install && npm run build && npx prisma migrate deploy` |
| Start Command | `node dist/src/server.js` |

The `server.ts` entry point boots Express, connects to Redis, and explicitly calls `publishWorker.waitUntilReady()` to confirm the BullMQ worker is alive before accepting traffic.

Add all environment variables listed in the `.env.example` to the Render dashboard.

---

## Running Tests

```bash
npm run test
```

Tests use Jest + Supertest against the live Supabase + Redis Cloud connections (no mocks for infrastructure). The `setupEnv.ts` file injects all required env vars before each suite runs.

Test suites:
- `auth.test.ts` — register + login flow
- `middleware.test.ts` — JWT validation (missing, invalid token)
- `content.test.ts` — input validation on `/api/content/generate`
- `posts.test.ts` — publish flow + paginated GET
- `dashboard.test.ts` — stats endpoint + response schema
- `bot.test.ts` — Telegram webhook routing
- `health.test.ts` — health check

---

## Git Strategy

Commits follow a phase-based structure mirroring the build order:

```
chore: init project structure and dependencies
feat: add prisma schema and initial migrations
feat: express app with health check and route scaffolds
feat: JWT auth with bcrypt, access + refresh token rotation
feat: user profile and social account management endpoints
feat: AES-256-GCM encryption for stored tokens and API keys
feat: Gemini content engine with per-platform prompt enforcement
feat: BullMQ publishing pipeline with per-platform job processors
feat: Twitter and LinkedIn live API integrations
feat: Telegram bot with Redis session state and publish flow
feat: complete Phase 7 Dashboard API and testing suite
```

---

## Required External Services

- **Supabase** — hosted PostgreSQL (free tier)
- **Redis Cloud** — standard Redis, BullMQ-compatible (not Upstash — Lua script limitations)
- **Google AI Studio** — Gemini API key (`gemini-3.1-flash-lite-preview`)
- **BotFather** — Telegram bot token and webhook secret
- **Twitter Developer Portal** — OAuth 1.0a credentials for posting
- **LinkedIn Developer** — access token and person URN for `ugcPosts` API
- **Render** — two free-tier services (Web + Background Worker)
