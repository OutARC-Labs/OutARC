'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Upload, Trash2, FileText, Eye, EyeOff } from 'lucide-react'

interface Resume {
  id: string
  filename: string
  url: string
  isActive: boolean
  uploadedAt: Date
}

interface ProfileFormProps {
  user: {
    name?: string | null
    email?: string | null
    major: string
    gradYear: number | null
    linkedin: string
    github: string
    hasHandshakeCreds: boolean
  }
  resumes: Resume[]
}

export default function ProfileForm({ user, resumes: initialResumes }: ProfileFormProps) {
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [resumes, setResumes] = useState(initialResumes)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    major: user.major,
    gradYear: user.gradYear?.toString() ?? '',
    linkedin: user.linkedin,
    github: user.github,
  })
  const [creds, setCreds] = useState({ email: '', password: '' })

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          major: form.major,
          gradYear: form.gradYear ? parseInt(form.gradYear) : null,
          linkedin: form.linkedin,
          github: form.github,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Profile saved')
    } catch {
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCreds = async () => {
    if (!creds.email || !creds.password) {
      toast.error('Enter both email and password')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/handshake-creds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds),
      })
      if (!res.ok) throw new Error()
      toast.success('Handshake credentials saved')
      setCreds({ email: '', password: '' })
    } catch {
      toast.error('Failed to save credentials')
    } finally {
      setSaving(false)
    }
  }

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are supported')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/resume', { method: 'POST', body: formData })
      if (!res.ok) throw new Error()
      const newResume = await res.json()
      setResumes((prev) => [newResume, ...prev])
      toast.success('Resume uploaded')
    } catch {
      toast.error('Failed to upload resume')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDeleteResume = async (id: string) => {
    try {
      const res = await fetch(`/api/resume?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setResumes((prev) => prev.filter((r) => r.id !== id))
      toast.success('Resume deleted')
    } catch {
      toast.error('Failed to delete resume')
    }
  }

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Info</CardTitle>
          <CardDescription>Used to personalize your cover letters.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={user.name ?? ''} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user.email ?? ''} disabled />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="major">Major</Label>
              <Input
                id="major"
                placeholder="e.g. Computer Science"
                value={form.major}
                onChange={(e) => setForm({ ...form, major: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gradYear">Graduation Year</Label>
              <Input
                id="gradYear"
                type="number"
                placeholder="e.g. 2026"
                value={form.gradYear}
                onChange={(e) => setForm({ ...form, gradYear: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn URL</Label>
              <Input
                id="linkedin"
                placeholder="https://linkedin.com/in/..."
                value={form.linkedin}
                onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="github">GitHub URL</Label>
              <Input
                id="github"
                placeholder="https://github.com/..."
                value={form.github}
                onChange={(e) => setForm({ ...form, github: e.target.value })}
              />
            </div>
          </div>
          <Button id="save-profile-btn" onClick={handleSaveProfile} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Profile
          </Button>
        </CardContent>
      </Card>

      {/* Resume Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Resumes</CardTitle>
          <CardDescription>Upload your resume PDF. OutARC will tailor bullets per job.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="resume-upload" className="cursor-pointer">
              <div className="flex items-center gap-2 w-fit">
                <Button
                  id="resume-upload-btn"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  asChild
                >
                  <span>
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Upload PDF
                  </span>
                </Button>
              </div>
            </Label>
            <input
              id="resume-upload"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleResumeUpload}
            />
          </div>
          {resumes.length > 0 && (
            <ul className="space-y-2">
              {resumes.map((resume) => (
                <li
                  key={resume.id}
                  className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium truncate max-w-xs">{resume.filename}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(resume.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteResume(resume.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Handshake Credentials */}
      <Card>
        <CardHeader>
          <CardTitle>Handshake Credentials</CardTitle>
          <CardDescription>
            Your credentials are AES-256-GCM encrypted at rest.{' '}
            {user.hasHandshakeCreds && (
              <span className="text-green-600 font-medium">✓ Credentials saved</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hs-email">Handshake Email</Label>
            <Input
              id="hs-email"
              type="email"
              placeholder="netid@wisc.edu"
              value={creds.email}
              onChange={(e) => setCreds({ ...creds, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hs-password">Handshake Password</Label>
            <div className="relative">
              <Input
                id="hs-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={creds.password}
                onChange={(e) => setCreds({ ...creds, password: e.target.value })}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button id="save-creds-btn" onClick={handleSaveCreds} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {user.hasHandshakeCreds ? 'Update Credentials' : 'Save Credentials'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
