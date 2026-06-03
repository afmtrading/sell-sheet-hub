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

// GET — list all users
export async function GET() {
  const { error, status, admin } = await verifyAdmin()
  if (error || !admin) return NextResponse.json({ error }, { status })
  const { data } = await admin.from('profiles').select('*').order('created_at', { ascending: false })
  return NextResponse.json({ users: data || [] })
}

// POST — create new user
export async function POST(request: NextRequest) {
  const { error, status, admin } = await verifyAdmin()
  if (error || !admin) return NextResponse.json({ error }, { status })

  const { email, password, full_name, phone, title, role } = await request.json()
  if (!email || !password || !full_name) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role: role || 'salesperson' },
  })

  if (createError) return NextResponse.json({ error: createError.message }, { status: 500 })

  const { error: profileError } = await admin.from('profiles').update({
    full_name,
    phone: phone || null,
    title: title || null,
    role: role || 'salesperson',
  }).eq('id', newUser.user.id)

  if (profileError) console.error('Profile update warning:', profileError.message)

  return NextResponse.json({ user: newUser.user })
}

// PATCH — update user profile
export async function PATCH(request: NextRequest) {
  const { error, status, admin } = await verifyAdmin()
  if (error || !admin) return NextResponse.json({ error }, { status })

  const { id, full_name, phone, title, role, is_active } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const { error: updateError } = await admin.from('profiles').update({
    full_name,
    phone: phone || null,
    title: title || null,
    role,
    is_active,
  }).eq('id', id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
