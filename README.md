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
- Upstash Redis for production `REDIS_URL`
- Google AI Studio key for `GEMINI_API_KEY`
- Telegram BotFather token for `TELEGRAM_BOT_TOKEN`
- Render web service for deployment

## Git Strategy

Keep commits small and phase-based. Recommended first commits:

- `chore: init project structure and dependencies`
- `chore: add docker-compose, Dockerfile, and env validation`
- `feat: add prisma schema and initial migration`
- `feat: express app bootstrap with health check and route scaffolds`
