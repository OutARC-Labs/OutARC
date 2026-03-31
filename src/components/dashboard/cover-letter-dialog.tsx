'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'

interface ResumeBullet {
  original: string
  rewritten: string
}

interface CoverLetterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobTitle: string
  company: string
  coverLetter: string
  resumeBullets: ResumeBullet[]
}

export function CoverLetterDialog({
  open,
  onOpenChange,
  jobTitle,
  company,
  coverLetter,
  resumeBullets,
}: CoverLetterDialogProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(coverLetter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {jobTitle} at {company}
          </DialogTitle>
          <DialogDescription>
            Cover letter and tailored resume bullets
          </DialogDescription>
        </DialogHeader>

        {/* Cover Letter Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Cover Letter</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap">
            {coverLetter}
          </div>
        </div>

        {/* Resume Bullets Section */}
        {resumeBullets && resumeBullets.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h3 className="font-semibold text-sm">Tailored Resume Bullets</h3>
            <div className="space-y-3">
              {resumeBullets.map((bullet, index) => (
                <div
                  key={index}
                  className="grid grid-cols-2 gap-3 text-sm"
                >
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Original</p>
                    <p className="text-muted-foreground bg-muted/30 rounded p-2 text-xs">
                      {bullet.original}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-primary font-medium">Tailored</p>
                    <p className="bg-primary/10 text-foreground rounded p-2 text-xs">
                      {bullet.rewritten}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
