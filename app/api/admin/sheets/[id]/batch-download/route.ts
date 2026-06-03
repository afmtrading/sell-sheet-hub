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

  if (!sheet.contact_box) {
    return NextResponse.json({
      error: 'No contact region defined. Go to Edit Sheet, drag a box over the contact area, then click Save Changes first.'
    }, { status: 400 })
  }

  // Get all salespeople with access
  const { data: accessRows } = await admin
    .from('sell_sheet_access')
    .select('user_id')
    .eq('sell_sheet_id', id)

  if (!accessRows || accessRows.length === 0) {
    return NextResponse.json({ error: 'No salespeople have access to this sheet yet.' }, { status: 400 })
  }

  const userIds = accessRows.map((r: { user_id: string }) => r.user_id)

  const { data: salespeople } = await admin
    .from('profiles')
    .select('*')
    .in('id', userIds)
    .eq('is_active', true)

  if (!salespeople || salespeople.length === 0) {
    return NextResponse.json({ error: 'No active salespeople found.' }, { status: 400 })
  }

  // Download the original PDF once
  const { data: fileData } = await admin.storage.from('sell-sheets').download(sheet.pdf_url)
  if (!fileData) return NextResponse.json({ error: 'Failed to load PDF from storage.' }, { status: 500 })

  const originalBytes = await fileData.arrayBuffer()

  // Build ZIP — each person gets a fresh copy of the bytes to avoid buffer sharing
  const zip = new JSZip()
  const sheetSlug = sheet.title.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_')

  // Process sequentially to avoid ArrayBuffer contention
  for (const person of salespeople as Array<{ full_name: string; email: string; phone: string | null; title: string | null }>) {
    // Slice a fresh copy for each person
    const freshCopy = originalBytes.slice(0)
    const pdfBytes = await injectContactInfo(freshCopy, person, sheet.contact_box)

    const personSlug = (person.full_name || person.email)
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')

    const filename = `${sheetSlug}_-_${personSlug}.pdf`
    zip.file(filename, pdfBytes)
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  const zipName = `${sheetSlug}_-_All_Salespeople.zip`
  const body = zipBuffer.buffer.slice(zipBuffer.byteOffset, zipBuffer.byteOffset + zipBuffer.byteLength) as ArrayBuffer

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipName}"`,
      'Content-Length': String(zipBuffer.byteLength),
    },
  })
}
