# Architecture

## System Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         POSTLY SYSTEM                           │
└─────────────────────────────────────────────────────────────────┘

User (Telegram Phone)
        │
        │  /post, /start, /status, /accounts, /help
        ▼
┌──────────────┐   HTTPS webhook    ┌───────────────────────────┐
│   Telegram   │ ────────────────►  │   Express API Server      │
│    App       │                    │   Node.js 18 / Render      │
└──────────────┘                    └──────────┬────────────────┘
                                               │
                           ┌───────────────────┼────────────────────┐
                           │                   │                    │
                           ▼                   ▼                    ▼
                   ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐
                   │  Google      │   │  PostgreSQL   │   │     Redis        │
                   │  Gemini API  │   │  (Supabase)   │   │  (Redis Cloud)   │
                   │  gemini-3.1- │   │               │   │                  │
                   │  flash-lite  │   │  users        │   │  Bot sessions    │
                   └──────────────┘   │  posts        │   │  (30 min TTL)    │
                                      │  platform_    │   └────────┬─────────┘
                                      │  posts        │            │
                                      │  social_      │       BullMQ Queue
                                      │  accounts     │       platform-publish
                                      │  ai_keys      │            │
                                      │  refresh_     │    ┌───────┴──────────────┐
                                      │  tokens       │    │                      │
                                      └──────────────┘    ▼                      ▼
                                                     Twitter Job           LinkedIn Job
                                                     (twitter-api-v2)     (ugcPosts API)
                                                           │
                                                     Instagram Job        Threads Job
                                                     (stub — ready)       (stub — ready)
```

---

## How a Post Flows End-to-End

```
1. User sends /post to Telegram bot
2. grammy receives webhook POST /api/bot/webhook
      → validates X-Telegram-Bot-Api-Secret-Token header
      → loads session from Redis (key: bot:session:{chatId})
3. Multi-step conversation (via Redis state):
      → post type → platforms → tone → model → idea
4. Bot calls POST /api/content/generate
      → ContentService builds a system prompt with platform constraints
      → Calls Gemini gemini-3.1-flash-lite-preview
      → Parses JSON response, validates char limits + hashtag counts
      → Returns platform-specific content with char_count and hashtags
5. Bot displays preview per platform to user
6. User confirms → Bot calls POST /api/posts/publish
      → PostsService creates one Post record in PostgreSQL
      → Creates one PlatformPost record per selected platform
      → Enqueues one BullMQ job per platform into platform-publish queue
7. BullMQ Worker processes jobs (concurrency: 5):
      → Updates PlatformPost.status = 'processing'
      → Fetches encrypted credentials from SocialAccount table
      → Decrypts using AES-256-GCM (ENCRYPTION_KEY)
      → Calls platform API (Twitter v2 / LinkedIn ugcPosts)
      → On success: sets status = 'published', stores publishedAt
      → On failure: sets status = 'failed', stores errorMessage
      → Re-throws error to trigger BullMQ exponential backoff
8. Retry policy: 3 attempts — backoff 1s → 5s → 25s
9. Bot sends final per-platform success/failure summary to user
```

---

## Runtime Components

- **`src/app.ts`** — Express middleware stack, route mounting, global error handler.
- **`src/config/env.ts`** — Zod-validated environment variables. App will not start if any required variable is missing.
- **`src/config/db.ts`** — Singleton Prisma client.
- **`src/config/redis.ts`** — `createRedisConnection()` factory for isolated ioredis instances. BullMQ Queue and Worker each get their own connection to prevent blocking-read deadlocks.
- **`src/middleware/auth.ts`** — JWT validation middleware. Verifies access token and attaches `req.user`. Returns `401` on all failures.
- **`src/modules/auth/`** — Register, login, refresh, logout, getMe. Passwords bcrypt cost 12. Refresh tokens stored in DB and rotated on every use.
- **`src/modules/user/`** — Profile management, social account CRUD, AI key storage.
- **`src/modules/content/`** — Gemini API integration. Platform-specific system prompt builder. Validates per-platform char limits and hashtag counts post-generation.
- **`src/modules/posts/`** — Publish and schedule endpoints. Creates Post + PlatformPost records, enqueues BullMQ jobs.
- **`src/modules/queue/`** — BullMQ queue definition + worker. Concurrency 5. One processor per platform (twitter.job.ts, linkedin.job.ts, instagram.job.ts, threads.job.ts).
- **`src/modules/bot/`** — grammy bot with Redis session persistence, command handlers, and multi-step publish conversation.
- **`src/modules/dashboard/`** — Aggregate statistics endpoint. Prisma `groupBy` for per-platform breakdowns.
- **`src/utils/crypto.ts`** — AES-256-GCM encrypt/decrypt. Format: `iv:authTag:ciphertext` (hex-colon-separated).
- **`src/utils/jwt.ts`** — `signAccessToken` / `signRefreshToken` / `verifyAccessToken` / `verifyRefreshToken`.
- **`src/utils/response.ts`** — Standard response envelope helpers: `sendSuccess`, `sendError`, `successResponse`, `errorResponse`.

---

## Session Management

Bot sessions stored in Redis with a 30-minute inactivity TTL.

**Session key:** `bot:session:{chatId}`

**ConversationSession fields:**
| Field | Type | Description |
|---|---|---|
| `step` | string \| null | Current conversation state |
| `selectedPlatforms` | string[] | Chosen platforms |
| `postType` | string | Announcement, Update, Engagement, Question |
| `tone` | string | Professional, Casual, Witty, Authoritative, Friendly |
| `model` | string | gemini, openai, anthropic (all route to Gemini) |
| `idea` | string | User's idea text (max 500 chars) |
| `generatedContent` | object | Per-platform content from Gemini |
| `timestamp` | number | Last activity time |

If session expires (30 min inactivity), user must re-run `/post`.

---

## Database Schema Design

Six tables, intentionally normalized to allow per-platform partial failures.

| Table | Purpose | Key Design Decision |
|---|---|---|
| `users` | Account + preferences | `telegramChatId` column links Telegram identity to Postly user |
| `social_accounts` | Platform OAuth tokens | `accessTokenEnc` stored AES-256-GCM encrypted — never plain text |
| `ai_keys` | User's own AI API keys | Optional — Gemini platform key used as fallback |
| `posts` | Each publish request | `status` tracks aggregate state; per-platform state lives in `platform_posts` |
| `platform_posts` | One row per platform per post | Independent lifecycle — one platform can fail while others publish |
| `refresh_tokens` | Active JWT refresh tokens | Stored in DB for rotation — invalidated on use or logout |

**Splitting `Post` from `PlatformPost`** is the key schema decision. It means:
- One platform failing doesn't block others.
- Retry can target a specific platform job, not the whole post.
- Dashboard stats can aggregate at the platform level independently.

**Indexes:** `users.email` (unique), `users.telegramChatId`, `refresh_tokens.token` (unique), `platform_posts.postId`.

---

## AI Integration

**Models supported:**
- `gemini` — Google Gemini `gemini-3.1-flash-lite-preview` (platform key via `GEMINI_API_KEY`)
- `openai` — OpenAI GPT-4o (user's own key from `ai_keys.openaiKeyEnc`, AES-256-GCM encrypted)
- `anthropic` — Anthropic Claude Sonnet (user's own key from `ai_keys.anthropicKeyEnc`, AES-256-GCM encrypted)

All three have full production implementations in `content.service.ts`. The Telegram bot model selector lets the user choose any of the three.

The system prompt enforces:
- Platform-specific character limits (Twitter ≤280, Threads ≤500)
- Hashtag count ranges (Twitter/Threads: 2–3, LinkedIn: 3–5, Instagram: 10–15)
- LinkedIn always receives professional tone regardless of user tone setting
- Output must be strict JSON — no markdown fences

Response is validated post-generation and will throw if char limits are violated, forcing a retry.

---

## Queue Design

- **Queue name:** `platform-publish`
- **One job per platform per post** — never a monolithic job
- **Job data:** `{ postId, platformPostId, platform, content, userId }`
- **Retry policy:** 3 attempts, exponential backoff `1s → 5s → 25s`
- **Worker concurrency:** 5 (horizontally scalable)

**Partial failure handling:** Each PlatformPost has its own independent status. If LinkedIn fails all 3 retries, its `PlatformPost.status` becomes `'failed'` with `errorMessage` captured, while the Twitter job can succeed with `status = 'published'`. The parent `Post` record is not blocked.

---

## Security Design

- Passwords: bcrypt, cost factor 12
- JWT access tokens: 15 minutes, HS256
- JWT refresh tokens: 7 days, stored in `RefreshToken` table, rotated on every use (old token deleted, new issued)
- OAuth tokens and AI keys: AES-256-GCM encrypted at rest using `ENCRYPTION_KEY`
- Telegram webhook: every request validated against `TELEGRAM_WEBHOOK_SECRET` header
- Environment variables: validated with Zod at startup — missing vars cause immediate crash with a clear error

---

## Known Issues & Limitations

- **Twitter API tier:** Successfully authenticates via OAuth 1.0a. Posting requires a paid Twitter developer plan (Basic or above). The code is correct — Twitter returns a `402 Payment Required` on free tier attempts.
- **Instagram / Threads:** Job processor stubs are in place with the correct retry/status-update architecture. Activation requires a Facebook Developer App with advanced permissions (not available on free tier). Production-ready once credentials are provided.
- **Render cold starts:** Render free services spin down after 15 minutes of inactivity. The first bot interaction after spin-down takes ~30s to wake. Subsequent requests are fast (~2–4s).
- **Redis eviction policy:** Redis Cloud must be configured with `noeviction` policy for BullMQ to function correctly. This has been set.
