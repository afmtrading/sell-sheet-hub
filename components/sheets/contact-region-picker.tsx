'use client'

import { useRef, useState, useCallback } from 'react'
import type { ContactBox } from '@/types/database'

const PRESET_COLORS = [
  { label: 'White', value: '#FFFFFF', bg: 'bg-white border border-gray-300' },
  { label: 'Black', value: '#000000', bg: 'bg-black' },
  { label: 'Navy', value: '#0B1F3A', bg: 'bg-[#0B1F3A]' },
  { label: 'Blue', value: '#1E5A96', bg: 'bg-[#1E5A96]' },
  { label: 'Red', value: '#C01F1F', bg: 'bg-[#C01F1F]' },
]

interface ContactRegionPickerProps {
  pdfUrl: string
  value: ContactBox | null
  onChange: (box: ContactBox) => void
}

export function ContactRegionPicker({ pdfUrl, value, onChange }: ContactRegionPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; w: number; h: number } | null>(
    value ? { x: value.x, y: value.y, w: value.width, h: value.height } : null
  )
  const [pdfSize, setPdfSize] = useState({ width: 0, height: 0 })
  const [fontColor, setFontColor] = useState(value?.font_color || '#FFFFFF')

  const getRelativePos = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: Math.max(0, Math.min(e.clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(e.clientY - rect.top, rect.height)),
    }
  }, [])

  function buildContactBox(box: { x: number; y: number; w: number; h: number }, color: string): ContactBox {
    const PDF_W = 612
    const PDF_H = 792
    const displayW = pdfSize.width > 0 ? pdfSize.width : PDF_W
    const displayH = pdfSize.height > 0 ? pdfSize.height : PDF_H
    return {
      page: 1,
      x: Math.round(box.x * (PDF_W / displayW)),
      y: Math.round(box.y * (PDF_H / displayH)),
      width: Math.round(box.w * (PDF_W / displayW)),
      height: Math.round(box.h * (PDF_H / displayH)),
      font_color: color,
    }
  }

  function onMouseDown(e: React.MouseEvent) {
    const pos = getRelativePos(e)
    setStartPos(pos)
    setIsDrawing(true)
    setCurrentBox(null)
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!isDrawing) return
    const pos = getRelativePos(e)
    setCurrentBox({
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      w: Math.abs(pos.x - startPos.x),
      h: Math.abs(pos.y - startPos.y),
    })
  }

  function onMouseUp(e: React.MouseEvent) {
    if (!isDrawing) return
    setIsDrawing(false)
    const pos = getRelativePos(e)
    const box = {
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      w: Math.abs(pos.x - startPos.x),
      h: Math.abs(pos.y - startPos.y),
    }
    if (box.w < 10 || box.h < 10) return
    setCurrentBox(box)
    onChange(buildContactBox(box, fontColor))
  }

  function handleColorChange(color: string) {
    setFontColor(color)
    if (currentBox) onChange(buildContactBox(currentBox, color))
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        Drag to mark the <strong>contact info region</strong> on the PDF (page 1).
      </p>

      {/* Font color picker */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-600">Text color:</span>
        <div className="flex items-center gap-2">
          {PRESET_COLORS.map(c => (
            <button
              key={c.value}
              type="button"
              title={c.label}
              onClick={() => handleColorChange(c.value)}
              className={`w-7 h-7 rounded-full ${c.bg} transition-transform ${fontColor === c.value ? 'ring-2 ring-offset-2 ring-[#1E5A96] scale-110' : ''}`}
            />
          ))}
          {/* Custom color */}
          <label className="cursor-pointer" title="Custom color">
            <div
              className="w-7 h-7 rounded-full border border-dashed border-gray-400 flex items-center justify-center text-xs text-gray-400 hover:border-gray-600"
              style={{ background: !PRESET_COLORS.find(c => c.value === fontColor) ? fontColor : 'transparent' }}
            >
              {!PRESET_COLORS.find(c => c.value === fontColor) ? '' : '+'}
            </div>
            <input
              type="color"
              className="sr-only"
              value={fontColor}
              onChange={e => handleColorChange(e.target.value)}
            />
          </label>
        </div>
        <span className="text-xs text-gray-400 font-mono">{fontColor}</span>
      </div>

      {/* PDF canvas */}
      <div
        ref={containerRef}
        className="relative border rounded-lg overflow-hidden cursor-crosshair select-none bg-gray-50"
        style={{ maxHeight: 500 }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      >
        <iframe
          src={`${pdfUrl}#page=1&toolbar=0&navpanes=0&scrollbar=0`}
          className="w-full pointer-events-none"
          style={{ height: 500 }}
          title="PDF preview"
          onLoad={(e) => {
            const iframe = e.currentTarget
            setPdfSize({ width: iframe.offsetWidth, height: iframe.offsetHeight })
          }}
        />
        {currentBox && (
          <div
            className="absolute border-2 border-[#1E5A96] bg-[#1E5A96]/20 pointer-events-none"
            style={{ left: currentBox.x, top: currentBox.y, width: currentBox.w, height: currentBox.h }}
          >
            <span className="absolute -top-5 left-0 text-xs bg-[#1E5A96] text-white px-1 rounded whitespace-nowrap">
              Contact area
            </span>
          </div>
        )}
      </div>

      {value && (
        <p className="text-xs text-gray-400">
          Region set · color: <span className="font-mono">{value.font_color || '#FFFFFF'}</span>
        </p>
      )}
    </div>
  )
}
