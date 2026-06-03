import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { Tag } from 'lucide-react'
import type { Profile } from '@/types/database'

export default async function CategoriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  const { data: categories } = await admin.from('categories').select('*').order('name')

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar profile={profile as Profile} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Categories</h1>
        {(categories || []).length === 0 ? (
          <div className="text-center py-16 text-gray-400">No categories yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {(categories || []).map(cat => (
              <Link key={cat.id} href={`/categories/${cat.slug}`}
                className="group block border bg-white rounded-xl p-6 hover:border-[#1E5A96] hover:shadow-md transition-all">
                <div className="flex items-start gap-3">
                  <Tag className="h-5 w-5 text-[#1E5A96] mt-0.5 shrink-0" />
                  <div>
                    <h2 className="font-semibold text-gray-900 group-hover:text-[#1E5A96] transition-colors">{cat.name}</h2>
                    {cat.description && <p className="text-sm text-gray-500 mt-1">{cat.description}</p>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
