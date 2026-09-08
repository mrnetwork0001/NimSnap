'use client'

import { useState } from 'react'
import CompareSlider from './CompareSlider'
import { downloadImage } from '@/lib/client/image'
import type { StylePreset } from '@/lib/presets'

interface Props {
  beforeSrc: string
  afterSrc: string
  preset: StylePreset
  txHash?: string
  rail?: string
  /** False when the image sits on a link that expires within the hour. */
  durable?: boolean
  onStartOver: () => void
  onAnotherStyle: () => void
}

const SHARE_TEXT =
  'Just turned a photo into a studio shot on NimSnap for $0.10 — paid instantly with Nimiq Pay. No subscription, no signup.'

/** Nimiq Pay opens mini apps through this deeplink form. */
function shareUrl(): string {
  if (typeof window === 'undefined') return 'https://nimpay.app/miniapps/open/'
  return `https://nimpay.app/miniapps/open/${window.location.host}`
}

export default function ResultView({
  beforeSrc,
  afterSrc,
  preset,
  txHash,
  rail,
  durable = true,
  onStartOver,
  onAnotherStyle,
}: Props) {
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      await downloadImage(afterSrc, `nimsnap-${preset.id}-${Date.now()}.jpg`)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save the image.')
    } finally {
      setSaving(false)
    }
  }

  const share = () => {
    const url = shareUrl()
    // Prefer the native sheet: on mobile it can hand the image straight to another
    // app, which is a far better share than a prefilled tweet.
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: 'NimSnap', text: SHARE_TEXT, url }).catch(() => {})
      return
    }
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      SHARE_TEXT,
    )}&url=${encodeURIComponent(url)}`
    window.open(intent, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5 text-center">
        <p className="label-xs">{preset.emoji} {preset.name}</p>
        <h2 className="text-2xl font-extrabold text-white">Your shot is ready</h2>
        <p className="text-sm text-slate-400">Drag the handle to compare.</p>
      </div>

      <CompareSlider
        beforeSrc={beforeSrc}
        afterSrc={afterSrc}
        className="aspect-[4/5] w-full shadow-glass"
      />

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-2xl bg-gradient-to-r from-neon-cyan to-nimiq-blue px-4 py-3.5 text-sm font-bold text-ink-900 shadow-neon transition active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Download HD'}
        </button>
        <button
          type="button"
          onClick={share}
          className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition active:scale-[0.98]"
        >
          Share
        </button>
      </div>

      {!durable && (
        <p
          role="alert"
          className="rounded-2xl border border-nimiq-gold/30 bg-nimiq-gold/[0.07] px-4 py-2.5 text-center text-xs text-amber-100/90"
        >
          Save this now — we could not store a permanent copy, so this link
          expires within the hour.
        </p>
      )}

      {saveError && (
        <p role="alert" className="text-center text-xs text-nimiq-red">
          {saveError}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onAnotherStyle}
          className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-200 transition active:scale-[0.98]"
        >
          Try another style
        </button>
        <button
          type="button"
          onClick={onStartOver}
          className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-200 transition active:scale-[0.98]"
        >
          New photo
        </button>
      </div>

      {txHash && (
        <p className="text-center font-mono text-[0.625rem] text-slate-600">
          Settled in {rail?.toUpperCase()} · {txHash.slice(0, 10)}…{txHash.slice(-6)}
        </p>
      )}
    </div>
  )
}
