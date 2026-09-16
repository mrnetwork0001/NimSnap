'use client'

import { useEffect, useRef, useState } from 'react'
import CompareSlider from './CompareSlider'
import PresetIcon from './PresetIcon'
import { explorerUrl, railLabel, shortHash } from '@/lib/explorer'
import { downloadImage, prefetchImage, type SaveOutcome } from '@/lib/client/image'
import type { StylePreset } from '@/lib/presets'

interface Props {
  /**
   * The original photo. Absent when a result is recovered on a later visit -
   * the upload only ever lived in memory, so there is nothing to compare
   * against and the slider is replaced by the result alone.
   */
  beforeSrc?: string
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
  /** What the last save actually did, so the user is told rather than guessing. */
  const [saveNote, setSaveNote] = useState<string | null>(null)
  /**
   * The image, fetched as soon as the result renders.
   *
   * navigator.share() needs transient user activation, and awaiting a fetch
   * inside the click handler burns it. Having the blob ready means the share
   * sheet is reached while the activation is still live.
   */
  const blobRef = useRef<Blob | null>(null)

  useEffect(() => {
    let cancelled = false
    blobRef.current = null
    prefetchImage(afterSrc).then((b) => {
      if (!cancelled) blobRef.current = b
    })
    return () => {
      cancelled = true
    }
  }, [afterSrc])

  const save = async () => {
    setSaving(true)
    setSaveError(null)
    setSaveNote(null)
    try {
      const ext = afterSrc.split('?')[0].split('.').pop()
      const safeExt = ext && /^(jpg|jpeg|png|webp)$/i.test(ext) ? ext.toLowerCase() : 'jpg'
      const outcome: SaveOutcome = await downloadImage(
        afterSrc,
        `nimsnap-${preset.id}-${Date.now()}.${safeExt}`,
        blobRef.current,
      )
      // Only the long-press route needs explaining; the other two are self-evident.
      if (outcome === 'opened') {
        setSaveNote('Opened in a new tab - press and hold the image to save it.')
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save the image.')
    } finally {
      setSaving(false)
    }
  }

  const openTweet = (url: string) => {
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      SHARE_TEXT,
    )}&url=${encodeURIComponent(url)}`
    window.open(intent, '_blank', 'noopener,noreferrer')
  }

  /**
   * Share the shot.
   *
   * On a phone the native sheet can hand the image itself to another app, which
   * beats a prefilled tweet. Everywhere else, and whenever the sheet fails, we
   * fall back rather than swallowing the error - previously every failure was
   * caught and discarded, so the button simply did nothing.
   */
  const share = async () => {
    const url = shareUrl()
    setSaveError(null)
    setSaveNote(null)

    const nav = navigator as Navigator & {
      canShare?: (d: { files?: File[] }) => boolean
      share?: (d: { files?: File[]; title?: string; text?: string; url?: string }) => Promise<void>
    }

    if (nav.share) {
      const blob = blobRef.current
      const file = blob ? new File([blob], `nimsnap-${preset.id}.jpg`, { type: blob.type }) : null
      try {
        if (file && nav.canShare?.({ files: [file] })) {
          await nav.share({ files: [file], title: 'NimSnap', text: SHARE_TEXT })
        } else {
          await nav.share({ title: 'NimSnap', text: SHARE_TEXT, url })
        }
        return
      } catch (err) {
        // Dismissing the sheet is a choice; anything else means it did not work.
        if (err instanceof Error && err.name === 'AbortError') return
      }
    }

    openTweet(url)
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5 text-center">
        <p className="eyebrow flex items-center justify-center gap-1.5">
          <PresetIcon preset={preset.id} className="h-3.5 w-3.5" />
          {preset.name}
        </p>
        <h2 className="text-[1.75rem] leading-tight text-ink">Your shot is ready</h2>
        <p className="text-sm text-ink-muted">
          {beforeSrc
            ? 'Drag the handle to compare.'
            : 'Recovered from your last visit.'}
        </p>
      </div>

      {beforeSrc ? (
        <CompareSlider beforeSrc={beforeSrc} afterSrc={afterSrc} className="aspect-[4/5] w-full" />
      ) : (
        <div className="overflow-hidden rounded-panel border border-white bg-haze-200 shadow-lift">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={afterSrc} alt="Your NimSnap result" className="block aspect-[4/5] w-full object-cover" />
        </div>
      )}

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

      {saveNote && (
        <p role="status" className="text-center text-xs text-ink-muted">
          {saveNote}
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

      {txHash &&
        (() => {
          const href = explorerUrl(rail, txHash)
          const label = (
            <>
              Settled in {railLabel(rail)} ·{' '}
              <span className="font-mono">{shortHash(txHash)}</span>
            </>
          )
          // Linked when there is a public record to link to - the point is that
          // the user can check the payment themselves, not just be told about it.
          return href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="mx-auto flex items-center justify-center gap-1.5 text-center text-[0.6875rem] text-ink-soft underline decoration-ink-soft/40 underline-offset-2 transition hover:text-brand-500 hover:decoration-brand-500"
            >
              {label}
              <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 4h6v6" />
                <path d="M20 4l-8 8" />
                <path d="M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" />
              </svg>
              <span className="sr-only">View this payment on the block explorer</span>
            </a>
          ) : (
            <p className="text-center text-[0.6875rem] text-ink-soft">{label}</p>
          )
        })()}
    </div>
  )
}
