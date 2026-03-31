'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Plus, X } from 'lucide-react'

interface JobFilter {
  id: string
  keywords: string[]
  excludeCompanies: string[]
  roles: string[]
  maxPerDay: number
  isActive: boolean
}

interface FiltersFormProps {
  filters: JobFilter[]
}

function TagInput({
  label,
  id,
  tags,
  placeholder,
  onAdd,
  onRemove,
}: {
  label: string
  id: string
  tags: string[]
  placeholder: string
  onAdd: (tag: string) => void
  onRemove: (tag: string) => void
}) {
  const [input, setInput] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault()
      onAdd(input.trim())
      setInput('')
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pr-1 items-center">
              {tag}
              <button
                type="button"
                onClick={() => onRemove(tag)}
                className="ml-1 rounded-full hover:bg-muted p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FiltersForm({ filters: initialFilters }: FiltersFormProps) {
  const [filters, setFilters] = useState(initialFilters)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    keywords: [] as string[],
    excludeCompanies: [] as string[],
    roles: [] as string[],
    maxPerDay: 10,
  })

  const addTag = (field: 'keywords' | 'excludeCompanies' | 'roles') => (tag: string) => {
    if (!form[field].includes(tag)) {
      setForm((f) => ({ ...f, [field]: [...f[field], tag] }))
    }
  }

  const removeTag = (field: 'keywords' | 'excludeCompanies' | 'roles') => (tag: string) => {
    setForm((f) => ({ ...f, [field]: f[field].filter((t) => t !== tag) }))
  }

  const handleSave = async () => {
    if (form.keywords.length === 0 && form.roles.length === 0) {
      toast.error('Add at least one keyword or role')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      const newFilter = await res.json()
      setFilters((prev) => [newFilter, ...prev])
      setForm({ keywords: [], excludeCompanies: [], roles: [], maxPerDay: 10 })
      toast.success('Filter saved')
    } catch {
      toast.error('Failed to save filter')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/filters?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setFilters((prev) => prev.filter((f) => f.id !== id))
      toast.success('Filter deleted')
    } catch {
      toast.error('Failed to delete filter')
    }
  }

  return (
    <div className="space-y-6">
      {/* New filter form */}
      <Card>
        <CardHeader>
          <CardTitle>New Filter</CardTitle>
          <CardDescription>Press Enter or comma to add each tag.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TagInput
            id="keywords"
            label="Keywords"
            tags={form.keywords}
            placeholder="e.g. software, machine learning..."
            onAdd={addTag('keywords')}
            onRemove={removeTag('keywords')}
          />
          <TagInput
            id="roles"
            label="Roles"
            tags={form.roles}
            placeholder="e.g. Software Engineer Intern..."
            onAdd={addTag('roles')}
            onRemove={removeTag('roles')}
          />
          <TagInput
            id="excludeCompanies"
            label="Exclude Companies"
            tags={form.excludeCompanies}
            placeholder="Companies to skip..."
            onAdd={addTag('excludeCompanies')}
            onRemove={removeTag('excludeCompanies')}
          />
          <div className="space-y-2">
            <Label htmlFor="maxPerDay">Max Applications / Day</Label>
            <Input
              id="maxPerDay"
              type="number"
              min={1}
              max={50}
              value={form.maxPerDay}
              onChange={(e) => setForm({ ...form, maxPerDay: parseInt(e.target.value) || 10 })}
              className="w-32"
            />
          </div>
          <Button id="save-filter-btn" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Add Filter
          </Button>
        </CardContent>
      </Card>

      {/* Existing filters */}
      {filters.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Active Filters</h2>
          {filters.map((filter) => (
            <Card key={filter.id}>
              <CardContent className="pt-4 pb-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    {filter.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {filter.keywords.map((k) => (
                          <Badge key={k} variant="secondary">{k}</Badge>
                        ))}
                      </div>
                    )}
                    {filter.roles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {filter.roles.map((r) => (
                          <Badge key={r} variant="outline">{r}</Badge>
                        ))}
                      </div>
                    )}
                    {filter.excludeCompanies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {filter.excludeCompanies.map((c) => (
                          <Badge key={c} variant="destructive" className="opacity-80">Skip: {c}</Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">Max {filter.maxPerDay}/day</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                    onClick={() => handleDelete(filter.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
