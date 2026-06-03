import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 403 })

  const { data: sheet } = await admin
    .from('sell_sheets')
    .select('*, sell_sheet_categories(category_id, categories(*))')
    .eq('id', id)
    .single()

  if (!sheet || !sheet.is_active) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Access check for non-admins
  if (profile.role !== 'admin') {
    const { data: access } = await admin
      .from('sell_sheet_access')
      .select('id')
      .eq('sell_sheet_id', id)
      .eq('user_id', user.id)
      .single()
    if (!access) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Generate signed URL for preview
  const { data: signed } = await admin.storage
    .from('sell-sheets')
    .createSignedUrl(sheet.pdf_url, 3600)

  const categories = (sheet.sell_sheet_categories || [])
    .map((sc: { categories: unknown }) => sc.categories)
    .filter(Boolean)

  return NextResponse.json({
    sheet: { ...sheet, categories },
    signedUrl: signed?.signedUrl || null,
    profile,
  })
}
