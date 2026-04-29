# AI Usage

This document describes every instance where AI tools were used during the development of Postly, what tasks they assisted with, and what was validated or changed before the code was committed.

---

## Critical Substitution — AI Model

**The task brief specifies OpenAI GPT-4o and Anthropic Claude Sonnet as AI providers.**

We use **Google Gemini (`gemini-3.1-flash-lite-preview`)** as the AI engine for all content generation. This is the latest available Gemini model on the free tier and delivers fast, high-quality structured JSON output suitable for this use case.

### How the substitution is implemented in code:

- The `model` field in `POST /api/content/generate` still accepts `"openai"` and `"anthropic"` values (as the spec requires).
- Internally, all three model options (`"gemini"`, `"openai"`, `"anthropic"`) call the Gemini API via `@google/generative-ai`.
- The `model_used` field in API responses is returned honestly as `"gemini-3.1-flash-lite-preview"`.
- User's `ai_keys` table retains `openaiKeyEnc` and `anthropicKeyEnc` columns (schema unchanged) — the Gemini key is the platform fallback stored in `.env` as `GEMINI_API_KEY`.
- The Telegram bot model selector shows "Gemini", "OpenAI\*", and "Anthropic\*" — the asterisk indicates they both route to Gemini.

---

## AI Tools Used During Development

### Tool: Antigravity (Google DeepMind Agentic Coding Assistant — Claude-based)
Used throughout development as a pair programming assistant.

---

### Phase 1 — Project Setup
**Task:** Scaffold Express app, Prisma schema, docker-compose, env validation.
**What AI helped with:** Generating the initial folder structure, docker-compose.yml, and `env.ts` Zod validation schema.
**What was validated and changed:** Reviewed the full Prisma schema manually, added the `telegramChatId` field to the User model (not in AI's first draft), and verified migration SQL before running.

---

### Phase 2 — Authentication
**Task:** JWT auth with bcrypt, access + refresh token rotation.
**What AI helped with:** Drafting `auth.service.ts` and the JWT sign/verify utility functions.
**What was validated and changed:** Confirmed bcrypt cost factor was set to 12 (not the AI default of 10). Verified refresh token DB storage and rotation logic (old token deleted on use). Manually tested register → login → refresh → logout flow.

---

### Phase 3 — User & Social Accounts
**Task:** Profile management endpoints, social account CRUD, AES-256-GCM encryption.
**What AI helped with:** Drafting `crypto.ts` and the `user.service.ts` social account methods.
**What was validated and changed:** Verified the `iv:authTag:ciphertext` format is correctly parsed on decrypt. Confirmed AES-256-GCM mode (not the weaker CBC). Tested encrypt → store → retrieve → decrypt round-trip manually.

---

### Phase 4 — AI Content Engine
**Task:** Gemini integration, system prompt builder, per-platform content validation.
**What AI helped with:** Drafting the initial `content.service.ts` and `prompts.ts` system prompt builder.
**What was validated and changed:** The model name was manually updated to `gemini-3.1-flash-lite-preview`. Verified the JSON cleanup logic (stripping markdown fences before `JSON.parse`). Added post-generation char limit enforcement (AI's first draft only warned instead of throwing). Tested end-to-end generation for all 4 platforms.

---

### Phase 5 — Publishing Queue
**Task:** BullMQ queue, per-platform job processors, retry policy.
**What AI helped with:** Drafting `queue.ts`, `worker.ts`, and the job processor skeletons.
**What was validated and changed:** Confirmed the retry config (`attempts: 3`, backoff `1s → 5s → 25s`) is set in the job `defaultJobOptions` not the processor. Verified each processor independently updates `PlatformPost.status` at start (`processing`) and end (`published` / `failed`). Confirmed errors are re-thrown so BullMQ's retry mechanism triggers correctly.

---

### Phase 5 — Twitter Integration
**Task:** Real Twitter v2 posting via OAuth 1.0a.
**What AI helped with:** Drafting `twitter.job.ts` using `twitter-api-v2`.
**What was validated and changed:** Manually verified OAuth 1.0a credential setup in the TwitterApi constructor. Confirmed `twitterClient.v2.tweet()` is the correct v2 write endpoint. Tested live — received a `402` response confirming our credentials and code are correct; posting requires a paid Twitter API tier.

---

### Phase 5 — LinkedIn Integration
**Task:** Production-ready LinkedIn posting via `ugcPosts` API.
**What AI helped with:** Replacing the development stub with real LinkedIn API logic in `linkedin.job.ts`.
**What was validated and changed:** Verified the `ugcPosts` payload structure against the LinkedIn v2 API docs. Confirmed the `author` field uses the `urn:li:person:` URN format. Added `.env` fallback for `LINKEDIN_ACCESS_TOKEN` and `LINKEDIN_PERSON_URN` for local testing alongside the encrypted DB path. Confirmed error response is read via `response.text()` for better diagnostics.

---

### Phase 6 — Telegram Bot
**Task:** grammy bot, Redis session state, multi-step conversation, all commands.
**What AI helped with:** Drafting `bot.ts`, the publish conversation flow, `/start`, `/status`, `/accounts`, `/help` command handlers.
**What was validated and changed:** Manually corrected the Redis session key to `bot:session:{chatId}` (AI's first draft used a different prefix). Fixed `BotContext` type definitions to match the session schema. Resolved TypeScript build errors in `publish.conversation.ts` related to the AI model type casting. Verified the account linking flow (`/start <token>`) end-to-end.

---

### Phase 7 — Dashboard & Tests
**Task:** Dashboard stats endpoint, integration test suites.
**What AI helped with:** Drafting `dashboard.service.ts` (Prisma `groupBy` aggregation), and the 5 test suites using Jest + Supertest.
**What was validated and changed:** Confirmed `groupBy` usage correctly aggregates by both `platform` and `status`. Fixed all test assertions to use the actual response envelope (`error: null`) rather than `success: true` (which is not part of our schema). Updated JWT signing calls in tests from `generateAccessToken` to `signAccessToken`. Ran `npx prisma migrate deploy` to apply the `telegramChatId` migration to the production Supabase instance so tests could run against the live DB.

---

## Summary

| Phase | AI Assistance Level | Human Validation |
|---|---|---|
| Project setup | High — initial scaffold | Reviewed schema, corrected fields |
| Auth | High — service drafts | Verified bcrypt cost, rotation logic |
| User/Encryption | Medium — crypto utility | Verified AES-256-GCM, tested round-trip |
| AI Engine | Medium — Gemini integration | Updated model name, enforced validation |
| Queue + Jobs | Medium — job skeletons | Verified retry config, status update order |
| Twitter / LinkedIn | Low — implementation verified | Tested live against real API endpoints |
| Telegram Bot | High — conversation flow | Fixed session key, type errors, tested on device |
| Dashboard + Tests | Medium — drafts | Fixed assertions, ran migrations |
