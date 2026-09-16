'use client'

import { useState } from 'react'
import CompareSlider from './CompareSlider'
import PresetIcon from './PresetIcon'
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
  'Just turned a photo into a studio shot on NimSnap for $0.10 - paid instantly with Nimiq Pay. No subscription, no signup.'

/**
 * Nimiq Pay opens mini apps through this deeplink form.
 *
 * Points at /app rather than the site root so a shared link drops the recipient
 * straight into the studio instead of the marketing page.
 */
function shareUrl(): string {
  if (typeof window === 'undefined') return 'https://nimpay.app/miniapps/open/'
  return `https://nimpay.app/miniapps/open/${window.location.host}/app`
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
        <p className="eyebrow flex items-center justify-center gap-1.5">
          <PresetIcon preset={preset.id} className="h-3.5 w-3.5" />
          {preset.name}
        </p>
        <h2 className="text-[1.75rem] leading-tight text-ink">Your shot is ready</h2>
        <p className="text-sm text-ink-muted">Drag the handle to compare.</p>
      </div>

      <CompareSlider
        beforeSrc={beforeSrc}
        afterSrc={afterSrc}
        className="aspect-[4/5] w-full"
      />

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="btn-primary text-sm"
        >
          {saving ? 'Saving…' : 'Download HD'}
        </button>
        <button
          type="button"
          onClick={share}
          className="btn-ghost text-sm"
        >
          Share
        </button>
      </div>

      {!durable && (
        <p
          role="alert"
          className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-2.5 text-center text-xs text-amber-900"
        >
          Save this now - we could not store a permanent copy, so this link
          expires within the hour.
        </p>
      )}

      {saveError && (
        <p role="alert" className="text-center text-xs text-rose-600">
          {saveError}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onAnotherStyle}
          className="btn-ghost py-3 text-sm"
        >
          Try another style
        </button>
        <button
          type="button"
          onClick={onStartOver}
          className="btn-ghost py-3 text-sm"
        >
          New photo
        </button>
      </div>

      {txHash && (
        <p className="text-center font-mono text-[0.625rem] text-ink-soft">
          Settled in {rail?.toUpperCase()} · {txHash.slice(0, 10)}…{txHash.slice(-6)}
        </p>
      )}
    </div>
  )
}
