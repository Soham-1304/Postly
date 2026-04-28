# PROJECT.md — Postly: Your Guide & Summary

> Read this before anything else. This is your north star.

---

## What You're Building (Plain English)

You're building a backend system called **Postly**. Here's the user journey in one sentence:

> A user sends a message to a Telegram bot with their idea → the bot asks a few questions → AI generates social media posts → the system publishes them to Twitter, LinkedIn, Instagram, and Threads automatically.

You are building **everything on the server side**. No frontend. Just APIs, a bot, a database, and a queue system.

---

## The 3 Things That Will Get You Selected

The evaluators explicitly said these matter most:

### 1. ✅ A Working Telegram Bot (18% weight)
The bot must actually work end-to-end. Someone should be able to message it, go through the flow, and get a real AI-generated post preview. This is the **most important deliverable**. A working bot scores higher than a perfectly written API that doesn't connect to anything real.

### 2. ✅ A Clean, Incremental Commit History (12% weight)
They review your commit history as seriously as your code. Every phase should produce 2–3 commits. Message format: `feat: add JWT refresh token rotation`. A single massive commit at the end = automatic red flag.

### 3. ✅ A Live, Accessible Deployment
If your API URL doesn't respond, your submission is not reviewed. Period. Deploy early (Phase 8), don't leave it for last minute.

---

## The Big Substitution to Remember

The brief says to use **OpenAI + Anthropic**. You have no paid keys.

**Solution: Use Google Gemini (free) for everything.**

- Both `"openai"` and `"anthropic"` model options in the API → route to Gemini internally
- `model_used` in responses → return `"gemini-1.5-flash"` (be honest)
- Get your free key at: **https://aistudio.google.com/app/apikey**
- Document this in `AI_USAGE.md` — evaluators appreciate transparency

---

## Free Services to Use

| What | Service | Why |
|---|---|---|
| Database (PostgreSQL) | **Supabase** (free tier) | 500MB free, hosted PostgreSQL |
| Redis | **Upstash** (free tier) | Free serverless Redis, works with BullMQ |
| Deployment | **Render** (free tier) | Free web service, auto-deploys from GitHub |
| AI | **Google Gemini API** | Completely free, `gemini-1.5-flash` model |
| Telegram Bot | **BotFather** (free) | Create bot, get token |

---

## What Each File in This Package Is For

| File | Purpose |
|---|---|
| `CONTEXT.md` | **Paste this into Cursor/Codex** before starting any feature. It gives the AI full project context — stack, schema, endpoints, rules. |
| `ROADMAP.md` | Your step-by-step build plan. Follow phases in order. Each step has checkboxes — check them off as you go. |
| `PROJECT.md` | This file. Your human guide. Read it when you're confused about priorities or decisions. |

---

## Project Deliverables Checklist

These are the things the evaluators will look for at submission time:

### Code (GitHub Repo)
- [ ] Public GitHub repository with full source code
- [ ] Incremental commit history (no giant single commits)
- [ ] No `.env` file or secrets in git history — ever
- [ ] `docker-compose.yml` that starts the whole app locally with one command
- [ ] `prisma/` folder with migrations checked in

### Documentation
- [ ] `README.md` — live URL at top, local setup guide, env vars explained
- [ ] `ARCHITECTURE.md` — ASCII data flow diagram, schema decisions, queue design
- [ ] `AI_USAGE.md` — what AI tools you used, what prompts, what you validated
- [ ] `.env.example` — all env variables documented (no real values)

### API
- [ ] All auth endpoints working (register, login, refresh, logout, me)
- [ ] User profile + social account endpoints working
- [ ] `POST /api/content/generate` — calls real Gemini, returns real content
- [ ] `POST /api/posts/publish` — creates DB records, enqueues BullMQ jobs
- [ ] Posts list + detail + retry + cancel working
- [ ] Dashboard stats endpoint
- [ ] `GET /health` returns 200

### Bot
- [ ] Telegram bot live and responding to messages
- [ ] Full publish flow works (idea → preview → confirm)
- [ ] `/status`, `/accounts`, `/help` commands work
- [ ] Webhook configured (not polling)

### Tests
- [ ] Minimum 5 Jest + Supertest tests
- [ ] Tests actually test real behavior (not just "it exists")

### Submission
- [ ] Postman collection with all endpoints, pointing to live URL
- [ ] Loom 2-minute video (show bot flow + API in Postman)
- [ ] Deployment stays live for 7 days after submission

---

## What to Focus On (Priority Order)

If you're running low on time, build in this order of priority:

```
1. Auth system           — foundation for everything
2. AI content engine     — core value of the product
3. Telegram bot          — highest evaluation weight
4. Queue + publishing    — shows architecture skills
5. Tests                 — minimum 5, don't skip
6. Deployment            — non-negotiable, do early
7. Dashboard API         — nice to have, quick to add
8. Real social posting   — bonus, do only if time permits
```

---

## Architecture in Plain English

```
User types /post in Telegram
    ↓
grammy bot receives webhook
    ↓
Redis stores conversation state (30 min TTL)
    ↓
Bot collects: post type, platforms, tone, model, idea
    ↓
Bot calls POST /api/content/generate
    ↓
Content service builds prompt → calls Gemini API → parses JSON
    ↓
Bot shows preview → user confirms
    ↓
Bot calls POST /api/posts/publish
    ↓
Posts service creates Post + PlatformPost records in PostgreSQL
    ↓
One BullMQ job enqueued per platform (Twitter, LinkedIn, etc.)
    ↓
Worker processes jobs → attempts platform API → updates DB status
    ↓ (on failure)
Exponential backoff retry (1s → 5s → 25s), max 3 attempts
    ↓
Bot sends final success/failure message per platform
```

---

## Schema in Plain English

You have 6 database tables:

| Table | What it stores |
|---|---|
| `users` | Account info: email, hashed password, name, preferences |
| `social_accounts` | Connected Twitter/LinkedIn/etc. accounts (tokens encrypted) |
| `ai_keys` | User's own OpenAI/Anthropic keys (encrypted) — optional |
| `posts` | Each publishing request (idea, type, tone, model used) |
| `platform_posts` | One row per platform per post — tracks content + publish status |
| `refresh_tokens` | Active refresh tokens for JWT rotation |

---

## Common Mistakes to Avoid

**On Security:**
- Never log tokens, passwords, or API keys — not even in dev
- Always validate tokens in middleware, never in route handlers directly
- AES-256-GCM for encryption — don't use the older CBC mode

**On the Queue:**
- One job per platform, not one job for all platforms
- Retry config goes in the job options, not in the processor
- Always update DB status at start (processing) and end (published/failed)

**On the Bot:**
- Use webhook, not polling, in production
- Always check session expiry before processing a message
- Handle the case where user sends free text when a button press is expected

**On AI:**
- Parse Gemini's JSON response with try/catch — it can occasionally return malformed JSON
- Enforce char limits AFTER generation — Gemini may go over, truncate if needed
- Don't call Gemini for every platform separately — one call, all platforms in one prompt

**On Git:**
- Make commits as you finish each sub-step, not at the end of each phase
- Push to GitHub regularly — don't lose work
- Run `git log --oneline` before submission to verify history looks clean

---

## Key Commands Reference

```bash
# Start local dev
docker-compose up

# Run migrations
npx prisma migrate dev --name <migration_name>

# Generate Prisma client after schema change
npx prisma generate

# Run tests
npm test

# Set Telegram webhook (replace values)
curl "https://api.telegram.org/bot{TOKEN}/setWebhook" \
  -d "url=https://your-app.onrender.com/api/bot/webhook"

# Check webhook status
curl "https://api.telegram.org/bot{TOKEN}/getWebhookInfo"
```

---

## Files You Need to Create for Submission

In your repo root, these docs files are **required**:

```
README.md           ← Live URL at the very top
ARCHITECTURE.md     ← ASCII diagram + decisions
AI_USAGE.md         ← What AI tools, what for, what you validated
.env.example        ← All variables, no real values
CONTEXT.md          ← Included in this package
ROADMAP.md          ← Included in this package
```

---

## Quick Architecture Diagram (ASCII)

```
┌─────────────────────────────────────────────────────┐
│                    POSTLY SYSTEM                    │
└─────────────────────────────────────────────────────┘

User (Telegram)
     │
     ▼
┌──────────┐    webhook    ┌─────────────────────────┐
│ Telegram │ ──────────► │   Express API Server     │
│   Bot    │              │   (Node.js / Railway)    │
└──────────┘              └───────────┬─────────────┘
                                      │
                    ┌─────────────────┼──────────────────┐
                    │                 │                  │
                    ▼                 ▼                  ▼
             ┌──────────┐    ┌──────────────┐   ┌──────────────┐
             │ Gemini   │    │  PostgreSQL  │   │    Redis     │
             │   API    │    │  (Supabase)  │   │  (Upstash)   │
             └──────────┘    └──────────────┘   └──────┬───────┘
                                                        │
                                                   BullMQ Queue
                                                        │
                              ┌─────────────────────────┼───────┐
                              ▼                 ▼        ▼       ▼
                         Twitter Job    LinkedIn Job   IG Job  Threads
```

---

*Good luck. Build fast, commit often, understand everything you ship.*
