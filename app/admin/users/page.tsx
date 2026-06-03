'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Plus, ToggleLeft, ToggleRight, Users, Settings, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Profile } from '@/types/database'
import Link from 'next/link'

export default function AdminUsersPage() {
  const { toast } = useToast()
  const [users, setUsers] = useState<Profile[]>([])
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [title, setTitle] = useState('')
  const [role, setRole] = useState<'salesperson' | 'admin'>('salesperson')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    setUsers(data.users || [])
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password || !fullName) return
    setSaving(true)

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName, phone, title, role }),
    })
    const data = await res.json()
    setSaving(false)

    if (!res.ok) { toast({ title: 'Error', description: data.error, variant: 'destructive' }); return }

    setEmail(''); setFullName(''); setPhone(''); setTitle(''); setPassword(''); setRole('salesperson')
    toast({ title: 'User created!' })
    load()
  }

  async function toggleActive(user: Profile) {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, full_name: user.full_name, phone: user.phone, title: user.title, role: user.role, is_active: !user.is_active }),
    })
    if (!res.ok) { toast({ title: 'Update failed', variant: 'destructive' }); return }
    toast({ title: user.is_active ? 'User deactivated' : 'User activated' })
    load()
  }

  async function handleDelete(user: Profile) {
    if (!confirm(`Permanently delete ${user.full_name || user.email}? This cannot be undone.`)) return
    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id }),
    })
    const data = await res.json()
    if (!res.ok) { toast({ title: 'Delete failed', description: data.error, variant: 'destructive' }); return }
    toast({ title: 'User deleted' })
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Users</h1>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Users className="h-4 w-4" />
          {users.length} accounts
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="font-semibold text-gray-700 mb-4">Create Account</h2>
          <form onSubmit={handleCreate} className="space-y-4 border rounded-xl p-5 bg-white">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Full Name</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Smith" required />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" required />
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
                <Label>Password</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 chars" required minLength={8} />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <select value={role} onChange={e => setRole(e.target.value as 'salesperson' | 'admin')} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                  <option value="salesperson">Salesperson</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <Button type="submit" disabled={saving} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              {saving ? 'Creating…' : 'Create Account'}
            </Button>
          </form>
        </div>

        <div>
          <h2 className="font-semibold text-gray-700 mb-4">All Accounts</h2>
          <div className="space-y-2">
            {users.map(user => (
              <div key={user.id} className="flex items-start justify-between p-3 border rounded-lg bg-white">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{user.full_name || '(no name)'}</p>
                    <Badge variant={user.role === 'admin' ? 'secondary' : 'outline'} className="text-xs">{user.role}</Badge>
                    {!user.is_active && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                  </div>
                  <p className="text-xs text-gray-400">{user.email}</p>
                  {user.title && <p className="text-xs text-gray-400">{user.title}</p>}
                  <p className="text-xs text-gray-300 mt-0.5">Joined {formatDate(user.created_at)}</p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Link href={`/admin/users/${user.id}`}>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Settings className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                  <button onClick={() => toggleActive(user)} className={`text-sm p-1 rounded transition-colors ${user.is_active ? 'text-green-500 hover:text-red-400' : 'text-gray-300 hover:text-green-500'}`}>
                    {user.is_active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                  </button>
                  <button onClick={() => handleDelete(user)} className="text-sm p-1 rounded text-gray-300 hover:text-red-500 transition-colors" title="Delete user">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
