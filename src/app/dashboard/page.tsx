import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardContent } from '@/components/dashboard/dashboard-content'

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [applicationCount, completedCount, resumeCount, filterCount] = await Promise.all([
    prisma.application.count({ where: { userId: session.user.id } }),
    prisma.application.count({ where: { userId: session.user.id, status: 'APPLIED' } }),
    prisma.resume.count({ where: { userId: session.user.id, isActive: true } }),
    prisma.jobFilter.count({ where: { userId: session.user.id, isActive: true } }),
  ])

  const recentApps = await prisma.application.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      jobTitle: true,
      company: true,
      status: true,
    },
  })

  return (
    <DashboardContent
      userName={session.user.name?.split(' ')[0] || 'there'}
      applicationCount={applicationCount}
      resumeCount={resumeCount}
      filterCount={filterCount}
      completedCount={completedCount}
      recentApps={recentApps}
    />
  )
}
