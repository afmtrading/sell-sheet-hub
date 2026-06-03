import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const thumbnail = formData.get('thumbnail') as File | null
  const title = formData.get('title') as string
  const description = formData.get('description') as string | null
  const categoriesRaw = formData.get('categories') as string | null
  const contactBoxRaw = formData.get('contact_box') as string | null

  if (!file || !title) return NextResponse.json({ error: 'Missing file or title' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext !== 'pdf' || file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files allowed' }, { status: 400 })
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 400 })
  }

  const safeName = file.name.replace(/[^a-z0-9._-]/gi, '_')
  const storagePath = `${Date.now()}_${safeName}`

  const { error: uploadError } = await admin.storage
    .from('sell-sheets')
    .upload(storagePath, file, { contentType: 'application/pdf', upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  // Upload thumbnail if provided
  let thumbnailUrl: string | null = null
  if (thumbnail && thumbnail.size > 0) {
    const thumbExt = thumbnail.name.split('.').pop()?.toLowerCase() || 'jpg'
    const thumbPath = `${Date.now()}_thumb.${thumbExt}`
    const { error: thumbError } = await admin.storage
      .from('thumbnails')
      .upload(thumbPath, thumbnail, { contentType: thumbnail.type, upsert: false })
    if (!thumbError) {
      const { data: publicUrl } = admin.storage.from('thumbnails').getPublicUrl(thumbPath)
      thumbnailUrl = publicUrl.publicUrl
    }
  }

  const contactBox = contactBoxRaw ? JSON.parse(contactBoxRaw) : null
  const categoryIds: string[] = categoriesRaw ? JSON.parse(categoriesRaw) : []

  const { data: sheet, error: sheetError } = await admin
    .from('sell_sheets')
    .insert({
      title,
      description: description || null,
      pdf_url: storagePath,
      thumbnail_url: thumbnailUrl,
      contact_box: contactBox,
      created_by: user.id,
    })
    .select()
    .single()

  if (sheetError) {
    await admin.storage.from('sell-sheets').remove([storagePath])
    return NextResponse.json({ error: sheetError.message }, { status: 500 })
  }

  if (categoryIds.length > 0) {
    await admin.from('sell_sheet_categories').insert(
      categoryIds.map(cid => ({ sell_sheet_id: sheet.id, category_id: cid }))
    )
  }

  return NextResponse.json({ sheet })
}
