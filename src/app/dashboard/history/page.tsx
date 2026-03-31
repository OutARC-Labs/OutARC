import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Clock } from 'lucide-react'
import { HistoryTable } from '@/components/dashboard/history-table'

export default async function HistoryPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const applications = await prisma.application.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      jobTitle: true,
      company: true,
      handshakeUrl: true,
      status: true,
      coverLetterUsed: true,
      resumeBulletsUsed: true,
      appliedAt: true,
    },
  })

  // Serialize for client component
  const serializedApps = applications.map((app: any) => ({
    ...app,
    appliedAt: app.appliedAt?.toISOString() ?? null,
    resumeBulletsUsed: app.resumeBulletsUsed as { original: string; rewritten: string }[] | null,
  }))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Application History</h1>
        <p className="text-muted-foreground mt-1">
          Every internship OutARC has applied to for you.
        </p>
      </div>

      {applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed rounded-lg">
          <Clock className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="font-medium">No applications yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Set up filters and upload a resume to get started.
          </p>
        </div>
      ) : (
        <HistoryTable applications={serializedApps as any} />
      )}
    </div>
  )
}
