# OutARC — Full Context Handoff
> Paste this into your Cowork/new chat to resume exactly where you left off.

---

## What OutARC is
A full-stack web platform for UW–Madison students that:
1. Reads your uploaded resume
2. Scrapes Handshake for internship listings matching your filters
3. Uses OpenClaw AI agent (MiniMax-M1) to tailor resume bullets + write a cover letter per job
4. Submits the application on Handshake via Playwright browser automation
5. Sends a Discord notification confirming each application

**Name meaning:** ARC = **A**pply · **R**esume · **C**over letter

---

## Current Status: Day 0 Setup — In Progress
Person A (Rithik) is setting up the frontend. Person B handles backend + Playwright.

### ✅ Completed so far
- GitHub org created: `getoutarc`
- Repo created: `getoutarc/OutARC`
- Next.js initialized in repo root (`C:\Users\rithi\outarc`)
- shadcn/ui installed (Radix + Nova preset, Geist font, Lucide icons)
- Components added: button, input, label, card, table, badge, dialog, sonner (toast)
- AGENTS.md filled with OutARC project context for Cursor
- Everything committed and pushed to GitHub

### 🔲 Still to do — finish Day 0
1. Install core dependencies (currently running or next step):
   ```bash
   npm install prisma @prisma/client next-auth @auth/prisma-adapter bullmq ioredis bcryptjs
   ```
2. Install pdf-parse:
   ```bash
   npm install pdf-parse
   npm install --save-dev @types/pdf-parse
   ```
3. Set up branch protection on `main` (repo Settings → Branches → require PR before merging)
4. Create `dev` branch:
   ```bash
   git checkout -b dev
   git push origin dev
   ```
5. Person B needs to: create Railway project (Postgres + Redis), create Google OAuth credentials, create Discord webhook, share .env.local

---

## Tech Stack
| Layer | Tech |
|-------|------|
| Framework | Next.js 14 App Router + TypeScript |
| UI | Tailwind CSS + shadcn/ui (Radix, Nova preset) |
| Auth | NextAuth.js — Google OAuth, @wisc.edu only |
| Database | PostgreSQL + Prisma ORM |
| Queue | BullMQ + Redis |
| AI Agent | OpenClaw + MiniMax-M1 |
| Automation | Playwright (Chromium, headed mode) |
| Notifications | Discord webhook |
| Deploy | Vercel (frontend) + Railway (Postgres, Redis, worker) |

---

## Local Setup
- **Local path**: `C:\Users\rithi\outarc`
- **GitHub**: `github.com/getoutarc/OutARC`
- **Terminal**: PowerShell in VS Code / Cursor

---

## Git Workflow
```
main          ← protected, auto-deploys to Vercel
dev           ← integration branch, merge here daily
feat/a-*      ← Person A's branches (frontend + AI)
feat/b-*      ← Person B's branches (backend + Playwright)
```
- Always branch from `dev`, PR back to `dev`
- Only `dev` → `main` at end of each day
- Commit format: `feat:`, `fix:`, `chore:`, `wip:`

---

## Environment Variables Needed
```env
DATABASE_URL=postgresql://...        # Railway Postgres (Person B)
REDIS_URL=redis://...                # Railway Redis (Person B)
NEXTAUTH_SECRET=                     # openssl rand -base64 32 (Person B)
NEXTAUTH_URL=http://localhost:3000   # Person A
GOOGLE_CLIENT_ID=                    # Google Cloud Console (Person B)
GOOGLE_CLIENT_SECRET=                # Google Cloud Console (Person B)
AES_ENCRYPTION_KEY=                  # openssl rand -hex 32 (Person B)
DISCORD_WEBHOOK_URL=                 # Discord server settings (Person B)
OPENCLAW_API_KEY=                    # MiniMax platform (Person A)
MINIMAX_MODEL=MiniMax-Text-01        # Person A
WORKER_SECRET=                       # openssl rand -hex 20 (Person B)
```
Never commit `.env.local` to git.

---

## Folder Structure (target)
```
outarc/                          ← repo root
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx       ← sidebar nav
│   │   │   ├── page.tsx         ← dashboard home
│   │   │   ├── profile/page.tsx
│   │   │   ├── filters/page.tsx
│   │   │   └── history/page.tsx
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── profile/route.ts
│   │       ├── resume/route.ts
│   │       ├── handshake-creds/route.ts
│   │       ├── filters/route.ts
│   │       └── jobs/
│   │           ├── trigger/route.ts
│   │           └── status/route.ts
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── queue.ts
│   │   └── encrypt.ts
│   └── middleware.ts
├── worker/
│   ├── index.ts
│   ├── tailor.ts
│   ├── handshake-auth.ts
│   ├── handshake-scrape.ts
│   ├── handshake-apply.ts
│   └── notify.ts
├── openclaw-skills/
│   └── tailor.skill.md
├── prisma/
│   └── schema.prisma
├── AGENTS.md                    ← Cursor AI context (already written)
├── .env.local                   ← never commit
└── openclaw.json
```

---

## Prisma Schema (target)
```prisma
model User {
  id                  String    @id @default(cuid())
  email               String    @unique
  name                String?
  major               String?
  gradYear            Int?
  linkedin            String?
  github              String?
  handshakeCredEnc    String?
  createdAt           DateTime  @default(now())
  resumes             Resume[]
  filters             JobFilter[]
  applications        Application[]
  // NextAuth fields
  accounts            Account[]
  sessions            Session[]
}

model Resume {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  filename    String
  url         String
  parsedText  String?
  isActive    Boolean  @default(true)
  uploadedAt  DateTime @default(now())
}

model JobFilter {
  id               String   @id @default(cuid())
  userId           String
  user             User     @relation(fields: [userId], references: [id])
  keywords         String[]
  excludeCompanies String[]
  roles            String[]
  maxPerDay        Int      @default(10)
  isActive         Boolean  @default(true)
}

model Application {
  id                  String    @id @default(cuid())
  userId              String
  user                User      @relation(fields: [userId], references: [id])
  jobTitle            String
  company             String
  handshakeUrl        String
  coverLetterUsed     String
  resumeBulletsUsed   Json?
  status              String    @default("QUEUED") // QUEUED | APPLIED | FAILED
  failureReason       String?
  appliedAt           DateTime?
  createdAt           DateTime  @default(now())
}
```

---

## AGENTS.md Content (already in repo)
```markdown
<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in node_modules/next/dist/docs/ before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# OutARC — Agent Context

## What this project is
OutARC is a full-stack web app that automatically applies to internships on Handshake for UW–Madison students. It tailors the resume and cover letter per job using an OpenClaw AI agent, then submits via Playwright browser automation.

## Tech stack
- Framework: Next.js 14 App Router + TypeScript
- UI: Tailwind CSS + shadcn/ui (Radix, Nova preset)
- Auth: NextAuth.js with Google OAuth (@wisc.edu only)
- Database: PostgreSQL via Prisma ORM
- Queue: BullMQ + Redis
- AI Agent: OpenClaw with MiniMax-M1 model
- Automation: Playwright (Chromium, headed mode)
- Notifications: Discord webhook
- Deploy: Vercel (frontend) + Railway (Postgres, Redis, worker)

## Key conventions
- All dashboard routes protected via src/middleware.ts
- Only @wisc.edu Google accounts can log in
- Handshake passwords AES-256-GCM encrypted before storing
- Never log credentials, session tokens, or decrypted passwords
- API routes validate input with Zod before touching DB
- Worker runs as separate process — never import worker code into Next.js pages
```

---

## Day 1 Plan — Person A Tasks
Once Day 0 is fully done, Person A starts these on a branch `feat/a-auth`:

1. **NextAuth setup** — `src/app/api/auth/[...nextauth]/route.ts`
2. **@wisc.edu guard** — in signIn callback
3. **Login page** — `src/app/(auth)/login/page.tsx`
4. **Middleware** — `src/middleware.ts` protecting `/dashboard/*`
5. **Dashboard shell** — sidebar layout with nav links
6. **Profile page** — form with resume upload
7. **Filters page** — keyword tags, exclude companies
8. **History page** — applications table
9. **API routes** — `/api/profile`, `/api/resume`, `/api/filters`

Person B starts on `feat/b-prisma`:
1. Prisma init + full schema
2. Railway Postgres migration
3. BullMQ queue scaffold
4. AES encryption utility
5. Worker entry file stub
6. OpenClaw config

---

## Important Decisions Made
- **Name**: OutARC (Apply · Resume · Cover letter)
- **GitHub org**: `getoutarc` (OutARC was taken)
- **Model**: MiniMax-M1 via OpenClaw
- **No React Compiler** — too experimental for a 3-day build
- **Sonner** instead of toast (toast is deprecated in new shadcn)
- **Headed Playwright** (not headless) — anti-detection
- **Max 5 applications/hour** — rate limit to avoid Handshake blocks
- **AES-256-GCM** for Handshake credential encryption
- **BullMQ retry**: 3 attempts, exponential backoff
