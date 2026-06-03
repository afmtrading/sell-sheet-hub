import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { SheetCard } from '@/components/sheets/sheet-card'
import { ChevronLeft, Tag } from 'lucide-react'
import Link from 'next/link'
import type { Profile, SellSheetWithCategories } from '@/types/database'

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  const { data: category } = await admin.from('categories').select('*').eq('slug', slug).single()
  if (!category) notFound()

  const { data: links } = await admin
    .from('sell_sheet_categories')
    .select('sell_sheets(*, sell_sheet_categories(category_id, categories(*)))')
    .eq('category_id', category.id)

  let sheets: SellSheetWithCategories[] = (links || [])
    .map((r: Record<string, unknown>) => r.sell_sheets as Record<string, unknown>)
    .filter(Boolean)
    .filter((s: Record<string, unknown>) => s.is_active)
    .map((s: Record<string, unknown>) => ({
      ...(s as unknown as SellSheetWithCategories),
      categories: ((s.sell_sheet_categories as Array<{ categories: unknown }>) || [])
        .map(sc => sc.categories).filter(Boolean) as SellSheetWithCategories['categories'],
    }))

  if (!isAdmin) {
    const { data: accessRows } = await admin
      .from('sell_sheet_access').select('sell_sheet_id').eq('user_id', user.id)
    const ids = new Set((accessRows || []).map((a: { sell_sheet_id: string }) => a.sell_sheet_id))
    sheets = sheets.filter(s => ids.has(s.id))
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar profile={profile as Profile} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        <Link href="/categories" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-6">
          <ChevronLeft className="h-4 w-4" /> All Categories
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <Tag className="h-6 w-6 text-[#1E5A96]" />
          <h1 className="text-2xl font-bold text-gray-900">{category.name}</h1>
          <span className="text-sm text-gray-400">{sheets.length} sheet{sheets.length !== 1 ? 's' : ''}</span>
        </div>
        {sheets.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No sell sheets in this category yet.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {sheets.map(sheet => <SheetCard key={sheet.id} sheet={sheet} />)}
          </div>
        )}
      </main>
    </div>
  )
}
