# Postly

Postly is a backend-only social content workflow: a Telegram bot collects a post idea, the API generates platform-specific content with Gemini, and BullMQ queues publishing jobs for Twitter/X, LinkedIn, Instagram, and Threads.

## Stack

- Node.js 18, TypeScript, Express
- PostgreSQL with Prisma
- Redis with BullMQ
- grammy for Telegram webhook handling
- Google Gemini API (`gemini-1.5-flash`) as the free AI provider
- Jest and Supertest for API tests
- Docker Compose for local app, Postgres, and Redis

## Telegram Bot Usage

Postly includes a Telegram bot for composing and publishing posts directly from chat.

### Commands

- `/start [token]` — Link your Telegram account. Get a token from the dashboard; use `/start <token>` to authenticate.
- `/post` — Start a new post. Follow the conversation to select platforms, tone, and your idea.
- `/status` — View the last 5 posts and their publishing status per platform.
- `/accounts` — List connected social accounts (Twitter, LinkedIn, Instagram, Threads).
- `/help` — Show command reference.

### Workflow Example

1. Run `/post`
2. Choose post type (Announcement, Update, Engagement, Question)
3. Select platforms (multi-select with inline buttons)
4. Choose tone (Professional, Casual, Witty, Authoritative, Friendly)
5. Choose AI model (Gemini, OpenAI*, Anthropic*) *routes to Gemini
6. Send your post idea (max 500 characters)
7. Preview platform-specific content with hashtags
8. Confirm to publish

Jobs queue automatically to each platform. Monitor status with `/status`.

### Webhook Setup

In production, configure `TELEGRAM_WEBHOOK_URL` to point to `https://your-domain.com/api/bot/webhook`. The bot validates requests with `TELEGRAM_WEBHOOK_SECRET` (configure in BotFather).

## Local Setup

1. Use Node 18:

   ```bash
   nvm use
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create local env:

   ```bash
   cp .env.example .env
   ```

4. Start local dependencies:

   ```bash
   docker compose up -d postgres redis
   ```

5. Run migrations and start the API:

   ```bash
   npm run prisma:deploy
   npm run dev
   ```

6. Check health:

   ```bash
   curl http://localhost:3000/health
   ```

## Required External Accounts

- Supabase PostgreSQL database for production `DATABASE_URL`
- Redis Cloud instance for production `REDIS_URL` (BullMQ requires standard Redis, not Upstash due to Lua script compatibility)
- Google AI Studio key for `GEMINI_API_KEY`
- Telegram BotFather token for `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET`
- Twitter API v2 credentials for platform publishing
- LinkedIn API credentials for platform publishing
- Instagram and Threads API credentials for platform publishing
- Render web service for deployment

Detailed setup steps for GitHub, Supabase, Redis Cloud, env vars, and local verification are in [Phase 1 Setup](docs/PHASE_1_SETUP.md).

## Git Strategy

Keep commits small and phase-based. Recommended first commits:

- `chore: init project structure and dependencies`
- `chore: add docker-compose, Dockerfile, and env validation`
- `feat: add prisma schema and initial migration`
- `feat: express app bootstrap with health check and route scaffolds`
