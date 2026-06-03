import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { SheetCard } from '@/components/sheets/sheet-card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Tag } from 'lucide-react'
import type { SellSheetWithCategories, Profile } from '@/types/database'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  // Fetch sheets using admin client — access filter done in code, not RLS
  let sheetsRaw: unknown[] = []

  if (isAdmin) {
    const { data } = await admin
      .from('sell_sheets')
      .select('*, sell_sheet_categories(category_id, categories(*))')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(8)
    sheetsRaw = data || []
  } else {
    const { data: accessRows } = await admin
      .from('sell_sheet_access')
      .select('sell_sheet_id')
      .eq('user_id', user.id)
    const ids = (accessRows || []).map((a: { sell_sheet_id: string }) => a.sell_sheet_id)

    if (ids.length > 0) {
      const { data } = await admin
        .from('sell_sheets')
        .select('*, sell_sheet_categories(category_id, categories(*))')
        .eq('is_active', true)
        .in('id', ids)
        .order('created_at', { ascending: false })
        .limit(8)
      sheetsRaw = data || []
    }
  }

  const sheets: SellSheetWithCategories[] = sheetsRaw.map((s: unknown) => {
    const row = s as Record<string, unknown>
    return {
      ...(row as unknown as SellSheetWithCategories),
      categories: ((row.sell_sheet_categories as Array<{ categories: unknown }>) || [])
        .map((sc) => sc.categories)
        .filter(Boolean) as SellSheetWithCategories['categories'],
    }
  })

  const { data: categories } = await admin.from('categories').select('*').order('name')

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar profile={profile as Profile} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="bg-gradient-to-r from-[#0B1F3A] to-[#1E5A96] rounded-2xl p-8 mb-8 text-white">
          <h1 className="text-2xl font-bold mb-1">Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}</h1>
          <p className="text-white/70 text-sm">Browse and share your sell sheets below.</p>
        </div>

        {(categories || []).length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Tag className="h-4 w-4 text-[#1E5A96]" />
                Categories
              </h2>
              <Link href="/categories" className="text-sm text-[#1E5A96] hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {(categories || []).map(cat => (
                <Link key={cat.id} href={`/categories/${cat.slug}`}>
                  <Badge variant="outline" className="text-sm py-1.5 px-3 cursor-pointer hover:bg-[#1E5A96] hover:text-white hover:border-[#1E5A96] transition-colors">
                    {cat.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="font-semibold text-gray-900 mb-4">Recent Sell Sheets</h2>
          {sheets.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg">No sell sheets available yet.</p>
              {isAdmin && (
                <Link href="/admin/sheets/new" className="text-[#1E5A96] hover:underline text-sm mt-2 inline-block">
                  Upload your first sell sheet →
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {sheets.map(sheet => (
                <SheetCard key={sheet.id} sheet={sheet} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
