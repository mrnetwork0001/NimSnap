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
 * Two entry points on purpose: `capture` opens the camera straight away on
 * mobile, while the plain picker covers the library and desktop. Both feed the
 * same handler. Drag-and-drop is wired up for desktop.
 *
 * `capture="user"` rather than "environment": three of the four presets are
 * portrait styles, so the front camera is the right default. Either way the user
 * can flip it inside the camera UI.
 *
 * The library input deliberately lists concrete types instead of `image/*`.
 * That wildcard is what Android routes to its *media* picker, which offers the
 * camera alongside the gallery - and MIUI resolves it straight to the camera,
 * so "Choose from library" opened the viewfinder on every Redmi and Xiaomi
 * device. Naming the types sends the intent to the documents picker instead,
 * which only ever shows files. iOS was never affected because it shows its own
 * action sheet either way, which is why this only ever reproduced on Android.
 * Extensions are listed next to the MIME types because some Android pickers
 * match on the filename and hand over a blank or generic type.
 */

/**
 * Concrete image types for the library picker. Keep this in sync with the
 * formats decodeToJpeg() accepts, and do NOT collapse it back to `image/*`.
 */
const LIBRARY_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  'image/avif', 'image/gif', 'image/bmp',
  '.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.avif', '.gif', '.bmp',
].join(',')
export default function UploadZone({ previewUrl, onFile, disabled }: Props) {
  const pickerRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const take = (files: FileList | null, input?: HTMLInputElement | null) => {
    const file = files?.[0]
    // Clearing the input is what makes picking the SAME photo twice work. The
    // change event does not fire when the value is unchanged, so after an error
    // the obvious retry - pick that photo again - was a silent no-op.
    if (input) input.value = ''
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
      className={`card overflow-hidden transition ${dragOver ? 'ring-2 ring-brand-400' : ''}`}
    >
      <input ref={pickerRef} type="file" accept={LIBRARY_TYPES} className="sr-only" onChange={(e) => take(e.target.files, e.target)} />
      <input ref={cameraRef} type="file" accept="image/*" capture="user" className="sr-only" onChange={(e) => take(e.target.files, e.target)} />

      {previewUrl ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Your uploaded photo" className="block max-h-[46vh] w-full object-contain" />
          <button
            type="button"
            disabled={disabled}
            onClick={() => pickerRef.current?.click()}
            className="btn-ghost absolute bottom-3 right-3 px-4 py-2 text-xs"
          >
            Change photo
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5 px-6 py-12 text-center">
          <div className="relative grid h-[4.5rem] w-[4.5rem] place-items-center">
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-300/35" />
            <span className="grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full border border-white bg-white/85 shadow-lift">
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-brand-500" aria-hidden="true">
                <path d="M3 9a2 2 0 012-2h1.6a2 2 0 001.7-.9l.8-1.2A2 2 0 0110.8 4h2.4a2 2 0 011.7.9l.8 1.2a2 2 0 001.7.9H19a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </span>
          </div>

          <div className="space-y-1.5">
            <p className="text-lg font-bold tracking-[-0.02em] text-ink">Add your photo</p>
            <p className="text-sm text-ink-muted">A selfie, a product, or your pet.</p>
          </div>

          <div className="flex w-full max-w-xs flex-col gap-2.5">
            <button type="button" disabled={disabled} onClick={() => cameraRef.current?.click()} className="btn-primary w-full">
              Take a photo
            </button>
            <button type="button" disabled={disabled} onClick={() => pickerRef.current?.click()} className="btn-ghost w-full">
              Choose from library
            </button>
          </div>

          <p className="max-w-[17rem] text-[0.6875rem] leading-relaxed text-ink-soft">
            Your photo is sent to our AI provider to generate this one result.
          </p>
        </div>
      )}
    </div>
  )
}
