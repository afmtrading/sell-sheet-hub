'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Trash2, Tag } from 'lucide-react'
import { slugify } from '@/lib/utils'
import type { Category } from '@/types/database'

export default function AdminCategoriesPage() {
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const res = await fetch('/api/admin/categories')
    const data = await res.json()
    setCategories(data.categories || [])
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name) return
    setSaving(true)

    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    })
    const data = await res.json()
    setSaving(false)

    if (!res.ok) {
      toast({ title: 'Error', description: data.error, variant: 'destructive' })
      return
    }

    setName(''); setDescription('')
    toast({ title: 'Category created!' })
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this category? Sheets won\'t be deleted.')) return

    const res = await fetch('/api/admin/categories', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })

    if (!res.ok) { toast({ title: 'Delete failed', variant: 'destructive' }); return }
    toast({ title: 'Category deleted' })
    load()
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Categories</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="font-semibold text-gray-700 mb-4">New Category</h2>
          <form onSubmit={handleCreate} className="space-y-4 border rounded-xl p-5 bg-white">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Protein Supplements" required />
              {name && <p className="text-xs text-gray-400">Slug: {slugify(name)}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Brief description…" />
            </div>
            <Button type="submit" disabled={saving} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              {saving ? 'Creating…' : 'Create Category'}
            </Button>
          </form>
        </div>

        <div>
          <h2 className="font-semibold text-gray-700 mb-4">Existing Categories ({categories.length})</h2>
          {categories.length === 0 ? (
            <p className="text-sm text-gray-400">No categories yet.</p>
          ) : (
            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-start justify-between p-3 border rounded-lg bg-white">
                  <div className="flex items-start gap-2">
                    <Tag className="h-4 w-4 text-[#1E5A96] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{cat.name}</p>
                      <p className="text-xs text-gray-400">/{cat.slug}</p>
                      {cat.description && <p className="text-xs text-gray-500 mt-0.5">{cat.description}</p>}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(cat.id)} className="text-gray-300 hover:text-red-500 transition-colors ml-2 mt-0.5">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
