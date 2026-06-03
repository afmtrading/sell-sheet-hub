import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { AdminSidebar } from '@/components/layout/admin-sidebar'
import type { Profile } from '@/types/database'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/')

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar profile={profile as Profile} />
      <div className="flex flex-1">
        <AdminSidebar />
        <div className="flex-1 min-w-0 p-6">{children}</div>
      </div>
    </div>
  )
}
