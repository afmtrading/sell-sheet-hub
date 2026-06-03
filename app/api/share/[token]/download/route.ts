import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { injectContactInfo } from '@/lib/pdf/inject-contact'
import type { ContactBox, Profile } from '@/types/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = await createClient()

  const { data: link } = await supabase
    .from('share_links')
    .select('*, sell_sheets(*), profiles(*)')
    .eq('token', token)
    .single()

  if (!link) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Link expired' }, { status: 410 })
  }

  const sheet = link.sell_sheets as { pdf_url: string; title: string; contact_box: ContactBox | null }
  const profile = link.profiles as Pick<Profile, 'full_name' | 'email' | 'phone' | 'title'>

  if (!sheet) return NextResponse.json({ error: 'Sheet not found' }, { status: 404 })

  // Use service role for storage — token validity was already verified above
  const adminClient = createAdminClient()
  const { data: fileData } = await adminClient.storage
    .from('sell-sheets')
    .download(sheet.pdf_url)

  if (!fileData) return NextResponse.json({ error: 'Failed to load PDF' }, { status: 500 })

  const pdfBytes = await fileData.arrayBuffer()

  let finalBytes: Uint8Array

  if (sheet.contact_box && profile) {
    finalBytes = await injectContactInfo(pdfBytes, profile, sheet.contact_box)
  } else {
    finalBytes = new Uint8Array(pdfBytes)
  }

  const filename = `${sheet.title.replace(/[^a-z0-9]/gi, '_')}.pdf`

  // Slice the backing buffer to the exact byte range of the Uint8Array
  // (avoids sending extra zero bytes if pdf-lib returned a view into a shared buffer)
  const body = finalBytes.buffer.slice(finalBytes.byteOffset, finalBytes.byteOffset + finalBytes.byteLength) as ArrayBuffer

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(finalBytes.byteLength),
    },
  })
}
