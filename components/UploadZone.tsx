'use client'

import { useRef, useState } from 'react'

interface Props {
  previewUrl: string | null
  onFile: (file: File) => void
  disabled?: boolean
}

/**
 * Photo intake.
 *
 * Two entry points on purpose: `capture="environment"` opens the camera straight
 * away on mobile, while the plain picker covers the library and desktop. Both
 * feed the same handler. Drag-and-drop is wired up for desktop judges.
 */
export default function UploadZone({ previewUrl, onFile, disabled }: Props) {
  const pickerRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const take = (files: FileList | null) => {
    const file = files?.[0]
    if (file) onFile(file)
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        if (!disabled) take(e.dataTransfer.files)
      }}
      className={`glass neon-edge relative overflow-hidden transition ${
        dragOver ? 'ring-2 ring-neon-cyan' : ''
      }`}
    >
      <input
        ref={pickerRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => take(e.target.files)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => take(e.target.files)}
      />

      {previewUrl ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Your uploaded photo"
            className="block max-h-[46vh] w-full object-contain"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => pickerRef.current?.click()}
            className="absolute bottom-3 right-3 rounded-full border border-white/20 bg-black/60 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md transition active:scale-95 disabled:opacity-40"
          >
            Change photo
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5 px-6 py-12 text-center">
          <div className="relative grid h-20 w-20 place-items-center">
            <span className="absolute inset-0 rounded-full bg-neon-cyan/20 animate-pulse-ring" />
            <span className="grid h-20 w-20 place-items-center rounded-full border border-white/15 bg-white/5 backdrop-blur-md">
              <svg viewBox="0 0 24 24" className="h-9 w-9 text-neon-cyan" aria-hidden="true">
                <path
                  d="M3 9a2 2 0 012-2h1.6a2 2 0 001.7-.9l.8-1.2A2 2 0 0110.8 4h2.4a2 2 0 011.7.9l.8 1.2a2 2 0 001.7.9H19a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </span>
          </div>

          <div className="space-y-1.5">
            <p className="text-lg font-semibold text-white">Add your photo</p>
            <p className="text-sm text-slate-400">A selfie, a product, or your pet.</p>
          </div>

          <div className="flex w-full max-w-xs flex-col gap-2.5">
            <button
              type="button"
              disabled={disabled}
              onClick={() => cameraRef.current?.click()}
              className="w-full rounded-2xl bg-gradient-to-r from-neon-cyan to-nimiq-blue px-5 py-3.5 text-sm font-bold text-ink-900 shadow-neon transition active:scale-[0.98] disabled:opacity-40"
            >
              Take a photo
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => pickerRef.current?.click()}
              className="w-full rounded-2xl border border-white/15 bg-white/5 px-5 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition active:scale-[0.98] disabled:opacity-40"
            >
              Choose from library
            </button>
          </div>

          <p className="text-[0.6875rem] text-slate-500">
            Your photo is processed for this one generation and never stored.
          </p>
        </div>
      )}
    </div>
  )
}
