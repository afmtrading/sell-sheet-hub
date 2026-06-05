import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { FileText } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { SellSheetWithCategories, Profile, Category } from '@/types/database'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category: selectedSlug } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  // Fetch all categories for sidebar
  const { data: categories } = await admin.from('categories').select('*').order('name')

  // Determine which sheet IDs this user can see
  let allowedIds: string[] | null = null
  if (!isAdmin) {
    const { data: accessRows } = await admin
      .from('sell_sheet_access')
      .select('sell_sheet_id')
      .eq('user_id', user.id)
    allowedIds = (accessRows || []).map((a: { sell_sheet_id: string }) => a.sell_sheet_id)
  }

  // Fetch sheets — optionally filtered by category
  let sheetsRaw: unknown[] = []

  if (selectedSlug && selectedSlug !== 'all') {
    const { data: cat } = await admin.from('categories').select('id').eq('slug', selectedSlug).single()
    if (cat) {
      const { data: links } = await admin
        .from('sell_sheet_categories')
        .select('sell_sheets(*, sell_sheet_categories(category_id, categories(*)))')
        .eq('category_id', cat.id)
      sheetsRaw = (links || [])
        .map((r: Record<string, unknown>) => r.sell_sheets)
        .filter(Boolean)
    }
  } else {
    const { data } = await admin
      .from('sell_sheets')
      .select('*, sell_sheet_categories(category_id, categories(*))')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    sheetsRaw = data || []
  }

  let sheets: SellSheetWithCategories[] = sheetsRaw
    .filter((s: unknown) => (s as Record<string, unknown>)?.is_active !== false)
    .map((s: unknown) => {
      const row = s as Record<string, unknown>
      return {
        ...(row as unknown as SellSheetWithCategories),
        categories: ((row.sell_sheet_categories as Array<{ categories: unknown }>) || [])
          .map(sc => sc.categories).filter(Boolean) as SellSheetWithCategories['categories'],
      }
    })

  // Filter by access for salespeople
  if (!isAdmin && allowedIds !== null) {
    const idSet = new Set(allowedIds)
    sheets = sheets.filter(s => idSet.has(s.id))
  }

  const activeSlug = selectedSlug || 'all'

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar profile={profile as Profile} />

      <div className="flex flex-1">
        {/* Left sidebar — categories */}
        <aside className="w-52 shrink-0 border-r bg-white">
          <nav className="p-3 space-y-0.5 sticky top-14">
            <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Categories</p>

            {/* ALL */}
            <Link
              href="/"
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                activeSlug === 'all'
                  ? 'bg-[#1E5A96] text-white font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All Sell Sheets
            </Link>

            {(categories || []).map((cat: Category) => (
              <Link
                key={cat.id}
                href={`/?category=${cat.slug}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  activeSlug === cat.slug
                    ? 'bg-[#1E5A96] text-white font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {cat.name}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {activeSlug === 'all'
                  ? 'All Sell Sheets'
                  : (categories || []).find((c: Category) => c.slug === activeSlug)?.name || 'Sell Sheets'}
              </h1>
              <p className="text-sm text-gray-400">{sheets.length} sheet{sheets.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {sheets.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-200" />
              <p>No sell sheets here yet.</p>
              {isAdmin && (
                <Link href="/admin/sheets/new" className="text-[#1E5A96] hover:underline text-sm mt-2 inline-block">
                  Upload your first sell sheet →
                </Link>
              )}
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 w-16">Preview</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Title</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Categories</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sheets.map(sheet => (
                    <Link key={sheet.id} href={`/sheets/${sheet.id}`} legacyBehavior>
                      <tr
                        key={sheet.id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => { window.location.href = `/sheets/${sheet.id}` }}
                      >
                        {/* Thumbnail */}
                        <td className="px-4 py-2">
                          {sheet.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={sheet.thumbnail_url}
                              alt={sheet.title}
                              className="h-12 w-10 object-cover rounded border"
                            />
                          ) : (
                            <div className="h-12 w-10 bg-gray-100 rounded border flex items-center justify-center">
                              <FileText className="h-5 w-5 text-gray-300" />
                            </div>
                          )}
                        </td>

                        {/* Title */}
                        <td className="px-4 py-2">
                          <p className="font-medium text-gray-900 hover:text-[#1E5A96]">{sheet.title}</p>
                          {sheet.description && (
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{sheet.description}</p>
                          )}
                        </td>

                        {/* Categories */}
                        <td className="px-4 py-2 hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {sheet.categories.slice(0, 3).map(cat => (
                              <span key={cat.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs border text-gray-600">
                                {cat.name}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-2 text-gray-400 hidden lg:table-cell text-xs">
                          {formatDate(sheet.created_at)}
                        </td>
                      </tr>
                    </Link>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
