'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Upload, FileText, X, ChevronLeft, Image } from 'lucide-react'
import Link from 'next/link'
import type { Category, ContactBox } from '@/types/database'
import { ContactRegionPicker } from '@/components/sheets/contact-region-picker'

export default function NewSheetPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [contactBox, setContactBox] = useState<ContactBox | null>(null)
  const [uploading, setUploading] = useState(false)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/categories').then(r => r.json()).then(d => setCategories(d.categories || []))
  }, [])

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0]
    if (!f) return
    setFile(f)
    setPdfPreviewUrl(URL.createObjectURL(f))
    if (!title) setTitle(f.name.replace(/\.pdf$/i, '').replace(/_/g, ' '))
  }, [title])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  })

  function handleThumbnailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setThumbnail(f)
    setThumbnailPreview(URL.createObjectURL(f))
  }

  function toggleCategory(id: string) {
    setSelectedCategories(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !title) { toast({ title: 'Missing fields', variant: 'destructive' }); return }
    setUploading(true)

    const fd = new FormData()
    fd.append('file', file)
    fd.append('title', title)
    if (description) fd.append('description', description)
    if (selectedCategories.length > 0) fd.append('categories', JSON.stringify(selectedCategories))
    if (contactBox) fd.append('contact_box', JSON.stringify(contactBox))
    if (thumbnail) fd.append('thumbnail', thumbnail)

    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setUploading(false)

    if (!res.ok) {
      toast({ title: 'Upload failed', description: data.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Sell sheet uploaded!' })
    router.push(`/admin/sheets/${data.sheet.id}`)
  }

  return (
    <div>
      <Link href="/admin/sheets" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-6">
        <ChevronLeft className="h-4 w-4" /> All Sheets
      </Link>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Upload Sell Sheet</h1>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">

        {/* PDF drop */}
        <div>
          <Label>PDF File</Label>
          <div
            {...getRootProps()}
            className={`mt-1.5 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-[#1E5A96] bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-8 w-8 text-[#1E5A96]" />
                <div className="text-left">
                  <p className="font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button type="button" onClick={e => { e.stopPropagation(); setFile(null); setPdfPreviewUrl(null) }} className="ml-2 text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="text-gray-400">
                <Upload className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Drag & drop a PDF, or click to select</p>
              </div>
            )}
          </div>
        </div>

        {/* Thumbnail */}
        <div className="space-y-1.5">
          <Label>Preview Image (optional)</Label>
          <p className="text-xs text-gray-400">This appears as the card thumbnail on the home page. JPG or PNG.</p>
          <div className="flex items-center gap-4 mt-1">
            {thumbnailPreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbnailPreview} alt="Thumbnail preview" className="h-24 w-20 object-cover rounded-lg border" />
                <button type="button" onClick={() => { setThumbnail(null); setThumbnailPreview(null) }}
                  className="absolute -top-2 -right-2 bg-white rounded-full shadow p-0.5 text-gray-400 hover:text-red-500">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-24 w-20 border-2 border-dashed rounded-lg cursor-pointer text-gray-300 hover:border-gray-400 hover:text-gray-400 transition-colors">
                <Image className="h-6 w-6 mb-1" />
                <span className="text-xs">Upload</span>
                <input type="file" accept="image/*" className="sr-only" onChange={handleThumbnailChange} />
              </label>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Spring 2025 Protein Bars Offer" required />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="desc">Description (optional)</Label>
          <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description…" rows={3} />
        </div>

        {/* Categories */}
        <div className="space-y-1.5">
          <Label>Categories</Label>
          {categories.length === 0 ? (
            <p className="text-sm text-gray-400">No categories yet. <Link href="/admin/categories" className="text-[#1E5A96] hover:underline">Create one first.</Link></p>
          ) : (
            <div className="flex flex-wrap gap-2 mt-1">
              {categories.map(cat => (
                <button key={cat.id} type="button" onClick={() => toggleCategory(cat.id)} className="focus:outline-none">
                  <Badge variant={selectedCategories.includes(cat.id) ? 'default' : 'outline'} className="cursor-pointer text-sm py-1 px-3">
                    {cat.name}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Contact region picker */}
        {pdfPreviewUrl && (
          <div className="space-y-1.5">
            <Label>Contact Region</Label>
            <ContactRegionPicker pdfUrl={pdfPreviewUrl} value={contactBox} onChange={setContactBox} />
          </div>
        )}

        <Button type="submit" disabled={uploading || !file} className="gap-2">
          <Upload className="h-4 w-4" />
          {uploading ? 'Uploading…' : 'Upload Sell Sheet'}
        </Button>
      </form>
    </div>
  )
}
