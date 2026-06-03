import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Plus, Settings } from 'lucide-react'

export default async function AdminSheetsPage() {
  const supabase = createAdminClient()

  const { data: sheets } = await supabase
    .from('sell_sheets')
    .select('*, sell_sheet_categories(categories(name))')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Sell Sheets</h1>
        <Link href="/admin/sheets/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Upload Sheet
          </Button>
        </Link>
      </div>

      {(sheets || []).length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-200" />
          <p>No sell sheets yet.</p>
          <Link href="/admin/sheets/new" className="text-[#1E5A96] hover:underline text-sm mt-2 inline-block">
            Upload your first one →
          </Link>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Title</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Categories</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(sheets || []).map((sheet: Record<string, unknown>) => {
                const cats = ((sheet.sell_sheet_categories as Array<{ categories: { name: string } }>) || [])
                  .map(sc => sc.categories?.name)
                  .filter(Boolean)
                return (
                  <tr key={sheet.id as string} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{sheet.title as string}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {cats.slice(0, 3).map(name => (
                          <Badge key={name} variant="outline" className="text-xs">{name}</Badge>
                        ))}
                        {cats.length > 3 && <span className="text-xs text-gray-400">+{cats.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge variant={(sheet.is_active as boolean) ? 'success' : 'outline'}>
                        {(sheet.is_active as boolean) ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{formatDate(sheet.created_at as string)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/sheets/${sheet.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
