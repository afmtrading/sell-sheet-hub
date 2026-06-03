'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { ChevronLeft, Save } from 'lucide-react'
import type { Profile } from '@/types/database'

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()

  const [user, setUser] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [title, setTitle] = useState('')
  const [role, setRole] = useState<'admin' | 'salesperson'>('salesperson')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    const found = (data.users || []).find((u: Profile) => u.id === id)
    if (!found) { router.push('/admin/users'); return }
    setUser(found)
    setFullName(found.full_name)
    setPhone(found.phone || '')
    setTitle(found.title || '')
    setRole(found.role as 'admin' | 'salesperson')
  }, [id, router])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    if (!user) return
    setSaving(true)
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, full_name: fullName, phone, title, role, is_active: user.is_active }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      toast({ title: 'Error', description: data.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Saved!' })
  }

  if (!user) return <div className="text-gray-400">Loading…</div>

  return (
    <div>
      <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-6">
        <ChevronLeft className="h-4 w-4" /> All Users
      </Link>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Edit User</h1>

      <div className="max-w-md border rounded-xl p-5 bg-white space-y-4">
        <div className="space-y-1.5">
          <Label>Email (read-only)</Label>
          <Input value={user.email} disabled className="opacity-60" />
        </div>
        <div className="space-y-1.5">
          <Label>Full Name</Label>
          <Input value={fullName} onChange={e => setFullName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 615 555 0100" />
        </div>
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Account Manager" />
        </div>
        <div className="space-y-1.5">
          <Label>Role</Label>
          <select value={role} onChange={e => setRole(e.target.value as 'admin' | 'salesperson')} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
            <option value="salesperson">Salesperson</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
