# Architecture

```text
Telegram user
  -> grammy webhook (/api/bot/webhook)
  -> Redis conversation state
  -> Express API
  -> Gemini content generation
  -> PostgreSQL via Prisma
  -> BullMQ platform-publish queue
  -> Worker per platform
  -> platform post status updates
```

## Runtime Components

- `src/app.ts` owns Express middleware, health check, and route mounting.
- `src/config/env.ts` validates all runtime configuration before startup.
- `src/config/db.ts` exposes a singleton Prisma client.
- `src/config/redis.ts` exposes a singleton Redis connection for BullMQ and bot sessions.
- `src/modules/queue/queue.ts` defines the `platform-publish` queue with retry and backoff defaults.
- `src/modules/bot/bot.routes.ts` mounts Telegram webhook handling.

## Data Model

The schema has six tables: users, social accounts, AI keys, posts, platform posts, and refresh tokens. Platform publishing is intentionally split into `Post` and `PlatformPost` so each platform can fail, retry, or publish independently.

## Queue Design

Each selected platform gets its own BullMQ job. This avoids one failed platform blocking all others and lets the worker update `PlatformPost.status` independently.
