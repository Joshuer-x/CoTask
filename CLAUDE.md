# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Prerequisites (one-time)
```bash
brew services start postgresql@16 redis   # start local DB and cache
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
```

### Install dependencies
```bash
source ~/.zshrc   # ensures pnpm is on PATH ($PNPM_HOME=/Users/spr1/Library/pnpm)
pnpm install
```

### Run individual services
```bash
# From repo root, with .env loaded:
pnpm --filter @cotask/api dev           # API on :3001 (tsx watch)
pnpm --filter @cotask/web dev           # Web on :3000 (next dev)
pnpm --filter @cotask/bot-orchestrator dev  # Bot orchestrator on :3003

# AI service (Python) — requires venv:
cd apps/ai-service && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
celery -A celery_app worker --loglevel=info
```

### Run all JS services together
```bash
pnpm dev   # turbo runs dev across all apps in parallel
```

### Build
```bash
pnpm build                          # all packages and apps
pnpm --filter @cotask/db build      # required before first API run; rebuilds Drizzle types
pnpm --filter @cotask/types build
```

### Database
```bash
# From packages/db/ with DATABASE_URL set:
pnpm --filter @cotask/db db:generate  # generate migration from schema changes
pnpm --filter @cotask/db db:migrate   # apply migrations
pnpm --filter @cotask/db db:studio    # open Drizzle Studio in browser
```

### Typecheck / Lint
```bash
pnpm typecheck          # tsc --noEmit across all packages
pnpm lint               # next lint on web; add eslint to other apps as needed
```

### Health checks
```bash
curl http://localhost:3001/health   # API
curl http://localhost:8000/health   # AI service
```

## Environment

Copy `.env.example` to `.env`. Required variables that have no default:
- `DATABASE_URL` — set to `postgresql://cotask:cotask@localhost:5432/cotask` for local dev
- `JWT_SECRET` — min 32 chars
- `OPENAI_API_KEY` — needed for the AI pipeline (action extraction, owner inference)
- `RECALL_AI_API_KEY` / `RECALL_AI_WEBHOOK_SECRET` — needed for meeting bot

The web app reads `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` at build time. The `NEXT_PUBLIC_DEFAULT_WORKSPACE` env var is used in page components as the active workspace ID (hardcoded for now — auth context/session is not yet implemented).

## Architecture

CoTask is a **pnpm monorepo** managed by Turborepo with four apps and two shared packages.

```
apps/
  web/              Next.js 14 (App Router) — user-facing UI
  api/              Fastify — REST API + Socket.IO gateway
  ai-service/       FastAPI + Celery — meeting intelligence pipeline
  bot-orchestrator/ Fastify — thin wrapper over Recall.ai bot API
packages/
  db/               Drizzle ORM schema + getDb() singleton
  types/            Shared TypeScript types consumed by web and api
```

### Request flow (task manager)
Browser → `apps/api` (Fastify, port 3001) → Drizzle ORM → PostgreSQL

All routes require a JWT Bearer token. The token payload (`JwtPayload` in `packages/types`) carries `sub` (user ID), `wid` (workspace ID), and `role`. Every route uses `authenticate` from `apps/api/src/plugins/auth.ts` as a `preHandler`. RBAC is currently enforced only at the middleware layer (DB-level RLS policies are defined in migration SQL but not applied in dev).

### Request flow (meeting → tasks)
1. User calls `POST /v1/workspaces/:wid/meetings` → API inserts meeting row, fires `POST /internal/bot/join` to the AI service (fire-and-forget)
2. AI service forwards to `apps/bot-orchestrator` → Recall.ai API creates a bot that joins the meeting
3. When the meeting ends, Recall.ai calls `POST /webhooks/recall` on the AI service
4. The webhook validates the HMAC signature and enqueues `process_meeting_audio` as a Celery task
5. **Pipeline** (each stage is a Celery task, chained via `.delay()`):
   - `ingestion` → downloads audio from Recall.ai presigned URL, uploads to S3
   - `transcription` → Whisper API → list of `{start, end, text}` utterances
   - `diarization` → assigns `speaker_label` per utterance; resolves labels to `user_id` via `meeting_participants` table
   - `action_extraction` → GPT-4o with 20-utterance sliding window (3-utterance overlap); Jaccard deduplication
   - `owner_inference` → rule cascade (explicit name → first-person → role match → GPT-4o fallback)
   - `task_writer` → inserts `action_points` rows, updates `meeting.status = completed`, pings API to emit `action_points:ready` WebSocket event
6. Frontend receives `action_points:ready` via Socket.IO; user reviews in `ActionPointsList`; accept creates a `tasks` row via the API

### Real-time (WebSocket)
The API registers a Socket.IO server on the same HTTP server. Clients join room `workspace:<wid>` after JWT handshake. The Redis adapter (`@socket.io/redis-adapter`) enables horizontal scaling. Events are typed via `WsEvents` in `packages/types`.

### Shared packages

**`@cotask/db`** — the only place that imports `drizzle-orm`. Schema files use bare relative imports (no `.js` extension) because drizzle-kit bundles TypeScript directly and cannot resolve ESM `.js`→`.ts` remapping. The compiled `dist/` must exist before any other package imports it; run `pnpm --filter @cotask/db build` after schema changes.

**`@cotask/types`** — pure TypeScript interfaces shared across web and api. No runtime dependencies.

### Known module resolution quirk
The repo uses `.npmrc` with `shamefully-hoist=true` because pnpm's strict isolation prevents `apps/api` from seeing `drizzle-orm` (a transitive dep through `@cotask/db`). Without this flag the API won't start.

### What is not yet implemented
- Auth context / session management in the web (access token lives in module-level memory in `apps/web/src/lib/api.ts`; page components read `NEXT_PUBLIC_DEFAULT_WORKSPACE` directly)
- New Task modal (`onClick` handler is a TODO in `apps/web/src/app/(app)/tasks/page.tsx`)
- Invite Bot modal in the meetings page
- Real speaker diarization (pyannote) — currently falls back to `SPEAKER_UNKNOWN` for all utterances
- Email notifications via AWS SES
- DB-level RLS policies active in application queries
- `task_activity_log` writes on status/assignee changes
