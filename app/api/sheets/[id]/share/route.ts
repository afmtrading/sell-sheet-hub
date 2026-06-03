import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { generateToken } from '@/lib/utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 403 })

  if (profile.role !== 'admin') {
    const { data: access } = await admin
      .from('sell_sheet_access')
      .select('id')
      .eq('sell_sheet_id', id)
      .eq('user_id', user.id)
      .single()
    if (!access) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const token = generateToken()
  const { data: upserted, error } = await admin
    .from('share_links')
    .upsert(
      { token, sell_sheet_id: id, user_id: user.id },
      { onConflict: 'sell_sheet_id,user_id' }
    )
    .select('token')
    .single()

  if (error || !upserted) return NextResponse.json({ error: 'Failed to create link' }, { status: 500 })

  return NextResponse.json({ token: upserted.token })
}
