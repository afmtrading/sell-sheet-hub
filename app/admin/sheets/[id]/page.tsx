'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { ContactRegionPicker } from '@/components/sheets/contact-region-picker'
import { ChevronLeft, Save, UserPlus, UserMinus, Eye, Trash2, FolderDown } from 'lucide-react'
import type { Category, Profile, SellSheet, ContactBox } from '@/types/database'

export default function EditSheetPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const [sheet, setSheet] = useState<SellSheet | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [contactBox, setContactBox] = useState<ContactBox | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [accessUserIds, setAccessUserIds] = useState<string[]>([])
  const [pdfSignedUrl, setPdfSignedUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [batchDownloading, setBatchDownloading] = useState(false)

  const load = useCallback(async () => {
    const [sheetRes, catsRes] = await Promise.all([
      fetch(`/api/admin/sheets?id=${id}`),
      fetch('/api/admin/categories'),
    ])

    if (!sheetRes.ok) { router.push('/admin/sheets'); return }

    const { sheet: s, access, users } = await sheetRes.json()
    const { categories: cats } = await catsRes.json()

    setSheet(s)
    setTitle(s.title)
    setDescription(s.description || '')
    setIsActive(s.is_active)
    setContactBox(s.contact_box)
    setSelectedCategories((s.sell_sheet_categories || []).map((sc: { category_id: string }) => sc.category_id))
    setCategories(cats || [])
    setAllUsers(users || [])
    setAccessUserIds((access || []).map((a: { user_id: string }) => a.user_id))

    const { data: signed } = await supabase.storage.from('sell-sheets').createSignedUrl(s.pdf_url, 3600)
    if (signed) setPdfSignedUrl(signed.signedUrl)

    setLoading(false)
  }, [id, router, supabase])

  useEffect(() => { load() }, [load])

  function toggleCategory(catId: string) {
    setSelectedCategories(prev => prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId])
  }

  async function toggleAccess(userId: string) {
    const grant = !accessUserIds.includes(userId)
    const res = await fetch('/api/admin/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sell_sheet_id: id, user_id: userId, grant }),
    })
    if (!res.ok) { toast({ title: 'Error updating access', variant: 'destructive' }); return }
    setAccessUserIds(prev => grant ? [...prev, userId] : prev.filter(u => u !== userId))
    toast({ title: grant ? 'Access granted' : 'Access removed' })
  }

  async function handleBatchDownload() {
    setBatchDownloading(true)
    const res = await fetch(`/api/admin/sheets/${id}/batch-download`)
    if (!res.ok) {
      const data = await res.json()
      toast({ title: 'Download failed', description: data.error, variant: 'destructive' })
      setBatchDownloading(false)
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sheet?.title?.replace(/[^a-z0-9]/gi, '_') || 'sell-sheet'}_All_Salespeople.zip`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 100)
    setBatchDownloading(false)
    toast({ title: 'ZIP downloaded!', description: `${accessUserIds.length} PDF${accessUserIds.length !== 1 ? 's' : ''} generated` })
  }

  async function handleDelete() {
    if (!confirm('Permanently delete this sell sheet? This cannot be undone.')) return
    const res = await fetch('/api/admin/sheets', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) { toast({ title: 'Delete failed', variant: 'destructive' }); return }
    toast({ title: 'Sell sheet deleted' })
    router.push('/admin/sheets')
  }

  async function handleSave() {
    setSaving(true)
    const res = await fetch('/api/admin/sheets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title, description, is_active: isActive, contact_box: contactBox, category_ids: selectedCategories }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      toast({ title: 'Save failed', description: data.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Saved!' })
  }

  if (loading) return <div className="text-gray-400">Loading…</div>
  if (!sheet) return null

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/sheets" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
          <ChevronLeft className="h-4 w-4" /> All Sheets
        </Link>
        <Link href={`/sheets/${id}`} className="ml-auto inline-flex items-center gap-1.5 text-sm text-[#1E5A96] hover:underline">
          <Eye className="h-4 w-4" /> Preview
        </Link>
      </div>

      <h1 className="text-xl font-bold text-gray-900 mb-6">Edit Sell Sheet</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded" />
              <span className="text-sm font-medium">Active (visible to salespeople)</span>
            </label>
          </div>
          <div className="space-y-1.5">
            <Label>Categories</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {categories.map(cat => (
                <button key={cat.id} type="button" onClick={() => toggleCategory(cat.id)} className="focus:outline-none">
                  <Badge variant={selectedCategories.includes(cat.id) ? 'default' : 'outline'} className="cursor-pointer">
                    {cat.name}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
            <Button
              onClick={handleBatchDownload}
              disabled={batchDownloading || accessUserIds.length === 0}
              variant="secondary"
              className="gap-2"
              title={accessUserIds.length === 0 ? 'Grant access to at least one salesperson first' : ''}
            >
              <FolderDown className="h-4 w-4" />
              {batchDownloading
                ? 'Generating ZIPs…'
                : `Download All (${accessUserIds.length} salesperson${accessUserIds.length !== 1 ? 's' : ''})`}
            </Button>
            <Button onClick={handleDelete} variant="destructive" size="sm" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Delete Sheet
            </Button>
          </div>
          {pdfSignedUrl && (
            <div className="space-y-1.5 pt-4 border-t">
              <Label>Contact Region</Label>
              <ContactRegionPicker pdfUrl={pdfSignedUrl} value={contactBox} onChange={setContactBox} />
            </div>
          )}
        </div>

        <div>
          <h2 className="font-semibold text-gray-900 mb-3">Access Control</h2>
          <p className="text-sm text-gray-500 mb-4">Select which salespeople can see and download this sheet.</p>
          {allUsers.length === 0 ? (
            <p className="text-sm text-gray-400">No salespeople yet. <Link href="/admin/users" className="text-[#1E5A96] hover:underline">Create accounts first.</Link></p>
          ) : (
            <div className="space-y-2">
              {allUsers.map(user => {
                const hasAccess = accessUserIds.includes(user.id)
                return (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                    <div>
                      <p className="text-sm font-medium">{user.full_name}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                    <button
                      onClick={() => toggleAccess(user.id)}
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                        hasAccess ? 'bg-green-50 text-green-700 hover:bg-red-50 hover:text-red-700' : 'bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-[#1E5A96]'
                      }`}
                    >
                      {hasAccess ? <><UserMinus className="h-3.5 w-3.5" /> Remove</> : <><UserPlus className="h-3.5 w-3.5" /> Grant</>}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
