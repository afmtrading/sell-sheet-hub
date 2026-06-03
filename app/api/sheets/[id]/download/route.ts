import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { injectContactInfo } from '@/lib/pdf/inject-contact'

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
  if (!profile || !profile.is_active) return NextResponse.json({ error: 'Account inactive' }, { status: 403 })

  const { data: sheet } = await admin.from('sell_sheets').select('*').eq('id', id).single()
  if (!sheet || !sheet.is_active) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (profile.role !== 'admin') {
    const { data: access } = await admin
      .from('sell_sheet_access')
      .select('id')
      .eq('sell_sheet_id', id)
      .eq('user_id', user.id)
      .single()
    if (!access) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const { data: fileData, error: downloadError } = await admin.storage
    .from('sell-sheets')
    .download(sheet.pdf_url)

  if (downloadError || !fileData) return NextResponse.json({ error: 'Failed to load PDF' }, { status: 500 })

  const pdfBytes = await fileData.arrayBuffer()
  let finalBytes: Uint8Array

  if (sheet.contact_box && (profile.full_name || profile.email || profile.phone)) {
    finalBytes = await injectContactInfo(pdfBytes, profile, sheet.contact_box)
  } else {
    finalBytes = new Uint8Array(pdfBytes)
  }

  const filename = `${sheet.title.replace(/[^a-z0-9]/gi, '_')}.pdf`
  const body = finalBytes.buffer.slice(finalBytes.byteOffset, finalBytes.byteOffset + finalBytes.byteLength) as ArrayBuffer

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(finalBytes.byteLength),
    },
  })
}
