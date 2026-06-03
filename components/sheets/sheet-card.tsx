import Link from 'next/link'
import { FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { SellSheetWithCategories } from '@/types/database'

interface SheetCardProps {
  sheet: SellSheetWithCategories
}

export function SheetCard({ sheet }: SheetCardProps) {
  return (
    <Link href={`/sheets/${sheet.id}`} className="group block">
      <div className="rounded-xl border bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="h-40 bg-gray-100 flex items-center justify-center relative overflow-hidden">
          {sheet.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sheet.thumbnail_url}
              alt={sheet.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-300">
              <FileText className="h-16 w-16" />
              <span className="text-sm">No preview</span>
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-sm text-gray-900 line-clamp-1 group-hover:text-[#1E5A96] transition-colors">
            {sheet.title}
          </h3>
          {sheet.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{sheet.description}</p>
          )}
          <div className="flex flex-wrap gap-1 mt-2">
            {sheet.categories.slice(0, 3).map(cat => (
              <Badge key={cat.id} variant="outline" className="text-xs py-0 px-1.5">{cat.name}</Badge>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">{formatDate(sheet.created_at)}</p>
        </div>
      </div>
    </Link>
  )
}
