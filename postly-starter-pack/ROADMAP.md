# ROADMAP.md — Postly Build Plan

> Timeline: ~1.5 days | Today (heavy) + Tomorrow AM (finish + ship)
> Tools: Cursor / Codex for speed, you own and understand every decision

---

## Big Picture Timeline

```
TODAY (Full Day)
├── Phase 1 — Foundation + Schema         (2.5 hrs)
├── Phase 2 — Auth System                 (1.5 hrs)
├── Phase 3 — User + Social Accounts      (1 hr)
├── Phase 4 — AI Content Engine           (1.5 hrs)
└── Phase 5 — Queue + Publishing Engine   (2 hrs)

TOMORROW (Morning)
├── Phase 6 — Telegram Bot                (2 hrs)
├── Phase 7 — Dashboard API + Tests       (1.5 hrs)
└── Phase 8 — Deploy + Docs + Submission  (1.5 hrs)
```

---

## Phase 1 — Foundation + Schema
**Duration:** ~2.5 hours
**Goal:** Repo is live, structure is set, DB is ready, Docker works locally

### Step 1.1 — Repo + Folder Setup
- [ ] Create GitHub repo (public), clone locally
- [ ] `npm init -y`, install core deps:
  ```
  express prisma @prisma/client grammy bullmq ioredis
  bcryptjs jsonwebtoken zod dotenv @google/generative-ai
  ```
- [ ] Install dev deps:
  ```
  typescript ts-node nodemon jest supertest @types/...
  ```
- [ ] Create folder structure as defined in CONTEXT.md
- [ ] Set up `tsconfig.json` (target: ES2020, strict: true)
- [ ] Set up `nodemon.json` for dev server
- **Commit:** `chore: init project structure and dependencies`

### Step 1.2 — Docker + Environment
- [ ] Write `docker-compose.yml` with services: `app`, `postgres`, `redis`
- [ ] Write `Dockerfile` (node:18-alpine, multi-stage)
- [ ] Create `.env.example` with all variables (see CONTEXT.md)
- [ ] Create `.gitignore` — include `.env`, `node_modules`, `dist`
- [ ] Create `src/config/env.ts` — Zod schema validation for all env vars
- **Commit:** `chore: add docker-compose, Dockerfile, and env validation`

### Step 1.3 — Database Schema
- [ ] Write full `prisma/schema.prisma` (all 6 models from CONTEXT.md)
- [ ] Create Supabase project → get `DATABASE_URL`
- [ ] Run `npx prisma migrate dev --name init`
- [ ] Create `src/config/db.ts` — Prisma client singleton
- **Commit:** `feat: add prisma schema and initial migration`

### Step 1.4 — Express App Boilerplate
- [ ] Write `src/app.ts` — Express setup, JSON middleware, CORS, routes mount
- [ ] Write `src/utils/response.ts` — success/error envelope helpers
- [ ] Write `src/middleware/errorHandler.ts` — global 500 catcher
- [ ] Add `GET /health` endpoint returning `{ status: "ok", timestamp }`
- [ ] Test locally: `npm run dev` → hit `/health`
- **Commit:** `feat: express app bootstrap with health check and error handler`

---

## Phase 2 — Auth System
**Duration:** ~1.5 hours
**Goal:** Full JWT auth working, tokens rotating, protected routes locked

### Step 2.1 — JWT + Bcrypt Utils
- [ ] Write `src/utils/jwt.ts`:
  - `signAccessToken(userId)` → 15min JWT
  - `signRefreshToken(userId)` → 7day JWT
  - `verifyAccessToken(token)` → decoded payload or throw
  - `verifyRefreshToken(token)` → decoded payload or throw
- [ ] Write `src/utils/crypto.ts`:
  - `encrypt(text)` → AES-256-GCM → `iv:authTag:cipher`
  - `decrypt(cipher)` → plaintext

### Step 2.2 — Auth Service + Controller
- [ ] `auth.service.ts`:
  - `register(email, password, name)` — bcrypt hash, create user + refresh token
  - `login(email, password)` — verify, issue both tokens
  - `refresh(oldToken)` — verify, rotate (delete old, issue new)
  - `logout(token)` — delete refresh token from DB
  - `getMe(userId)` — fetch user without password
- [ ] `auth.controller.ts` — call service, return envelope
- [ ] `auth.routes.ts` — wire routes

### Step 2.3 — Auth Middleware
- [ ] `src/middleware/auth.ts`:
  - Extract `Bearer` token from header
  - Verify with `verifyAccessToken`
  - Attach `req.user = { id, email }` 
  - Return 401 on any failure — no exceptions

### Step 2.4 — Wire + Test
- [ ] Mount `/api/auth` in `app.ts`
- [ ] Manual test: register → login → call `/api/auth/me` → refresh → logout
- **Commit:** `feat: complete auth system with JWT rotation and bcrypt`

---

## Phase 3 — User Profile + Social Accounts
**Duration:** ~1 hour
**Goal:** Profile management and social account CRUD working

### Step 3.1 — User Service
- [ ] `user.service.ts`:
  - `getProfile(userId)`
  - `updateProfile(userId, data)` — name, bio, defaultTone, defaultLanguage
  - `addSocialAccount(userId, platform, accessToken, refreshToken, handle)` — encrypt tokens
  - `getSocialAccounts(userId)`
  - `deleteSocialAccount(userId, accountId)`
  - `updateAiKeys(userId, openaiKey?, anthropicKey?)` — encrypt keys

### Step 3.2 — Controller + Routes
- [ ] `user.controller.ts` + `user.routes.ts`
- [ ] All routes protected with auth middleware
- **Commit:** `feat: user profile and social account management`

---

## Phase 4 — AI Content Engine
**Duration:** ~1.5 hours
**Goal:** Gemini generates real platform-specific content via POST /api/content/generate

### Step 4.1 — Prompt Builder
- [ ] `src/modules/content/prompts.ts`:
  ```
  buildSystemPrompt(platforms, tone, language, postType) → string
  ```
  System prompt must:
  - Define each platform's char limit and hashtag rules
  - Inject tone and language
  - Instruct model to return ONLY valid JSON with keys per platform
  - Example JSON shape it must output:
    ```json
    {
      "twitter": { "content": "...", "hashtags": [] },
      "linkedin": { "content": "...", "hashtags": [] },
      "instagram": { "content": "...", "hashtags": [] },
      "threads": { "content": "..." }
    }
    ```

### Step 4.2 — Gemini Integration
- [ ] `src/modules/content/content.service.ts`:
  - `generateContent({ idea, postType, platforms, tone, language, model, userId })`
  - Initialize Gemini client with user's key (if present + decrypted) OR `GEMINI_API_KEY`
  - Call `gemini-1.5-flash`
  - Parse JSON response
  - Count chars, extract hashtags
  - Return structured response as per brief spec
  - Handle Gemini API errors gracefully (return 502 with message)

### Step 4.3 — Controller + Route
- [ ] `content.controller.ts` + `content.routes.ts`
- [ ] Input validation with Zod (idea max 500 chars, valid enums)
- [ ] Test: POST with a real idea → verify real Gemini response
- **Commit:** `feat: AI content engine with Gemini, platform-specific prompts`

---

## Phase 5 — Queue + Publishing Engine
**Duration:** ~2 hours
**Goal:** BullMQ queues jobs per platform, retries on failure, status tracked in DB

### Step 5.1 — Redis Connection
- [ ] `src/config/redis.ts` — ioredis client using `REDIS_URL` (Upstash)
- [ ] Test connection on app startup (log success/failure)

### Step 5.2 — Queue Definition
- [ ] `src/modules/queue/queue.ts`:
  - Export `publishQueue` — BullMQ Queue instance
  - Job data type: `{ postId, platformPostId, platform, content, userId, attempts }`

### Step 5.3 — Platform Job Processors
- [ ] `src/modules/queue/jobs/twitter.job.ts` — stub that logs "would post to Twitter" (real API = bonus)
- [ ] Same for linkedin, instagram, threads
- [ ] Each processor:
  - Update `PlatformPost.status = 'processing'`
  - Attempt to post (stub for now)
  - On success: `status = 'published'`, set `publishedAt`
  - On failure: `status = 'failed'`, set `errorMessage`, increment `attempts`

### Step 5.4 — BullMQ Worker
- [ ] `src/modules/queue/worker.ts`:
  - Worker listens on `platform-publish` queue
  - Routes job to correct processor by `platform` field
  - Retry config: `{ attempts: 3, backoff: { type: 'exponential', delay: 1000 } }`

### Step 5.5 — Posts Service + Routes
- [ ] `posts.service.ts`:
  - `publishPost(userId, { idea, postType, tone, language, model, platforms })`:
    1. Call `generateContent` for all platforms
    2. Create `Post` record in DB
    3. Create `PlatformPost` record per platform
    4. Enqueue one BullMQ job per platform
    5. Return post with all platform statuses
  - `schedulePost(userId, data, publishAt)` — same but set `publishAt`, delay queue job
  - `getPosts(userId, filters)` — paginated
  - `getPost(userId, postId)`
  - `retryPost(userId, postId)` — re-enqueue failed platform jobs
  - `cancelPost(userId, postId)` — cancel if not yet published
- [ ] `posts.controller.ts` + `posts.routes.ts`
- **Commit:** `feat: BullMQ publishing queue with per-platform jobs and retry backoff`

---

## Phase 6 — Telegram Bot
**Duration:** ~2 hours
**Goal:** Full stateful bot flow working, webhook live, all commands working

### Step 6.1 — Bot Setup (grammy)
- [ ] `src/modules/bot/bot.ts` — create grammy Bot instance
- [ ] `src/modules/bot/bot.routes.ts` — Express route for webhook at `/api/bot/webhook`
- [ ] On app start: bot receives updates via webhook (NOT polling)
- [ ] Set webhook via Telegram API after deployment

### Step 6.2 — Redis Session Store
- [ ] Session key: `bot:session:{chatId}`
- [ ] Session shape:
  ```typescript
  {
    step: 'post_type' | 'platforms' | 'tone' | 'model' | 'idea' | 'confirm',
    postType?: string,
    platforms?: string[],
    tone?: string,
    model?: string,
    idea?: string,
    userId?: string,    // linked Postly user
    expiresAt: number   // Unix timestamp + 30min
  }
  ```
- [ ] On each message: check if session expired → if yes, reset and prompt to start over
- [ ] Helper: `getSession(chatId)`, `setSession(chatId, data)`, `clearSession(chatId)`

### Step 6.3 — Publish Conversation Flow
- [ ] `/start` or `/post` → send inline keyboard for post type (6 options)
- [ ] Callback: post type selected → update session → send platform selector (multi-select with ✅ toggle)
- [ ] Platform done button → send tone selector
- [ ] Tone selected → send model selector (GPT-4o / Claude Sonnet — both go to Gemini)
- [ ] Model selected → ask for idea text
- [ ] Idea received → call content engine → send preview per platform + confirm buttons
- [ ] Confirm → call `publishPost` service → send per-platform success/failure
- [ ] Edit → back to idea step
- [ ] Cancel → clear session, send cancelled message

### Step 6.4 — Commands
- [ ] `/status` — fetch last 5 posts from DB for this user, format nicely
- [ ] `/accounts` — fetch connected social accounts
- [ ] `/help` — list all commands with descriptions

### Step 6.5 — Edge Cases
- [ ] Unexpected free text when a keyboard is expected → "Please use the buttons above 👆"
- [ ] Session timeout mid-flow → "Your session expired. Type /post to start again."
- [ ] AI failure → "Content generation failed. Try again with /post"
- [ ] User not linked to account → guide them to link

- **Commit:** `feat: telegram bot with stateful redis sessions and full publish flow`

---

## Phase 7 — Dashboard API + Tests
**Duration:** ~1.5 hours

### Step 7.1 — Dashboard Endpoint
- [ ] `GET /api/dashboard/stats`:
  - Total posts by this user
  - Success rate (published / total platform posts)
  - Posts per platform (count by platform)

### Step 7.2 — Tests (minimum 5)
Write in `tests/` using Jest + Supertest:

| Test | File |
|---|---|
| Register succeeds, login returns tokens | `auth.test.ts` |
| Expired access token returns 401 | `middleware.test.ts` |
| Missing token returns 401 | `middleware.test.ts` |
| Content generate validates input (empty idea) | `content.test.ts` |
| Publish creates Post + PlatformPost records in DB | `posts.test.ts` |
| GET /api/posts returns paginated response | `posts.test.ts` |

- **Commit:** `test: add auth, middleware, content, and posts test coverage`

---

## Phase 8 — Deploy + Docs + Submission
**Duration:** ~1.5 hours

### Step 8.1 — Deployment
- [ ] Push all code to GitHub
- [ ] Create Render web service:
  - Build command: `npm run build`
  - Start command: `npm start`
  - Add all env vars from `.env.example`
- [ ] Run `prisma migrate deploy` on Render (add as part of start script or manual)
- [ ] Test: hit `/health` on live URL

### Step 8.2 — Telegram Webhook
- [ ] Call:
  ```
  https://api.telegram.org/bot{TOKEN}/setWebhook?url={RENDER_URL}/api/bot/webhook&secret_token={WEBHOOK_SECRET}
  ```
- [ ] Verify in Telegram: send `/help` to bot → should respond

### Step 8.3 — Documentation Files
- [ ] `README.md` — base URL, local setup, env vars, Telegram setup, API overview
- [ ] `ARCHITECTURE.md` — data flow diagram (ASCII), schema decisions, queue design, partial failure handling
- [ ] `AI_USAGE.md` — where Cursor/Codex was used, what prompts, what you changed
- [ ] `CONTEXT.md` — already done ✅
- [ ] `ROADMAP.md` — already done ✅

### Step 8.4 — Postman Collection
- [ ] Export a Postman collection with all endpoints
- [ ] Point to live URL
- [ ] Include example request bodies
- [ ] Save as `postly.postman_collection.json` in repo root

### Final Commits
- `docs: add README, ARCHITECTURE, and AI_USAGE`
- `chore: add postman collection`

---

## Commit Message Cheatsheet

```
feat: <what new thing was added>
fix: <what bug was fixed>
chore: <config, tooling, non-code>
test: <tests added or changed>
docs: <documentation only>
refactor: <code change, no behavior change>
```

**Never commit:** "done", "fix", "update", "final", "wip" alone

---

## Daily End-of-Session Checklist

### End of Today
- [ ] Phases 1–5 complete
- [ ] `/health`, `/api/auth/*`, `/api/user/*`, `/api/content/generate`, `/api/posts/*` working locally
- [ ] Docker compose spins up cleanly
- [ ] At least 8 meaningful commits

### End of Tomorrow (Submission)
- [ ] Phase 6–8 complete
- [ ] Live URL accessible
- [ ] Telegram bot responds to `/help`
- [ ] At least 5 passing tests
- [ ] All docs present in repo
- [ ] Postman collection exported and committed
- [ ] README has live URL at top
- [ ] No secrets in git history
