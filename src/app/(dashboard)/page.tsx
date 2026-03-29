import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Zap, FileText, Filter, CheckCircle, Clock, XCircle } from 'lucide-react'

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [applicationCount, resumeCount, filterCount] = await Promise.all([
    prisma.application.count({ where: { userId: session.user.id } }),
    prisma.resume.count({ where: { userId: session.user.id, isActive: true } }),
    prisma.jobFilter.count({ where: { userId: session.user.id, isActive: true } }),
  ])

  const recentApps = await prisma.application.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  const statusIcon = (status: string) => {
    if (status === 'APPLIED') return <CheckCircle className="h-4 w-4 text-green-500" />
    if (status === 'FAILED') return <XCircle className="h-4 w-4 text-destructive" />
    return <Clock className="h-4 w-4 text-muted-foreground" />
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {session.user.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what OutARC is doing for you.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Applications</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{applicationCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Resumes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{resumeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Filters</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{filterCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Applications</CardTitle>
        </CardHeader>
        <CardContent>
          {recentApps.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No applications yet. Set up your filters to get started.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recentApps.map((app) => (
                <li key={app.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-sm">{app.jobTitle}</p>
                    <p className="text-xs text-muted-foreground">{app.company}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusIcon(app.status)}
                    <Badge variant="outline" className="text-xs capitalize">
                      {app.status.toLowerCase()}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
