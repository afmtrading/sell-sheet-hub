import { createClient, createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { LayoutGrid, Download, FileText } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  // Share page is public — use admin client so RLS doesn't block the lookup
  const adminClient = createAdminClient()

  const { data: link } = await adminClient
    .from('share_links')
    .select('*, sell_sheets(*, sell_sheet_categories(categories(*))), profiles(*)')
    .eq('token', token)
    .single()

  if (!link) notFound()

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <p className="text-lg font-semibold">This link has expired.</p>
        </div>
      </div>
    )
  }

  const sheet = link.sell_sheets as Record<string, unknown>
  const sheetProfile = link.profiles as Record<string, unknown>

  const { data: signed } = await adminClient.storage
    .from('sell-sheets')
    .createSignedUrl(sheet.pdf_url as string, 3600)

  const categories = ((sheet.sell_sheet_categories as Array<{ categories: unknown }>) || [])
    .map(sc => sc.categories)
    .filter(Boolean) as Array<{ id: string; name: string; slug: string }>

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-[#0B1F3A] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <LayoutGrid className="h-4 w-4 text-[#4A9BE8]" />
          Sell Sheet Hub
        </div>
        <a
          href={`/api/share/${token}/download`}
          className="flex items-center gap-1.5 bg-[#1E5A96] hover:bg-[#1a4f85] px-3 py-1.5 rounded text-sm transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Download PDF
        </a>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0">
            {signed ? (
              <iframe
                src={`${signed.signedUrl}#toolbar=0`}
                className="w-full rounded-xl border shadow-sm bg-white"
                style={{ height: '85vh' }}
                title={sheet.title as string}
              />
            ) : (
              <div className="w-full rounded-xl border bg-white flex items-center justify-center" style={{ height: '85vh' }}>
                <div className="flex flex-col items-center gap-2 text-gray-300">
                  <FileText className="h-20 w-20" />
                  <span>PDF unavailable</span>
                </div>
              </div>
            )}
          </div>

          <div className="lg:w-64 shrink-0 space-y-4">
            <h1 className="text-lg font-bold text-gray-900">{sheet.title as string}</h1>
            {(sheet.description as string) && (
              <p className="text-sm text-gray-500">{sheet.description as string}</p>
            )}

            {categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {categories.map(cat => (
                  <Badge key={cat.id} variant="outline">{cat.name}</Badge>
                ))}
              </div>
            )}

            <div className="border rounded-lg p-3 bg-white">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Contact</p>
              <p className="text-sm font-semibold">{sheetProfile.full_name as string}</p>
              {(sheetProfile.title as string) && <p className="text-xs text-gray-500">{sheetProfile.title as string}</p>}
              <p className="text-xs text-gray-500">{sheetProfile.email as string}</p>
              {(sheetProfile.phone as string) && <p className="text-xs text-gray-500">{sheetProfile.phone as string}</p>}
            </div>

            <a
              href={`/api/share/${token}/download`}
              className="flex w-full items-center justify-center gap-2 bg-[#1E5A96] hover:bg-[#1a4f85] text-white font-medium px-4 py-2 rounded-md text-sm transition-colors"
            >
              <Download className="h-4 w-4" />
              Download with Contact Info
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
