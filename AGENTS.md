<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# OutARC — Agent Context

## What this project is
OutARC is a full-stack web app that automatically applies to internships on Handshake for UW–Madison students. It tailors the resume and cover letter per job using an OpenClaw AI agent, then submits via Playwright browser automation.

## Tech stack
- **Framework**: Next.js 14 App Router + TypeScript
- **UI**: Tailwind CSS + shadcn/ui (Radix, Nova preset)
- **Auth**: NextAuth.js with Google OAuth (@wisc.edu only)
- **Database**: PostgreSQL via Prisma ORM
- **Queue**: BullMQ + Redis (job queue for applications)
- **AI Agent**: OpenClaw with MiniMax-M1 model
- **Automation**: Playwright (Chromium, headed mode)
- **Notifications**: Discord webhook
- **Deploy**: Vercel (frontend) + Railway (Postgres, Redis, worker)

## Folder structure
- `src/app/(auth)/` — login page
- `src/app/(dashboard)/` — all protected dashboard pages
- `src/app/api/` — API routes
- `src/lib/` — prisma client, queue, encryption utilities
- `worker/` — BullMQ worker process (runs separately from Next.js)
- `openclaw-skills/` — OpenClaw skill markdown files
- `prisma/` — schema and migrations

## Key conventions
- All dashboard routes are protected via `src/middleware.ts`
- Only @wisc.edu Google accounts can log in — enforced in NextAuth signIn callback
- Handshake passwords are AES-256-GCM encrypted before storing in DB
- Never log credentials, session tokens, or decrypted passwords
- API routes validate input with Zod before touching the DB
- Worker runs as a separate process — do not import worker code into Next.js pages

## Models (Prisma)
User, Resume, JobFilter, Application — plus NextAuth models (Account, Session, VerificationToken)

## Environment variables
DATABASE_URL, REDIS_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, AES_ENCRYPTION_KEY, DISCORD_WEBHOOK_URL, OPENCLAW_API_KEY, MINIMAX_MODEL, WORKER_SECRET