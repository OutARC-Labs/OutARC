'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Zap, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface QueueStatus {
  queued: number
  active: number
  completed: number
  failed: number
}

interface StatusIndicatorProps {
  initialCompleted: number
}

export function StatusIndicator({ initialCompleted }: StatusIndicatorProps) {
  const [status, setStatus] = useState<QueueStatus | null>(null)
  const [isVisible, setIsVisible] = useState(true)
  const prevCompletedRef = useRef(initialCompleted)

  // Handle page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden)
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Poll for status updates
  useEffect(() => {
    if (!isVisible) return

    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/jobs/status')
        if (res.ok) {
          const data: QueueStatus = await res.json()
          setStatus(data)

          // Check for new completed applications
          if (data.completed > prevCompletedRef.current) {
            toast.success('Application submitted!', {
              description: 'A new application has been sent successfully.',
            })
          }
          prevCompletedRef.current = data.completed
        }
      } catch (err) {
        console.error('Failed to fetch status:', err)
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [isVisible])

  const isActive = status && (status.queued > 0 || status.active > 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Application Status
        </CardTitle>
        {isActive ? (
          <Loader2 className="h-4 w-4 animate-spin text-green-500" />
        ) : (
          <Zap className="h-4 w-4 text-muted-foreground" />
        )}
      </CardHeader>
      <CardContent>
        {status ? (
          <div className="space-y-2">
            {isActive ? (
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <p className="text-lg font-semibold text-green-600">
                  Applying...
                </p>
              </div>
            ) : (
              <p className="text-lg font-semibold">Idle</p>
            )}
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Queued: {status.queued}</span>
              <span>Active: {status.active}</span>
              <span>Done: {status.completed}</span>
              {status.failed > 0 && (
                <span className="text-destructive">Failed: {status.failed}</span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-lg font-semibold">Loading...</p>
        )}
      </CardContent>
    </Card>
  )
}
