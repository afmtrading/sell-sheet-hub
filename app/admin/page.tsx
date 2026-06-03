import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FileText, Users, Tag, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AdminOverviewPage() {
  const admin = createAdminClient()

  const [
    { count: sheetsCount },
    { count: usersCount },
    { count: categoriesCount },
  ] = await Promise.all([
    admin.from('sell_sheets').select('*', { count: 'exact', head: true }),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'salesperson'),
    admin.from('categories').select('*', { count: 'exact', head: true }),
  ])

  const stats = [
    { label: 'Sell Sheets', value: sheetsCount ?? 0, icon: FileText, href: '/admin/sheets', color: 'text-[#1E5A96]' },
    { label: 'Salespeople', value: usersCount ?? 0, icon: Users, href: '/admin/users', color: 'text-[#1E5A96]' },
    { label: 'Categories', value: categoriesCount ?? 0, icon: Tag, href: '/admin/categories', color: 'text-[#1E5A96]' },
  ]

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Overview</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, href, color }) => (
          <Link key={label} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${color}`} />
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">{value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#1E5A96]" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/admin/sheets/new" className="text-sm bg-[#1E5A96] text-white px-4 py-2 rounded-md hover:bg-[#1a4f85] transition-colors">
            + Upload Sell Sheet
          </Link>
          <Link href="/admin/users" className="text-sm border px-4 py-2 rounded-md hover:bg-gray-50 transition-colors">
            Manage Users
          </Link>
          <Link href="/admin/categories" className="text-sm border px-4 py-2 rounded-md hover:bg-gray-50 transition-colors">
            Manage Categories
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
