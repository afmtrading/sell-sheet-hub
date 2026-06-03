import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { injectContactInfo } from '@/lib/pdf/inject-contact'
import JSZip from 'jszip'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  // Verify admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminProfile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (adminProfile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Get the sheet
  const { data: sheet } = await admin.from('sell_sheets').select('*').eq('id', id).single()
  if (!sheet) return NextResponse.json({ error: 'Sheet not found' }, { status: 404 })

  // Get all salespeople who have access to this sheet
  const { data: accessRows } = await admin
    .from('sell_sheet_access')
    .select('user_id')
    .eq('sell_sheet_id', id)

  if (!accessRows || accessRows.length === 0) {
    return NextResponse.json({ error: 'No salespeople have access to this sheet yet' }, { status: 400 })
  }

  const userIds = accessRows.map((r: { user_id: string }) => r.user_id)

  const { data: salespeople } = await admin
    .from('profiles')
    .select('*')
    .in('id', userIds)
    .eq('is_active', true)

  if (!salespeople || salespeople.length === 0) {
    return NextResponse.json({ error: 'No active salespeople found' }, { status: 400 })
  }

  // Download the original PDF once
  const { data: fileData } = await admin.storage.from('sell-sheets').download(sheet.pdf_url)
  if (!fileData) return NextResponse.json({ error: 'Failed to load PDF' }, { status: 500 })

  const originalPdfBytes = await fileData.arrayBuffer()

  // Build ZIP
  const zip = new JSZip()
  const sheetSlug = sheet.title.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_')

  await Promise.all(
    salespeople.map(async (person: { full_name: string; email: string; phone: string | null; title: string | null }) => {
      let pdfBytes: Uint8Array

      if (sheet.contact_box) {
        pdfBytes = await injectContactInfo(originalPdfBytes, person, sheet.contact_box)
      } else {
        pdfBytes = new Uint8Array(originalPdfBytes)
      }

      const personSlug = (person.full_name || person.email)
        .replace(/[^a-z0-9]/gi, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')

      const filename = `${sheetSlug}_-_${personSlug}.pdf`
      zip.file(filename, pdfBytes)
    })
  )

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  const zipName = `${sheetSlug}_-_All_Salespeople.zip`

  return new NextResponse(zipBuffer.buffer.slice(zipBuffer.byteOffset, zipBuffer.byteOffset + zipBuffer.byteLength) as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipName}"`,
      'Content-Length': String(zipBuffer.byteLength),
    },
  })
}
