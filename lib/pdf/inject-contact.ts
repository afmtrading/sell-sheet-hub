import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import type { ContactBox, Profile } from '@/types/database'

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16) / 255
  const g = parseInt(clean.substring(2, 4), 16) / 255
  const b = parseInt(clean.substring(4, 6), 16) / 255
  return rgb(r, g, b)
}

export async function injectContactInfo(
  pdfBytes: ArrayBuffer,
  profile: Pick<Profile, 'full_name' | 'email' | 'phone'>,
  contactBox: ContactBox
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const pages = pdfDoc.getPages()

  const pageIndex = Math.max(0, contactBox.page - 1)
  const page = pages[pageIndex]
  if (!page) return new Uint8Array(pdfBytes)

  const { height: pageHeight } = page.getSize()

  // pdf-lib uses bottom-left origin; convert from top-left
  const pdfY = pageHeight - contactBox.y - contactBox.height

  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

  // Use saved color or default to white (safe on most sell sheet headers)
  const color = contactBox.font_color ? hexToRgb(contactBox.font_color) : rgb(1, 1, 1)

  const lines: Array<{ text: string; bold: boolean; size: number }> = []
  if (profile.full_name) lines.push({ text: profile.full_name, bold: true, size: 10 })
  if (profile.email) lines.push({ text: profile.email, bold: false, size: 8.5 })
  if (profile.phone) lines.push({ text: profile.phone, bold: false, size: 8.5 })

  const lineHeight = 13
  const startY = pdfY + contactBox.height - lineHeight

  lines.forEach((line, i) => {
    page.drawText(line.text, {
      x: contactBox.x + 4,
      y: startY - i * lineHeight,
      size: line.size,
      font: line.bold ? font : regularFont,
      color,
      maxWidth: contactBox.width - 8,
    })
  })

  return pdfDoc.save()
}
