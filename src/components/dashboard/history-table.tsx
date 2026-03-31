'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CheckCircle, Clock, XCircle, Eye } from 'lucide-react'
import { CoverLetterDialog } from './cover-letter-dialog'

interface Application {
  id: string
  jobTitle: string
  company: string
  handshakeUrl: string
  status: string
  coverLetterUsed: string
  resumeBulletsUsed: { original: string; rewritten: string }[] | null
  appliedAt: string | null
}

interface HistoryTableProps {
  applications: Application[]
}

const statusConfig = {
  QUEUED: { icon: Clock, label: 'Queued', variant: 'outline' as const },
  APPLIED: { icon: CheckCircle, label: 'Applied', variant: 'outline' as const },
  FAILED: { icon: XCircle, label: 'Failed', variant: 'destructive' as const },
}

export function HistoryTable({ applications }: HistoryTableProps) {
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job Title</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Applied At</TableHead>
              <TableHead className="w-[80px]">Details</TableHead>
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
                  <TableCell>
                    {app.status === 'APPLIED' && app.coverLetterUsed && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedApp(app)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View details</span>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {selectedApp && (
        <CoverLetterDialog
          open={!!selectedApp}
          onOpenChange={(open) => !open && setSelectedApp(null)}
          jobTitle={selectedApp.jobTitle}
          company={selectedApp.company}
          coverLetter={selectedApp.coverLetterUsed}
          resumeBullets={selectedApp.resumeBulletsUsed || []}
        />
      )}
    </>
  )
}
