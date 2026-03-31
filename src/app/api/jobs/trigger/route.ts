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