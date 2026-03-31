import { Worker, Job } from 'bullmq'
import { connection } from '../src/lib/queue'
import { prisma } from '../src/lib/prisma'
import { decrypt } from '../src/lib/encrypt'
import { getHandshakeContext } from './handshake-auth'
import { scrapeHandshake } from './handshake-scrape'
import { applyToJob } from './handshake-apply'
import { tailorApplication } from './tailor'
import { notifyApplied, notifyFailed } from './notify'
import { humanDelay } from './utils/delays'
import path from 'path'

console.log('[OutARC Worker] Day 2 pipeline starting...')

async function isRateLimited(userId: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const count = await prisma.application.count({
    where: { userId, appliedAt: { gte: oneHourAgo }, status: 'APPLIED' }
  })
  return count >= 5
}

async function alreadyApplied(userId: string, handshakeUrl: string): Promise<boolean> {
  const existing = await prisma.application.findFirst({
    where: { userId, handshakeUrl }
  })
  return !!existing
}

const worker = new Worker(
  'application',
  async (job: Job) => {
    const { userId } = job.data
    console.log(`[Worker] Job ${job.id} started for user ${userId}`)

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    if (!user.handshakeCredEnc) throw new Error('No Handshake credentials saved')

    const resume = await prisma.resume.findFirst({
      where: { userId, isActive: true }
    })
    if (!resume?.parsedText) throw new Error('No active resume found')

    const filter = await prisma.jobFilter.findFirst({
      where: { userId, isActive: true }
    })
    if (!filter) throw new Error('No active filter found')

    const { email, password } = JSON.parse(decrypt(user.handshakeCredEnc))

    const { browser, context } = await getHandshakeContext(email, password, userId)

    try {
      const scrapedJobs = await scrapeHandshake(context, filter.keywords)
      console.log(`[Worker] Scraped ${scrapedJobs.length} jobs`)

      const resumePath = path.join(process.cwd(), 'public', 'resumes', userId, 'resume.pdf')

      for (const scrapedJob of scrapedJobs) {
        if (await alreadyApplied(userId, scrapedJob.handshakeUrl)) {
          console.log(`[Worker] Already applied to ${scrapedJob.jobTitle}, skipping`)
          continue
        }

        if (await isRateLimited(userId)) {
          console.log('[Worker] Rate limit hit — re-queuing job for 1 hour')
          await job.moveToDelayed(Date.now() + 60 * 60 * 1000)
          break
        }

        console.log(`[Worker] Tailoring for: ${scrapedJob.jobTitle} @ ${scrapedJob.company}`)
        const { coverLetter, resumeBullets } = await tailorApplication(scrapedJob, resume.parsedText)

        const result = await applyToJob(context, scrapedJob.handshakeUrl, coverLetter, resumePath)

        if (result.success) {
          await prisma.application.create({
            data: {
              userId,
              jobTitle: scrapedJob.jobTitle,
              company: scrapedJob.company,
              handshakeUrl: scrapedJob.handshakeUrl,
              coverLetterUsed: coverLetter,
              resumeBulletsUsed: resumeBullets,
              status: 'APPLIED',
              appliedAt: new Date(),
            }
          })

          await notifyApplied({
            jobTitle: scrapedJob.jobTitle,
            company: scrapedJob.company,
            handshakeUrl: scrapedJob.handshakeUrl,
            coverLetterSnippet: coverLetter,
          })

          console.log(`[Worker] Applied to ${scrapedJob.jobTitle} @ ${scrapedJob.company}`)
        } else {
          await prisma.application.create({
            data: {
              userId,
              jobTitle: scrapedJob.jobTitle,
              company: scrapedJob.company,
              handshakeUrl: scrapedJob.handshakeUrl,
              coverLetterUsed: coverLetter,
              status: 'FAILED',
              failureReason: result.error,
            }
          })

          await notifyFailed({
            jobTitle: scrapedJob.jobTitle,
            company: scrapedJob.company,
            reason: result.error ?? 'unknown',
          })
        }

        await humanDelay(3000, 8000)
      }
    } finally {
      await browser.close()
    }
  },
  { connection, concurrency: 1 }
)

worker.on('completed', job => console.log(`[Worker] Job ${job.id} completed`))
worker.on('failed', (job, err) => console.error(`[Worker] Job ${job?.id} failed: ${err.message}`))

process.on('SIGTERM', async () => {
  await worker.close()
  await prisma.$disconnect()
  process.exit(0)
})