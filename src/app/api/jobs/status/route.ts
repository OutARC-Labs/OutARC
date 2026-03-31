import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [queued, active, completed, failed] = await Promise.all([
    prisma.application.count({ where: { userId: session.user.id, status: 'QUEUED' } }),
    prisma.application.count({ where: { userId: session.user.id, status: 'ACTIVE' } }),
    prisma.application.count({ where: { userId: session.user.id, status: 'APPLIED' } }),
    prisma.application.count({ where: { userId: session.user.id, status: 'FAILED' } }),
  ])

  return NextResponse.json({ queued, active, completed, failed })
}
