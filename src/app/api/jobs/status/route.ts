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