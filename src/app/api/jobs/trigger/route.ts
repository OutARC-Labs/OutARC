import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { applicationQueue, ApplicationJob } from '@/lib/queue'

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Rate limit: max 5 queued/active jobs for the user
  const activeCount = await prisma.application.count({
    where: { userId: user.id, status: { in: ['QUEUED', 'ACTIVE'] } }
  })

  if (activeCount >= 5) return NextResponse.json({ error: 'Rate limit: Max 5 active applications' }, { status: 429 })

  const filter = await prisma.jobFilter.findFirst({
    where: { userId: user.id, isActive: true }
  })

  if (!filter) return NextResponse.json({ error: 'No active filters set' }, { status: 400 })

  const job = await applicationQueue.add('SCRAPE_AND_APPLY', {
    userId: user.id,
    jobTitle: '',
    company: '',
    jobDescription: '',
    handshakeUrl: ''
  } as ApplicationJob)

  return NextResponse.json({ jobId: job.id })
}
