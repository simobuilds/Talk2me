# TODO v3 — UI/UX & Backend Roadmap (2026-03-11)

## Context
Skip smoke-test as requested. Repo pushed to `redis-cloud` remote. This file lists prioritized improvements and small action items to continue developing the chat app.

## High-level goals
- Reliable real-time chat at scale (multiple workers, Redis pub/sub). 
- Good UX: discoverability, accessibility, low friction onboarding.
- Maintainable backend: tests, monitoring, safe migrations.

## UI / UX suggestions (prioritized)
1. Onboarding & auth
   - Show a simple first-time flow (choose username, optional email) with progressive disclosure.
   - Validate and show inline errors; avoid long blocking operations on submit.
2. Conversations list & search
   - Improve user search: show fuzzy matches, keyboard navigation, and recent contacts first.
   - Keep presence badges + last-active timestamp.
3. Message composer
   - Autosize textarea, Ctrl+Enter to send, Enter to insert newline (configurable).
   - Accessibility: label `textarea`, ARIA live region for incoming messages.
   - Add attachments placeholder (design only) for future upload support.
4. Conversation UX
   - Typing indicators, read receipts (opt-in), message delivery states (sending/sent/failed).
   - Smooth scroll to newest when appropriate; preserve scroll position when loading history.
5. Profile & settings
   - Lightweight profile editor with immediate ack and async server update (already done pattern).
   - Offer privacy toggles (show online, show last seen).
6. Mobile / responsive
   - Collapse left sidebar on small screens; keep composer and messages visible; ensure tappable hit targets.

## Backend / infra suggestions (prioritized)
1. Redis & data model
   - Keep `users` ZSET index for fast prefix search; consider a small full-text index for fuzzy search (RedisSearch) later.
   - Message storage: keep TTL-based conversations for ephemeral chats; add optional persistent archive per user.
2. Scaling & reliability
   - Use official Redis client or `ioredis` consistently; centralize client (done: `server/redisClient.js`).
   - Add health checks and readiness probes; graceful shutdown handling for workers.
3. Security & rate limiting
   - Harden auth endpoints and rate-limit login attempts (already added). Add per-IP and per-user throttles.
   - Store REDIS credentials securely in environment / secrets manager — do not commit `.env` to public repos.
4. Observability
   - Add basic metrics (connections, messages/sec, Redis latency) and logs (structured JSON) for production diagnosis.
5. Testing
   - Add unit tests for stores (sessionStore, messageStore, userStore) using a Redis test instance or mocked client.
   - Add an integration smoke harness that runs against local Docker Redis (optional CI step).
6. Operational
   - Backfill tool exists (`server/backfillUsers.js`) — add usage docs and optionally a safe HTTP trigger.

## Small/Actionable next tasks (sprints)
- Sprint 1 (1–2 days): tidy up `server/testRedis.js` (remove or move to `scripts/`), add `README.md` section for REDIS_URL usage, add a health endpoint `/health`.
- Sprint 2 (3 days): add typing indicators + composer UX improvements + accessibility fixes.
- Sprint 3 (3–5 days): add metrics + simple tests for stores; wire an alert for Redis high latency.

## Notes & Risks
- Sensitive creds in `.env`: ensure you rotate the cloud Redis password if the repo is public or leaked.
- `node-redis-master` subtree is present and large; consider removing it or moving it to a `tools/` folder to keep repo size small.

---

If you want, I can: 1) remove `server/testRedis.js` and commit cleanup, 2) create a `/docs` page with run/deploy instructions, or 3) start Sprint 1 changes now.
