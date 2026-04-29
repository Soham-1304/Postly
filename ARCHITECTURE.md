# Architecture

```text
Telegram user
  -> grammy webhook (/api/bot/webhook)
  -> Redis conversation state (30-min TTL per session)
  -> Express API
  -> Gemini content generation
  -> PostgreSQL via Prisma
  -> BullMQ platform-publish queue
  -> Worker per platform (Twitter, LinkedIn, Instagram, Threads)
  -> platform post status updates
```

## Bot Webhook Flow

1. Telegram user sends message or taps button
2. Telegram posts update to `/api/bot/webhook` with `X-Telegram-Bot-Api-Secret-Token` header
3. Express validates secret token matches `TELEGRAM_WEBHOOK_SECRET`
4. grammy router dispatches to command handler or callback handler
5. Bot middleware loads session from Redis (`bot:session:{chatId}`)
6. Session middleware looks up Postly user via `User.telegramChatId`
7. Command/callback handler executes, updates session in Redis
8. Session persists with 30-minute inactivity TTL
9. Response sent back to Telegram (reply, inline keyboards, message edits)

## Runtime Components

- `src/app.ts` owns Express middleware, health check, and route mounting.
- `src/config/env.ts` validates all runtime configuration before startup.
- `src/config/db.ts` exposes a singleton Prisma client.
- `src/config/redis.ts` exposes a singleton Redis connection for BullMQ and bot sessions.
- `src/modules/bot/bot.ts` creates the grammy bot with Redis session persistence and user lookup.
- `src/modules/bot/bot.routes.ts` mounts Telegram webhook handling with secret validation.
- `src/modules/bot/commands/` contains command handlers: `/start`, `/post`, `/status`, `/accounts`, `/help`.
- `src/modules/bot/conversations/` contains multi-step conversation handlers for platform/tone/idea/confirm flow.
- `src/modules/queue/queue.ts` defines the `platform-publish` queue with retry and backoff defaults.
- `src/modules/queue/jobs/` contains job processors for each platform (Twitter, LinkedIn, Instagram, Threads).
- `src/modules/dashboard/` provides aggregate statistics across a user's generated posts and queued platforms.

## Session Management

Bot sessions are stored in Redis with a 30-minute inactivity timeout. The session key is `bot:session:{chatId}` to isolate conversations per user.

**ConversationSession structure:**

- `step` — current state in conversation flow (null, awaiting_post_type, awaiting_platforms, etc.)
- `selectedPlatforms` — array of chosen platforms (Twitter, LinkedIn, Instagram, Threads)
- `timestamp` — last activity time for timeout detection
- `postType` — selected post type (Announcement, Update, Engagement, Question)
- `tone` — selected tone (Professional, Casual, Witty, Authoritative, Friendly)
- `model` — selected AI model (Gemini, OpenAI, Anthropic)
- `idea` — user's post idea text (max 500 chars)
- `generatedContent` — platform-specific content after Gemini generates

If session expires (30 min inactivity), user must re-run `/post` to continue.

## Data Model

The schema has six tables: users, social accounts, AI keys, posts, platform posts, and refresh tokens. Platform publishing is intentionally split into `Post` and `PlatformPost` so each platform can fail, retry, or publish independently.

Telegram account linking uses `User.telegramChatId` — when user runs `/start <token>`, the token is verified via JWT and the user's record is updated with their Telegram chat ID.

## Queue Design

Each selected platform gets its own BullMQ job. This avoids one failed platform blocking all others and lets the worker update `PlatformPost.status` independently.

**Job retry strategy:** 3 attempts with exponential backoff (1s → 5s → 25s). Failed jobs log the error and update `PlatformPost.status` to 'failed'.

**PublishJobData interface:**

- `postId` — reference to Post record
- `platformPostId` — reference to PlatformPost record
- `platform` — target platform (twitter, linkedin, instagram, threads)
- `content` — platform-specific content from Gemini
- `userId` — Postly user ID for credential lookup
- `attempts` — current retry attempt count
