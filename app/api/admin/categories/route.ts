import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'

async function verifyAdmin() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401, admin: null, user: null }
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Forbidden', status: 403, admin: null, user: null }
  return { error: null, status: 200, admin, user }
}

export async function GET() {
  const { error, status, admin } = await verifyAdmin()
  if (error || !admin) return NextResponse.json({ error }, { status })
  const { data } = await admin.from('categories').select('*').order('name')
  return NextResponse.json({ categories: data || [] })
}

export async function POST(request: NextRequest) {
  const { error, status, admin } = await verifyAdmin()
  if (error || !admin) return NextResponse.json({ error }, { status })

  const { name, description } = await request.json()
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const slug = slugify(name)
  const { data, error: insertError } = await admin
    .from('categories')
    .insert({ name, slug, description: description || null })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  return NextResponse.json({ category: data })
}

export async function DELETE(request: NextRequest) {
  const { error, status, admin } = await verifyAdmin()
  if (error || !admin) return NextResponse.json({ error }, { status })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  await admin.from('categories').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
