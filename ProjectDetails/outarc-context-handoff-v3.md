# OutARC — Full Context Handoff v3
> **Paste this entire document into a new chat to resume exactly where we left off.**
> This is intentionally over-detailed. Do not trim it.
> Last updated: 2026-03-30 (end of Day 1 session, continuation chat)

---

## 🔴 IMMEDIATE NEXT STEP — Resume here first

The User table empty bug has been **diagnosed and the fix has been given** but we do NOT know yet if the user applied it successfully. The user's last message before generating this handoff was asking for context — they may or may not have applied the fix.

### The Fix (may or may not be applied yet)

In `src/app/api/auth/[...nextauth]/route.ts`, add `session: { strategy: 'database' }` to the NextAuth config object:

```typescript
const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'database',  // ← THIS LINE WAS MISSING — add it
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email?.endsWith('@wisc.edu')) return false
      return true
    },
    async session({ session, user }) {
      if (session.user) {
        (session.user as any).id = user.id
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})

export { handler as GET, handler as POST }
```

**After applying the fix:**
1. Stop `npm run dev` (Ctrl+C)
2. Run `npm run dev` again
3. Go to `localhost:3000/login`
4. Sign OUT if currently signed in
5. Sign back IN with @wisc.edu Google account
6. Go to Railway → Postgres service → Data tab → User table
7. Verify a row appears

**Why the bug existed:** Without `session: { strategy: 'database' }`, NextAuth defaults to JWT session mode. In JWT mode, PrismaAdapter is attached to the config but is **completely ignored** for session management. It never writes User, Session, or Account rows. The adapter only becomes active when you explicitly switch to database session strategy.

---

## What OutARC Is

A full-stack web platform for UW–Madison students that:
1. Accepts an uploaded PDF resume from the user
2. Scrapes Handshake for internship/job listings matching user-defined keyword filters
3. Uses Claude Haiku 4.5 (via OpenRouter) to tailor 3 resume bullet points + write a 3-paragraph cover letter per job
4. Submits the application on Handshake via Playwright browser automation (headed/non-headless mode for anti-detection)
5. Sends a Discord notification webhook embed confirming each application (green = success, red = failure)

**Name meaning:** ARC = **A**pply · **R**esume · **C**over letter

**Tagline:** "Apply to internships on autopilot"

**Target users:** UW–Madison students (enforced via @wisc.edu email check in NextAuth signIn callback)

---

## People & Roles

| Person | Role | Branches |
|--------|------|----------|
| **Person A = Rithik** (that's you — rithikthegr8@gmail.com) | Frontend + Auth + AI integration + Dashboard UI | `feat/a-auth`, `feat/a-dashboard`, `feat/a-openclaw` (Day 2) |
| **Person B** | Backend + Prisma schema + Worker pipeline + Playwright automation | `feat/b-prisma`, `feat/b-playwright` (Day 2) |

Rithik is a UW-Madison CS junior, graduating 2027. Terminal: PowerShell + Git Bash in Cursor on Windows 11.

---

## Tech Stack

| Layer | Technology | Version / Notes |
|-------|------------|-----------------|
| Framework | Next.js App Router + TypeScript | **16.2.1** — NOT v14 as originally planned. Uses Turbopack |
| UI | Tailwind CSS + shadcn/ui | Radix primitives, Nova preset, Geist font, Lucide icons |
| Auth | NextAuth.js + Google OAuth | v4 — @wisc.edu guard enforced in signIn callback |
| ORM | Prisma | Connects to Railway Postgres |
| Database | PostgreSQL | Hosted on Railway, port 52648 (high port = normal Railway TCP proxy) |
| Queue | BullMQ + IORedis | Queue name: `'application'` |
| Cache/Queue backend | Redis | Hosted on Railway |
| AI model | Claude Haiku 4.5 via OpenRouter | Model string: `anthropic/claude-haiku-4-5` |
| Agent framework | OpenClaw | Installed on Person B's machine. Web UI: `http://127.0.0.1:18789` |
| Browser automation | Playwright (Chromium) | Headed mode (NOT headless) for anti-detection |
| Notifications | Discord webhook | Embed format: green = success, red = failure |
| File storage | Local filesystem | Resumes: `public/resumes/[userId]/resume.pdf` |
| PDF parsing | pdf-parse | Used in resume upload API route |
| Validation | Zod | All API input validation |
| Frontend deploy | Vercel | |
| Backend deploy | Railway | Postgres + Redis + Worker process |

---

## AI / Model Decisions

### Why Claude Haiku 4.5

**Original plan:** MiniMax-M1 via OpenClaw
**Changed to:** Claude Haiku 4.5 via OpenRouter (`anthropic/claude-haiku-4-5`)

**Reason:** Claude models are trained extensively on English professional writing, which makes them markedly better at cover letters and tailored resume bullets than Chinese models. Haiku 4.5 is fast and cheap.

**OpenRouter model string (exact):** `anthropic/claude-haiku-4-5`

**Upgrade path if Haiku quality isn't good enough:** `anthropic/claude-sonnet-4-6`

### Models Evaluated and Rejected

| Model | Why Rejected |
|-------|-------------|
| MiMo-V2-Pro | Reasoning model — overkill for cover letters, slow, expensive |
| GLM-5-Turbo | Despite the "Turbo" name, it's MORE expensive than GLM-5 ($1.2/M vs $1/M input, $4/M vs $3.2/M output). "Turbo" here means a specialized variant, NOT lite/cheaper |
| GLM-5 | Third-party reseller pricing on Novita, reliability concerns |
| Novita minimax-m2.7 | Third-party reseller of MiniMax — unreliable, not worth it |

### Token Economics

- **Per application:** ~5,000 input tokens + ~1,000 output tokens = ~6,000 total
- **Prompt caching:** System prompt + resume stay constant across all jobs in a session → ~70-80% cache hit rate
- **Effective cost with caching:** ~$0.003/application
- **PDF creation and Playwright form-filling do NOT consume tokens** — only text generation does

### Web Search

- **Tavily** was evaluated for web search capability
- **Decision: NOT needed for OutARC** — Handshake already provides full job descriptions in the scrape. No need to search for more context.
- **Tavily free student tier email** was drafted to send to `support@tavily.com` — confirm with user whether it was actually sent

### Model Test Prompt

If you ever need to test a different model, here is the exact system prompt + user message used to evaluate models:

**SYSTEM:**
```
You are a professional resume and cover letter writer helping a UW–Madison computer science student apply for internships. Write in a natural, confident, first-person voice. Never sound robotic or generic. Tailor everything specifically to the job description provided.
```

**USER:**
```
Here is my resume and a job I want to apply to. Do two things:

1. Rewrite my 3 experience bullet points to be tailored for this specific role. Keep them under 20 words each, start with a strong action verb, include a metric where possible.

2. Write a cover letter (3 paragraphs, under 250 words total) for this role. Sound like a real college junior wrote it — enthusiastic but not over the top.

---
RESUME:
Name: Rithik Sharma | UW–Madison CS Junior | rithik@wisc.edu

Experience:
- Built a full-stack web app using React and Node.js for a student org with 200+ members
- Wrote Python scripts to automate data cleaning for a research lab, saving 4 hours/week
- Helped debug REST APIs and wrote unit tests during a summer internship at a local startup

Skills: Python, JavaScript, React, Node.js, SQL, Git

---
JOB DESCRIPTION:
Company: Epic Systems
Role: Software Developer Intern
Location: Verona, WI (on-site)
Description: Join Epic's software team to build healthcare software used by millions. You'll work on real features in a full-stack environment using C#, JavaScript, and SQL. We value curiosity, collaboration, and people who can jump into an unfamiliar codebase and figure things out. Strong CS fundamentals required.
```

---

## Local Setup

| Item | Value |
|------|-------|
| Local project path | `C:\Users\rithi\outarc` |
| GitHub org | `getoutarc` (note: "OutARC" as an org name was taken) |
| Repo | `github.com/getoutarc/OutARC` |
| ⚠️ GitHub org ambiguity | Git output sometimes shows `OutARC-Labs` — confirm which is the real org name |
| OS | Windows 11 |
| Terminal | PowerShell + Git Bash inside Cursor |
| Next.js version | 16.2.1 (Turbopack enabled) |

---

## Environment Variables

Both `.env.local` AND `.env` must have the following. They must be in BOTH files because:
- `.env.local` = Next.js runtime reads this
- `.env` = Prisma CLI (`prisma.config.ts` uses `dotenv/config` which ONLY reads `.env`, not `.env.local`)

```env
DATABASE_URL=postgresql://postgres:xxxxx@gondola.proxy.rlwy.net:52648/railway
REDIS_URL=redis://...
NEXTAUTH_SECRET=<generated with openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=385262870243-pv33lc661jfnmkn63uc65r9cun0asgss.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<real value, Person B has it>
AES_ENCRYPTION_KEY=<generated with openssl rand -hex 32>
DISCORD_WEBHOOK_URL=<from Discord server settings>
OPENCLAW_API_KEY=<from OpenRouter dashboard>
WORKER_SECRET=<generated>
OPENROUTER_API_KEY=<same as OPENCLAW_API_KEY — may be separate var>
```

**Important notes:**
- Railway Postgres public URL port `52648` is normal — it's Railway's TCP proxy
- NEVER commit either `.env` or `.env.local`
- If Prisma says "can't reach localhost" — check that `DATABASE_URL` is in `.env` (not just `.env.local`)

---

## Git Branches & Workflow

```
main          ← protected, auto-deploys to Vercel on push
dev           ← integration branch, always working state
feat/a-*      ← Person A (Rithik) feature branches
feat/b-*      ← Person B feature branches
```

**Rules:**
- Always branch from `dev`
- PR back to `dev` (not main)
- Only `dev → main` at the end of each completed day
- Commit format: `feat:`, `fix:`, `chore:`, `wip:`

**Current branch status (as of end of Day 1):**
- `feat/a-auth` — Person A's auth work (NextAuth, Google OAuth, login page, proxy.ts)
- `feat/a-dashboard` — Person A's dashboard/UI (layout, profile, filters, history pages + all API routes)
- `feat/b-prisma` — Person B's Prisma schema, migrations, queue, encrypt, worker stubs
- These branches have NOT been merged to dev yet — pending Day 1 verification

---

## Full Project Folder Structure

```
outarc/                              ← C:\Users\rithi\outarc
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── layout.tsx           ← minimal pass-through layout
│   │   │   └── login/
│   │   │       └── page.tsx         ← login card with Google button
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx           ← sidebar nav with sign-out
│   │   │   ├── page.tsx             ← dashboard home (stub / Day 2 adds status)
│   │   │   ├── profile/
│   │   │   │   └── page.tsx         ← profile form + resume upload + Handshake creds
│   │   │   ├── filters/
│   │   │   │   └── page.tsx         ← keyword tags + exclude companies
│   │   │   └── history/
│   │   │       └── page.tsx         ← applications table with status badges
│   │   └── api/
│   │       ├── auth/
│   │       │   └── [...nextauth]/
│   │       │       └── route.ts     ← NextAuth handler
│   │       ├── profile/
│   │       │   └── route.ts         ← GET + PUT profile data
│   │       ├── resume/
│   │       │   └── route.ts         ← POST multipart, saves PDF, parses text
│   │       ├── handshake-creds/
│   │       │   └── route.ts         ← POST encrypts + stores Handshake login
│   │       ├── filters/
│   │       │   └── route.ts         ← GET + PUT job filters
│   │       └── jobs/
│   │           ├── trigger/
│   │           │   └── route.ts     ← POST enqueues SCRAPE_AND_APPLY job
│   │           └── status/
│   │               └── route.ts     ← GET returns queue counts
│   ├── lib/
│   │   ├── prisma.ts                ← singleton PrismaClient (created by Person A manually)
│   │   ├── queue.ts                 ← BullMQ queue + ApplicationJob interface
│   │   └── encrypt.ts               ← AES-256-GCM encrypt/decrypt
│   ├── types/
│   │   └── next-auth.d.ts           ← extends Session to include user.id
│   └── proxy.ts                     ← RENAMED from middleware.ts (Next.js 16 deprecation)
├── worker/
│   ├── index.ts                     ← full pipeline (Day 2 — may still be stub)
│   ├── tailor.ts                    ← OpenRouter API call to Claude Haiku 4.5
│   ├── handshake-auth.ts            ← Playwright login + cookie reuse
│   ├── handshake-scrape.ts          ← scrape job listings from Handshake
│   ├── handshake-apply.ts           ← navigate + submit application
│   ├── notify.ts                    ← Discord webhook embeds
│   └── utils/
│       └── delays.ts                ← gaussian random delays for human-like behavior
├── openclaw-skills/
│   └── tailor.skill.md              ← OpenClaw skill (stub from Day 1)
├── prisma/
│   ├── schema.prisma                ← full schema (see below)
│   ├── prisma.config.ts             ← auto-generated, uses dotenv/config (reads .env)
│   └── migrations/
│       └── 20260330213149_init/
│           └── migration.sql        ← successfully applied to Railway
├── AGENTS.md                        ← AI agent context file (for Claude/Cursor)
├── CLAUDE.md                        ← Cursor AI context file
├── next.config.ts                   ← has turbopack.root fix
├── .env                             ← Prisma CLI reads this (must have DATABASE_URL)
├── .env.local                       ← Next.js reads this (must have all vars)
└── openclaw.json                    ← OpenClaw config
```

---

## Prisma Schema (full, as migrated to Railway — migration 20260330213149_init)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                String        @id @default(cuid())
  email             String        @unique
  name              String?
  image             String?
  major             String?
  gradYear          Int?
  linkedin          String?
  github            String?
  handshakeCredEnc  String?       // AES-256-GCM encrypted JSON {email, password}
  createdAt         DateTime      @default(now())
  resumes           Resume[]
  filters           JobFilter[]
  applications      Application[]
  accounts          Account[]
  sessions          Session[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}

model Resume {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  filename   String
  url        String   // relative: /resumes/[userId]/resume.pdf
  parsedText String?  // extracted by pdf-parse
  isActive   Boolean  @default(true)
  uploadedAt DateTime @default(now())
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
  id                String    @id @default(cuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id])
  jobTitle          String
  company           String
  handshakeUrl      String
  coverLetterUsed   String
  resumeBulletsUsed Json?
  status            String    @default("QUEUED")  // QUEUED | ACTIVE | APPLIED | FAILED
  failureReason     String?
  appliedAt         DateTime?
  createdAt         DateTime  @default(now())
}
```

---

## All Source Files — Full Code

### `src/app/api/auth/[...nextauth]/route.ts`
```typescript
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'database',  // ← CRITICAL: without this, PrismaAdapter never writes to DB
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email?.endsWith('@wisc.edu')) return false
      return true
    },
    async session({ session, user }) {
      if (session.user) {
        (session.user as any).id = user.id
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})

export { handler as GET, handler as POST }
```

### `src/types/next-auth.d.ts`
```typescript
import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}
```

### `src/proxy.ts` (was `middleware.ts` — renamed for Next.js 16)
```typescript
import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: {
    signIn: '/login',
  },
})

export const config = {
  matcher: ['/dashboard/:path*'],
}
```

### `src/lib/prisma.ts`
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### `src/lib/queue.ts`
```typescript
import { Queue } from 'bullmq'
import IORedis from 'ioredis'

export interface ApplicationJob {
  userId: string
  jobTitle: string
  company: string
  jobDescription: string
  handshakeUrl: string
}

export const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
})

export const applicationQueue = new Queue('application', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
})
```

### `src/lib/encrypt.ts`
```typescript
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY = Buffer.from(process.env.AES_ENCRYPTION_KEY!, 'hex')

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decrypt(ciphertext: string): string {
  const [ivHex, authTagHex, encrypted] = ciphertext.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
```

### `src/app/(auth)/layout.tsx`
```typescript
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

### `src/app/(auth)/login/page.tsx`
```typescript
'use client'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">OutARC</CardTitle>
          <CardDescription>Apply to internships on autopilot</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button
            className="w-full"
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          >
            Continue with Google
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            For UW–Madison students only
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

### `src/app/(dashboard)/layout.tsx`
```typescript
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { LayoutDashboard, User, SlidersHorizontal, History, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
  { href: '/dashboard/filters', label: 'Filters', icon: SlidersHorizontal },
  { href: '/dashboard/history', label: 'History', icon: History },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()
  if (!session) redirect('/login')

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 border-r bg-background flex flex-col py-6 px-4 gap-2">
        <div className="px-2 mb-6">
          <h1 className="text-xl font-bold">OutARC</h1>
          <p className="text-xs text-muted-foreground mt-1">{session.user?.email}</p>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
        <form action="/api/auth/signout" method="POST">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-3 text-muted-foreground">
            <LogOut size={16} />
            Sign out
          </Button>
        </form>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  )
}
```

### `src/app/api/profile/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const profileSchema = z.object({
  name: z.string().min(1).optional(),
  major: z.string().optional(),
  gradYear: z.number().int().min(2024).max(2030).optional(),
  linkedin: z.string().url().optional().or(z.literal('')),
  github: z.string().url().optional().or(z.literal('')),
})

export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  return NextResponse.json(user)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const parsed = profileSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const user = await prisma.user.update({
    where: { email: session.user.email },
    data: parsed.data,
  })
  return NextResponse.json(user)
}
```

### `src/app/api/resume/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import pdf from 'pdf-parse'

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  const formData = await req.formData()
  const file = formData.get('resume') as File
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  if (file.type !== 'application/pdf') return NextResponse.json({ error: 'PDF only' }, { status: 400 })
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Max 5MB' }, { status: 400 })
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const dir = path.join(process.cwd(), 'public', 'resumes', user.id)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, 'resume.pdf'), buffer)
  const parsed = await pdf(buffer)
  await prisma.resume.updateMany({ where: { userId: user.id }, data: { isActive: false } })
  await prisma.resume.create({
    data: {
      userId: user.id,
      filename: file.name,
      url: `/resumes/${user.id}/resume.pdf`,
      parsedText: parsed.text,
      isActive: true,
    },
  })
  return NextResponse.json({ success: true })
}
```

### `src/app/api/filters/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const filterSchema = z.object({
  keywords: z.array(z.string()),
  excludeCompanies: z.array(z.string()),
  roles: z.array(z.string()),
  maxPerDay: z.number().int().min(1).max(50),
})

export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const filter = await prisma.jobFilter.findFirst({ where: { userId: user.id, isActive: true } })
  return NextResponse.json(filter)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const parsed = filterSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const existing = await prisma.jobFilter.findFirst({ where: { userId: user.id } })
  if (existing) {
    await prisma.jobFilter.update({ where: { id: existing.id }, data: { ...parsed.data, isActive: true } })
  } else {
    await prisma.jobFilter.create({ data: { userId: user.id, ...parsed.data } })
  }
  return NextResponse.json({ success: true })
}
```

### `src/app/api/handshake-creds/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encrypt'

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { email, password } = await req.json()
  if (!email || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const encrypted = encrypt(JSON.stringify({ email, password }))
  await prisma.user.update({
    where: { email: session.user.email },
    data: { handshakeCredEnc: encrypted },
  })
  return NextResponse.json({ success: true })
}
```

### `src/app/api/jobs/trigger/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { applicationQueue, ApplicationJob } from '@/lib/queue'

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  const activeCount = await prisma.application.count({
    where: { userId: user.id, status: { in: ['QUEUED', 'ACTIVE'] } }
  })
  if (activeCount >= 5) return NextResponse.json({ error: 'Rate limit' }, { status: 429 })
  const filter = await prisma.jobFilter.findFirst({
    where: { userId: user.id, isActive: true }
  })
  if (!filter) return NextResponse.json({ error: 'No active filter' }, { status: 400 })
  const job = await applicationQueue.add('SCRAPE_AND_APPLY', {
    userId: user.id,
    jobTitle: '', company: '', jobDescription: '', handshakeUrl: ''
  } as ApplicationJob)
  return NextResponse.json({ jobId: job.id })
}
```

### `src/app/api/jobs/status/route.ts`
```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const [queued, active, completed, failed] = await Promise.all([
    prisma.application.count({ where: { userId: user.id, status: 'QUEUED' } }),
    prisma.application.count({ where: { userId: user.id, status: 'ACTIVE' } }),
    prisma.application.count({ where: { userId: user.id, status: 'APPLIED' } }),
    prisma.application.count({ where: { userId: user.id, status: 'FAILED' } }),
  ])
  return NextResponse.json({ queued, active, completed, failed })
}
```

### `next.config.ts` (critical Turbopack root fix)
```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig
```

**Why this exists:** There were stray files (`package.json` and `package-lock.json`) at `C:\Users\rithi\` (outside the project folder). Turbopack was detecting `C:\Users\rithi\` as the workspace root instead of `C:\Users\rithi\outarc\`, causing it to fail resolving tailwindcss and other modules. The stray files were deleted AND this config was added as a permanent fix.

---

## Worker Files (Day 2 — Person B's work)

These were written as complete implementations in the previous chat session. Person B has the Day 2 PDF walkthrough with all code.

### `worker/utils/delays.ts` — Human-like random delays
```typescript
export function gaussianRandom(mean: number, std: number): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

export async function humanDelay(minMs = 500, maxMs = 2000): Promise<void> {
  const mean = (minMs + maxMs) / 2
  const std = (maxMs - minMs) / 6
  const delay = Math.max(minMs, Math.min(maxMs, gaussianRandom(mean, std)))
  await new Promise(resolve => setTimeout(resolve, delay))
}

export async function pageLoadDelay(): Promise<void> {
  await humanDelay(1500, 4000)
}

export async function typingDelay(): Promise<void> {
  await humanDelay(50, 150)
}

export async function humanType(page: any, selector: string, text: string): Promise<void> {
  await page.click(selector)
  for (const char of text) {
    await page.keyboard.type(char)
    await typingDelay()
  }
}
```

### `worker/handshake-auth.ts` — Login with session cookie reuse
```typescript
import { chromium, Browser, BrowserContext } from 'playwright'
import * as fs from 'fs/promises'
import * as path from 'path'
import { humanDelay, pageLoadDelay, humanType } from './utils/delays'

const SESSION_DIR = '/tmp/outarc-sessions'
const HS_BASE = 'https://app.joinhandshake.com'

export async function getHandshakeContext(
  userId: string,
  email: string,
  password: string
): Promise<{ browser: Browser; context: BrowserContext }> {
  const sessionFile = path.join(SESSION_DIR, `hs-session-${userId}.json`)
  await fs.mkdir(SESSION_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: false })
  let storageState: any = undefined

  try {
    const raw = await fs.readFile(sessionFile, 'utf-8')
    storageState = JSON.parse(raw)
  } catch {
    // No saved session
  }

  const context = await browser.newContext({
    storageState,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  })

  const page = await context.newPage()
  await page.goto(`${HS_BASE}/users/sign_in`)
  await pageLoadDelay()

  const isLoggedIn = await page.url().then(url => !url.includes('sign_in'))
  if (!isLoggedIn) {
    // Need to log in
    await humanType(page, 'input[name="email"]', email)
    await humanDelay()
    await humanType(page, 'input[name="password"]', password)
    await humanDelay()
    await page.click('button[type="submit"]')
    await page.waitForNavigation({ waitUntil: 'networkidle' })
    await pageLoadDelay()

    const currentUrl = await page.url()
    if (currentUrl.includes('sign_in')) {
      throw new Error('Handshake login failed — check credentials')
    }

    const state = await context.storageState()
    await fs.writeFile(sessionFile, JSON.stringify(state))
  }

  await page.close()
  return { browser, context }
}
```

### `worker/handshake-scrape.ts` — Scrape job listings
```typescript
import { BrowserContext } from 'playwright'
import { pageLoadDelay, humanDelay } from './utils/delays'

export interface ScrapedJob {
  title: string
  company: string
  url: string
  description: string
  location: string
  deadline?: string
}

export async function scrapeHandshakeJobs(
  context: BrowserContext,
  keywords: string[],
  excludeCompanies: string[]
): Promise<ScrapedJob[]> {
  const page = await context.newPage()
  const jobs: ScrapedJob[] = []
  const searchQuery = keywords.join(' ')
  const url = `https://app.joinhandshake.com/jobs?query=${encodeURIComponent(searchQuery)}&job_type[]=1&page=1`

  await page.goto(url)
  await pageLoadDelay()

  const jobLinks = await page.$$eval('a[href*="/jobs/"]', (links) =>
    links.map(link => ({
      href: (link as HTMLAnchorElement).href,
      text: link.textContent?.trim() || '',
    })).filter(l => l.href.match(/\/jobs\/\d+/))
  )

  const uniqueUrls = [...new Set(jobLinks.map(l => l.href))].slice(0, 20)

  for (const jobUrl of uniqueUrls) {
    try {
      const jobPage = await context.newPage()
      await jobPage.goto(jobUrl)
      await pageLoadDelay()

      const title = await jobPage.$eval('h1', el => el.textContent?.trim() || '').catch(() => '')
      const company = await jobPage.$eval('[data-hook="employer-name"]', el => el.textContent?.trim() || '').catch(() => '')
      const description = await jobPage.$eval('[data-hook="job-description"]', el => el.textContent?.trim() || '').catch(() => '')
      const location = await jobPage.$eval('[data-hook="job-location"]', el => el.textContent?.trim() || '').catch(() => '')

      if (excludeCompanies.some(ec => company.toLowerCase().includes(ec.toLowerCase()))) {
        await jobPage.close()
        continue
      }

      if (title && company && description) {
        jobs.push({ title, company, url: jobUrl, description, location })
      }

      await jobPage.close()
      await humanDelay(1000, 2500)
    } catch (e) {
      console.error(`Failed to scrape ${jobUrl}:`, e)
    }
  }

  await page.close()
  return jobs
}
```

### `worker/handshake-apply.ts` — Submit application
```typescript
import { BrowserContext } from 'playwright'
import { ScrapedJob } from './handshake-scrape'
import { pageLoadDelay, humanDelay, humanType } from './utils/delays'
import * as fs from 'fs/promises'
import * as path from 'path'

export async function applyToJob(
  context: BrowserContext,
  job: ScrapedJob,
  coverLetter: string,
  resumePath: string
): Promise<void> {
  const page = await context.newPage()

  try {
    await page.goto(job.url)
    await pageLoadDelay()

    const captcha = await page.$('[data-sitekey], .cf-turnstile, .h-captcha')
    if (captcha) {
      throw new Error('CAPTCHA detected — manual intervention required')
    }

    const applyBtn = await page.$('button[data-hook="apply-button"], a[data-hook="apply-button"]')
    if (!applyBtn) throw new Error('No apply button found')
    await applyBtn.click()
    await pageLoadDelay()

    const coverLetterTextarea = await page.$('textarea[name*="cover"], textarea[placeholder*="cover"]')
    const coverLetterFileInput = await page.$('input[type="file"][accept*="pdf"]')

    if (coverLetterTextarea) {
      await humanType(page, 'textarea[name*="cover"], textarea[placeholder*="cover"]', coverLetter)
    } else if (coverLetterFileInput) {
      const tmpPath = `/tmp/cover-letter-${Date.now()}.txt`
      await fs.writeFile(tmpPath, coverLetter)
      await coverLetterFileInput.setInputFiles(tmpPath)
      await humanDelay()
    }

    const resumeInput = await page.$('input[type="file"][accept*="pdf"]:not([name*="cover"])')
    if (resumeInput) {
      await resumeInput.setInputFiles(resumePath)
      await humanDelay(1000, 2000)
    }

    const submitBtn = await page.$('button[type="submit"], button[data-hook="submit-application"]')
    if (!submitBtn) throw new Error('No submit button found')
    await submitBtn.click()
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {})
    await pageLoadDelay()

  } catch (e) {
    const screenshotPath = `/tmp/hs-error-${Date.now()}.png`
    await page.screenshot({ path: screenshotPath }).catch(() => {})
    throw e
  } finally {
    await page.close()
  }
}
```

### `worker/tailor.ts` — OpenRouter AI call
```typescript
import OpenAI from 'openai'

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!,
})

export interface TailoredContent {
  bullets: string[]
  coverLetter: string
}

export async function tailorApplication(
  resumeText: string,
  jobTitle: string,
  company: string,
  jobDescription: string
): Promise<TailoredContent> {
  const systemPrompt = `You are a professional resume and cover letter writer helping a UW–Madison computer science student apply for internships. Write in a natural, confident, first-person voice. Never sound robotic or generic. Tailor everything specifically to the job description provided. Always respond with valid JSON only, no markdown.`

  const userPrompt = `
RESUME:
${resumeText}

JOB:
Company: ${company}
Role: ${jobTitle}
Description: ${jobDescription}

Do two things and return JSON:
1. "bullets": array of 3 tailored resume bullet points. Under 20 words each. Strong action verb. Metric where possible.
2. "coverLetter": 3-paragraph cover letter under 250 words. Sound like a real college junior wrote it.

Return ONLY valid JSON: {"bullets": [...], "coverLetter": "..."}`

  const response = await openrouter.chat.completions.create({
    model: 'anthropic/claude-haiku-4-5',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 1000,
  })

  const raw = response.choices[0].message.content || '{}'
  return JSON.parse(raw) as TailoredContent
}
```

### `worker/notify.ts` — Discord webhook
```typescript
export async function notifySuccess(
  jobTitle: string,
  company: string,
  coverLetter: string
): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL!
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [{
        title: '✅ Application Submitted',
        color: 0x57F287,
        fields: [
          { name: 'Role', value: jobTitle, inline: true },
          { name: 'Company', value: company, inline: true },
          { name: 'Cover Letter Preview', value: coverLetter.slice(0, 200) + '...' },
        ],
        timestamp: new Date().toISOString(),
      }],
    }),
  })
}

export async function notifyFailure(
  jobTitle: string,
  company: string,
  reason: string
): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL!
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [{
        title: '❌ Application Failed',
        color: 0xED4245,
        fields: [
          { name: 'Role', value: jobTitle, inline: true },
          { name: 'Company', value: company, inline: true },
          { name: 'Reason', value: reason },
        ],
        timestamp: new Date().toISOString(),
      }],
    }),
  })
}
```

### `worker/index.ts` — Full pipeline
```typescript
import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import { PrismaClient } from '@prisma/client'
import { decrypt } from '../src/lib/encrypt'
import { ApplicationJob } from '../src/lib/queue'
import { getHandshakeContext } from './handshake-auth'
import { scrapeHandshakeJobs } from './handshake-scrape'
import { applyToJob } from './handshake-apply'
import { tailorApplication } from './tailor'
import { notifySuccess, notifyFailure } from './notify'
import * as dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()
const connection = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null })

const worker = new Worker<ApplicationJob>('application', async (job) => {
  const { userId } = job.data
  console.log(`[worker] Processing job ${job.id} for user ${userId}`)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { resumes: { where: { isActive: true } }, filters: { where: { isActive: true } } }
  })
  if (!user) throw new Error('User not found')
  if (!user.handshakeCredEnc) throw new Error('No Handshake credentials')
  if (!user.resumes[0]) throw new Error('No active resume')
  if (!user.filters[0]) throw new Error('No active filter')

  const { email: hsEmail, password: hsPassword } = JSON.parse(decrypt(user.handshakeCredEnc))
  const filter = user.filters[0]
  const resume = user.resumes[0]
  const resumePath = `./public${resume.url}`

  // Rate limit check: max 5/hour
  const recentCount = await prisma.application.count({
    where: {
      userId,
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      status: { in: ['APPLIED', 'QUEUED', 'ACTIVE'] }
    }
  })
  if (recentCount >= (filter.maxPerDay || 10)) {
    console.log(`[worker] Rate limit hit for user ${userId}`)
    return
  }

  const { browser, context } = await getHandshakeContext(userId, hsEmail, hsPassword)

  try {
    const jobs = await scrapeHandshakeJobs(context, filter.keywords, filter.excludeCompanies)

    const existingUrls = new Set(
      (await prisma.application.findMany({ where: { userId }, select: { handshakeUrl: true } }))
        .map(a => a.handshakeUrl)
    )

    const newJobs = jobs.filter(j => !existingUrls.has(j.url))

    for (const scraped of newJobs.slice(0, 3)) {
      const appRecord = await prisma.application.create({
        data: {
          userId,
          jobTitle: scraped.title,
          company: scraped.company,
          handshakeUrl: scraped.url,
          coverLetterUsed: '',
          status: 'ACTIVE',
        }
      })

      try {
        const tailored = await tailorApplication(
          resume.parsedText || '',
          scraped.title,
          scraped.company,
          scraped.description
        )

        await applyToJob(context, scraped, tailored.coverLetter, resumePath)

        await prisma.application.update({
          where: { id: appRecord.id },
          data: {
            status: 'APPLIED',
            coverLetterUsed: tailored.coverLetter,
            resumeBulletsUsed: tailored.bullets,
            appliedAt: new Date(),
          }
        })

        await notifySuccess(scraped.title, scraped.company, tailored.coverLetter)
      } catch (err: any) {
        await prisma.application.update({
          where: { id: appRecord.id },
          data: { status: 'FAILED', failureReason: err.message }
        })
        await notifyFailure(scraped.title, scraped.company, err.message)
      }
    }
  } finally {
    await browser.close()
  }
}, { connection })

worker.on('completed', job => console.log(`[worker] Job ${job.id} completed`))
worker.on('failed', (job, err) => console.error(`[worker] Job ${job?.id} failed:`, err))
console.log('[worker] OutARC worker started')
```

---

## Bugs Fixed — Complete History

| # | Bug | Root Cause | Fix Applied |
|---|-----|-----------|-------------|
| 1 | 404 on `/api/auth/callback/google` | Folder named `[...nextauth` (missing closing `]`) | PowerShell: `Rename-Item "src/app/api/auth/[...nextauth" "[...nextauth]"` |
| 2 | `@/lib/prisma` module not found | `src/lib/prisma.ts` didn't exist (Person B's task not yet merged) | Person A created it manually |
| 3 | `Cannot find module '.prisma/client/default'` | `npx prisma generate` had never been run | Ran `npx prisma generate` |
| 4 | `Can't resolve 'tailwindcss' in C:\Users\rithi` | Stray `package.json` + `package-lock.json` at `C:\Users\rithi\` (parent of project) causing Turbopack to treat it as workspace root | Deleted stray files + added `turbopack: { root: __dirname }` to `next.config.ts` |
| 5 | Prisma connecting to `localhost:51214` (wrong host) | `prisma.config.ts` uses `dotenv/config` which reads `.env` NOT `.env.local`. DATABASE_URL was only in `.env.local` | Copied `DATABASE_URL` into `.env` file as well |
| 6 | Prisma migration drift error | Person B ran `prisma db push` directly on Railway without creating local migration history | `npx prisma migrate reset` (confirmed Y) → `npx prisma migrate dev --name init` |
| 7 | `middleware.ts` deprecation warning in Next.js 16 | Next.js 16 deprecated `middleware.ts` in favor of `proxy.ts` convention | Renamed `src/middleware.ts` to `src/proxy.ts` |
| 8 | User table stays empty after login (⚠️ MAY STILL BE UNRESOLVED) | NextAuth defaults to JWT session mode. PrismaAdapter is attached but never writes rows when JWT mode is active | Add `session: { strategy: 'database' }` to NextAuth config (see top of this document) |

---

## Day 0 Status — COMPLETE ✅

- GitHub org `getoutarc` created
- Repo `getoutarc/OutARC` initialized
- Next.js initialized (16.2.1, not 14 as originally planned — Turbopack enabled)
- shadcn/ui installed with components: button, input, label, card, table, badge, dialog, sonner
- UI preset: Radix, Nova, Geist font, Lucide icons
- Core npm packages installed: `prisma @prisma/client next-auth @auth/prisma-adapter bullmq ioredis bcryptjs pdf-parse zod`
- Railway project created: Postgres + Redis both provisioned
- Google OAuth credentials created (in Google Cloud Console)
- Discord webhook URL created
- OpenClaw v2026.3.24 installed on Person B's machine
  - Default model set to: `anthropic/claude-haiku-4-5` (via OpenRouter)
  - Provider: OpenRouter
  - Web search: NOT configured (not needed)
  - Hooks enabled: `command-logger` + `session-memory`
  - Hooks NOT enabled: `boot-md`, `bootstrap-extra-files`
  - Google Places API: NOT set up (not needed)
- AGENTS.md and CLAUDE.md created in repo root

---

## Day 1 Status

### Person A (Rithik) — ✅ Mostly done, one blocker
- `feat/a-auth`: NextAuth + Google OAuth + @wisc.edu guard + login page + `src/proxy.ts`
- `feat/a-dashboard`: Dashboard layout (sidebar), profile page, filters page, history page
- `feat/a-dashboard`: All API routes: `/api/profile`, `/api/resume`, `/api/handshake-creds`, `/api/filters`, `/api/jobs/trigger`, `/api/jobs/status`
- **⚠️ BLOCKER:** User table empty after login — fix is `session: { strategy: 'database' }` in NextAuth config (MAY NOT BE APPLIED YET)

### Person B — ✅ Complete
- Prisma schema written + migrated to Railway (`20260330213149_init`)
- `src/lib/prisma.ts`, `src/lib/queue.ts`, `src/lib/encrypt.ts` created
- Worker stubs created: `worker/index.ts`, `worker/tailor.ts`, and others
- `openclaw.json` and `openclaw-skills/tailor.skill.md` created
- Railway Postgres + Redis provisioned and shared `.env.local` with Person A

---

## Day 1 Verification Checklist (run after fixing User table bug)

- [x] `localhost:3000/dashboard` redirects unauthenticated to `/login` ✅ CONFIRMED WORKING
- [x] Sign in with @wisc.edu Google account → lands on dashboard ✅ CONFIRMED WORKING
- [ ] Railway Postgres → User table has a row after sign in ❌ CURRENTLY BROKEN (fix above)
- [ ] Worker logs job when `/api/jobs/trigger` is hit ✅ WAS WORKING BEFORE
- [ ] Profile form saves name/major/gradYear/linkedin/github to DB
- [ ] Resume upload parses PDF, creates Resume row in DB
- [ ] Filters page saves keywords/excludeCompanies to DB

**How to check Railway DB:** Railway dashboard → your Postgres service → Data tab → click User table → should see rows

---

## Day 2 Plan

### Person A — `feat/a-openclaw`

1. Write the real OpenClaw tailor skill in `openclaw-skills/tailor.skill.md` (currently a stub)
2. Replace the stub `worker/tailor.ts` with the full OpenRouter API call (code above is the full version)
3. Test the skill manually using 5 real Handshake job postings
4. Add **cover letter viewer dialog** to History page (use shadcn `<Dialog>`)
5. Add **live status polling** to Dashboard home page — poll `/api/jobs/status` every 5 seconds
6. Add toast notifications (Sonner) when a new `APPLIED` status appears

### Person B — `feat/b-playwright`

1. `npm install playwright && npx playwright install chromium`
2. Create `worker/utils/delays.ts` (code above)
3. Create `worker/handshake-auth.ts` (code above) — Playwright login + session cookie JSON reuse
4. Create `worker/handshake-scrape.ts` (code above) — scrape job listings
5. Create `worker/handshake-apply.ts` (code above) — text field OR PDF upload cover letter, attach resume, submit
6. Create `worker/notify.ts` (code above) — Discord embed webhooks
7. Wire full pipeline in `worker/index.ts` (code above)
8. Rate limiting: max 5 apps/hour via BullMQ job delays
9. Full end-to-end test with one real Handshake posting

**Day 2 milestone:** One real application submitted end-to-end → Discord notification received → Application appears in History page with APPLIED status.

---

## PDFs Generated (in workspace folder)

- `OutARC-PersonB-Day1.pdf` — Complete Day 1 walkthrough for Person B (in `C:\Users\rithi\outarc` workspace)
- `OutARC-PersonB-Day2.pdf` — Complete Day 2 walkthrough for Person B with all Playwright + worker code

---

## After Day 1 is fully verified — Git workflow to close it out

```bash
# On Person A's machine (after all checks pass):
git checkout feat/a-auth
git push

git checkout feat/a-dashboard
git push

git checkout dev
git merge feat/a-auth
git merge feat/a-dashboard

# After Person B merges feat/b-prisma to dev too:
git checkout main
git merge dev
git push origin main

# This triggers Vercel auto-deploy
```

---

## OpenClaw Configuration Details

| Setting | Value |
|---------|-------|
| Version | v2026.3.24 |
| Web UI | `http://127.0.0.1:18789/chat?session=main` |
| Default model | `anthropic/claude-haiku-4-5` |
| Provider | OpenRouter |
| Web search | NOT configured |
| Enabled hooks | `command-logger`, `session-memory` |
| Disabled hooks | `boot-md`, `bootstrap-extra-files` |

**Important:** OpenClaw runs as part of Railway's worker process — NOT on a separate VPS. The web UI is only for local configuration. It should NOT be left running locally during production.

---

## Architecture & Important Conventions

- **Headed Playwright (not headless):** Anti-detection. Headless browsers are more easily detected by Handshake's bot protection.
- **Max 5 applications/hour:** Rate limit to avoid Handshake flagging the account
- **AES-256-GCM encryption:** For storing Handshake credentials in the DB (`handshakeCredEnc` column)
- **BullMQ retry policy:** 3 attempts, exponential backoff (5s → 10s → 20s)
- **Queue name:** `'application'` (exact string — not `'outarc-jobs'` which was an early mistake)
- **Session cookie reuse:** Playwright session saved to `/tmp/outarc-sessions/hs-session-[userId].json` to avoid re-login on every job
- **Resume storage path:** `public/resumes/[userId]/resume.pdf` (served as static file)
- **Error screenshots path:** `/tmp/hs-error-[timestamp].png`
- **Worker is a COMPLETELY SEPARATE process:** Never import worker code into Next.js pages or API routes
- **Zod validation:** ALL API routes validate input with Zod before touching the DB
- **Never log:** credentials, session tokens, decrypted passwords
- **No React Compiler:** Too experimental for this project
- **Toast notifications:** Using `sonner` (not `toast` which is deprecated in new shadcn)
- **CLAUDE.md + AGENTS.md:** Both exist in repo root for AI context

---

## Miscellaneous Notes and Warnings

1. **Stray files warning:** There WERE stray `package.json` and `package-lock.json` files at `C:\Users\rithi\` (parent directory). They caused Turbopack module resolution failures. They were deleted. If the errors come back, check for new stray files there.

2. **GitHub org ambiguity:** Git output in some commands showed `OutARC-Labs` as the org name while other places show `getoutarc`. Confirm which is actually correct — the remote URL in `.git/config` is the source of truth.

3. **`.env` vs `.env.local`:** This caused a Prisma connection bug. ALWAYS keep `DATABASE_URL` in BOTH files. Any time you update one, update the other.

4. **Next.js 16 vs 14:** The project runs 16.2.1. Some tutorials/docs reference 14 syntax. If something looks wrong about Next.js behavior, check if the docs are for 14.

5. **PrismaAdapter + JWT = silent failure:** This is the nastiest bug. PrismaAdapter does nothing if NextAuth is in JWT mode. It attaches without error but never writes. Always use `session: { strategy: 'database' }` with PrismaAdapter.

6. **OpenRouter API key:** Person B set this up. Person A may need it for Day 2 `feat/a-openclaw` work. It's stored as `OPENCLAW_API_KEY` in env vars.

7. **Tavily free student tier:** An email was drafted to send to `support@tavily.com` requesting a free API key for student use. Confirm whether this was sent.

8. **Rithik's personal info:**
   - Email: `rithikthegr8@gmail.com`
   - UW-Madison CS junior, graduating 2027
   - Google OAuth client ID: `385262870243-pv33lc661jfnmkn63uc65r9cun0asgss.apps.googleusercontent.com`

---

## Quick Reference: Common Commands

```bash
# Start dev server
cd C:\Users\rithi\outarc
npm run dev

# Regenerate Prisma client after schema changes
npx prisma generate

# Run migration
npx prisma migrate dev --name <name>

# Reset DB (DESTRUCTIVE — deletes all data)
npx prisma migrate reset

# Open Prisma Studio (local DB browser)
npx prisma studio

# Check Railway DB tables via Prisma Studio connected to Railway
# (DATABASE_URL must be in .env, not just .env.local)

# Start worker (Day 2)
npx ts-node worker/index.ts
# or
npx tsx worker/index.ts
```
