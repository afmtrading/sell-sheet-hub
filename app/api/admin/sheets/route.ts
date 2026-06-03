import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function verifyAdmin() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401, admin: null }
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Forbidden', status: 403, admin: null }
  return { error: null, status: 200, admin }
}

// GET /api/admin/sheets?id=xxx — fetch one sheet with categories + access list
export async function GET(request: NextRequest) {
  const { error, status, admin } = await verifyAdmin()
  if (error || !admin) return NextResponse.json({ error }, { status })

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const { data: sheet } = await admin
    .from('sell_sheets')
    .select('*, sell_sheet_categories(category_id)')
    .eq('id', id)
    .single()

  const { data: access } = await admin
    .from('sell_sheet_access')
    .select('user_id')
    .eq('sell_sheet_id', id)

  const { data: users } = await admin
    .from('profiles')
    .select('*')
    .eq('role', 'salesperson')
    .eq('is_active', true)
    .order('full_name')

  return NextResponse.json({ sheet, access: access || [], users: users || [] })
}

// PATCH /api/admin/sheets — update sheet details + categories
export async function PATCH(request: NextRequest) {
  const { error, status, admin } = await verifyAdmin()
  if (error || !admin) return NextResponse.json({ error }, { status })

  const { id, title, description, is_active, contact_box, category_ids } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const { error: updateError } = await admin
    .from('sell_sheets')
    .update({ title, description: description || null, is_active, contact_box })
    .eq('id', id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  await admin.from('sell_sheet_categories').delete().eq('sell_sheet_id', id)
  if (category_ids?.length > 0) {
    await admin.from('sell_sheet_categories').insert(
      category_ids.map((cid: string) => ({ sell_sheet_id: id, category_id: cid }))
    )
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/sheets — permanently delete a sheet + its storage file
export async function DELETE(request: NextRequest) {
  const { error, status, admin } = await verifyAdmin()
  if (error || !admin) return NextResponse.json({ error }, { status })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  // Get pdf_url before deleting so we can remove it from storage
  const { data: sheet } = await admin.from('sell_sheets').select('pdf_url, thumbnail_url').eq('id', id).single()

  // Delete DB record (cascades to categories, access, share_links)
  const { error: deleteError } = await admin.from('sell_sheets').delete().eq('id', id)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  // Remove files from storage
  if (sheet?.pdf_url) await admin.storage.from('sell-sheets').remove([sheet.pdf_url])

  return NextResponse.json({ ok: true })
}

// POST /api/admin/sheets/access — grant or revoke access
export async function POST(request: NextRequest) {
  const { error, status, admin } = await verifyAdmin()
  if (error || !admin) return NextResponse.json({ error }, { status })

  const { sell_sheet_id, user_id, grant } = await request.json()

  if (grant) {
    await admin.from('sell_sheet_access').insert({ sell_sheet_id, user_id })
  } else {
    await admin.from('sell_sheet_access').delete().eq('sell_sheet_id', sell_sheet_id).eq('user_id', user_id)
  }

  return NextResponse.json({ ok: true })
}
