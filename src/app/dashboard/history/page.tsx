import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CheckCircle, Clock, XCircle } from 'lucide-react'

const statusConfig = {
  QUEUED: { icon: Clock, label: 'Queued', variant: 'outline' as const },
  APPLIED: { icon: CheckCircle, label: 'Applied', variant: 'outline' as const },
  FAILED: { icon: XCircle, label: 'Failed', variant: 'destructive' as const },
}

export default async function HistoryPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const applications = await prisma.application.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

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
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applied At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((app) => {
                const { icon: StatusIcon, label, variant } =
                  statusConfig[app.status as keyof typeof statusConfig] ?? statusConfig.QUEUED
                return (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">
                      <a
                        href={app.handshakeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline text-primary"
                      >
                        {app.jobTitle}
                      </a>
                    </TableCell>
                    <TableCell>{app.company}</TableCell>
                    <TableCell>
                      <Badge variant={variant} className="gap-1.5 items-center">
                        <StatusIcon className="h-3 w-3" />
                        {label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {app.appliedAt
                        ? new Date(app.appliedAt).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })
                        : '—'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
