'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { ChevronLeft, Download, Link2, Check, FileText } from 'lucide-react'
import type { Profile, SellSheetWithCategories } from '@/types/database'

export default function SheetPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()

  const [sheet, setSheet] = useState<SellSheetWithCategories | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/sheets/${id}`)
    if (!res.ok) { router.push('/'); return }
    const data = await res.json()
    setSheet(data.sheet)
    setProfile(data.profile)
    setPdfUrl(data.signedUrl)
    setLoading(false)
  }, [id, router])

  useEffect(() => { load() }, [load])

  async function handleDownload() {
    const res = await fetch(`/api/sheets/${id}/download`)
    if (!res.ok) { toast({ title: 'Download failed', variant: 'destructive' }); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sheet?.title || 'sell-sheet'}.pdf`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  async function handleShare() {
    setSharing(true)
    const res = await fetch(`/api/sheets/${id}/share`, { method: 'POST' })
    const data = await res.json()
    setSharing(false)
    if (!data.token) { toast({ title: 'Failed to create link', variant: 'destructive' }); return }
    const link = `${window.location.origin}/share/${data.token}`
    await navigator.clipboard.writeText(link)
    setCopied(true)
    toast({ title: 'Link copied!', description: 'Share link copied to clipboard.' })
    setTimeout(() => setCopied(false), 2500)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar profile={null} />
        <div className="flex-1 flex items-center justify-center text-gray-400">Loading…</div>
      </div>
    )
  }

  if (!sheet) return null

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar profile={profile} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-6">
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0">
            {pdfUrl ? (
              <iframe src={`${pdfUrl}#toolbar=0`} className="w-full rounded-xl border shadow-sm" style={{ height: '80vh' }} title={sheet.title} />
            ) : (
              <div className="w-full rounded-xl border bg-gray-50 flex items-center justify-center" style={{ height: '80vh' }}>
                <div className="flex flex-col items-center gap-2 text-gray-300">
                  <FileText className="h-20 w-20" />
                  <span>No preview</span>
                </div>
              </div>
            )}
          </div>

          <div className="lg:w-72 shrink-0 space-y-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{sheet.title}</h1>
              {sheet.description && <p className="text-sm text-gray-500 mt-1">{sheet.description}</p>}
            </div>

            {sheet.categories.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Categories</p>
                <div className="flex flex-wrap gap-1.5">
                  {sheet.categories.map(cat => (
                    <Link key={cat.id} href={`/categories/${cat.slug}`}>
                      <Badge variant="outline" className="cursor-pointer hover:bg-[#1E5A96] hover:text-white hover:border-[#1E5A96] transition-colors">
                        {cat.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <Button onClick={handleDownload} className="w-full gap-2">
                <Download className="h-4 w-4" /> Download PDF
              </Button>
              <Button onClick={handleShare} variant="outline" className="w-full gap-2" disabled={sharing}>
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Link2 className="h-4 w-4" />}
                {copied ? 'Copied!' : sharing ? 'Creating link…' : 'Copy Share Link'}
              </Button>
            </div>

            {profile && (
              <div className="border rounded-lg p-3 bg-gray-50">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Your contact on PDF</p>
                <p className="text-sm font-medium">{profile.full_name}</p>
                {profile.title && <p className="text-xs text-gray-500">{profile.title}</p>}
                <p className="text-xs text-gray-500">{profile.email}</p>
                {profile.phone && <p className="text-xs text-gray-500">{profile.phone}</p>}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
