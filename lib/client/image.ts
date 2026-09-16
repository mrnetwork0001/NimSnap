'use client'

import { MAX_UPLOAD_BYTES } from '../config'

/**
 * Client-side image preparation.
 *
 * A modern phone camera emits 8-12MB HEIC/JPEG files. Sending that untouched as
 * a base64 data URI would be slow on mobile data and would blow past the request
 * body limit, so we downscale and re-encode before the photo ever leaves the
 * device. This is also the single biggest lever on perceived speed.
 */

/** Longest edge we send to the model. Enough detail for an HD result. */
const MAX_EDGE = 1280

/** Encoder quality, stepped down if the first pass is still too heavy. */
const QUALITY_LADDER = [0.86, 0.74, 0.62]

export interface PreparedImage {
  dataUri: string
  width: number
  height: number
  bytes: number
}

export class ImageError extends Error {}

function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    // Honours EXIF orientation, so selfies do not arrive sideways.
    return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => loadViaElement(file))
  }
  return loadViaElement(file)
}

/** iPhone's default capture format, which most browsers cannot decode. */
function looksLikeHeic(file: File): boolean {
  return (
    /heic|heif/i.test(file.type) ||
    (/\.(heic|heif)$/i.test(file.name) && !file.type.startsWith('image/jpeg'))
  )
}

const HEIC_ADVICE =
  'iPhone photos saved as HEIC cannot be read here. In Settings > Camera > Formats ' +
  'choose "Most Compatible", or take a screenshot of the photo and use that.'

function loadViaElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    // A decode that never fires load or error would hang the app forever.
    const timer = setTimeout(() => {
      URL.revokeObjectURL(url)
      reject(new ImageError('That photo took too long to open. Try a smaller one.'))
    }, 20_000)
    img.onload = () => {
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      // Naming the real cause is the difference between a dead end and a fix
      // the user can actually apply.
      reject(new ImageError(looksLikeHeic(file) ? HEIC_ADVICE : 'That file could not be read as an image.'))
    }
    img.src = url
  })
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  // Some pickers hand over a blank or generic MIME type for a perfectly good
  // photo, so the extension gets a say before anything is rejected.
  const looksImage =
    file.type.startsWith('image/') ||
    /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i.test(file.name) ||
    file.type === ''
  if (!looksImage) {
    throw new ImageError('Please choose an image file.')
  }
  if (file.size === 0) {
    throw new ImageError('That file is empty. Try picking the photo again.')
  }
  const maxBytes = MAX_UPLOAD_BYTES * 4
  if (file.size > maxBytes) {
    throw new ImageError(
      `That photo is too large (${Math.round(file.size / 1e6)}MB). ` +
        `The limit is ${Math.round(maxBytes / 1e6)}MB.`,
    )
  }

  const bitmap = await loadBitmap(file)
  const srcW = 'width' in bitmap ? bitmap.width : 0
  const srcH = 'height' in bitmap ? bitmap.height : 0
  if (!srcW || !srcH) throw new ImageError('That image appears to be empty.')

  const scale = Math.min(1, MAX_EDGE / Math.max(srcW, srcH))
  // An extreme aspect ratio can round the short edge to zero, which produces a
  // blank "data:," URI that is only rejected after the user has paid.
  const width = Math.max(1, Math.round(srcW * scale))
  const height = Math.max(1, Math.round(srcH * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new ImageError('This browser cannot process images.')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, width, height)
  if ('close' in bitmap) bitmap.close()

  for (const quality of QUALITY_LADDER) {
    const dataUri = canvas.toDataURL('image/jpeg', quality)
    const bytes = Math.ceil((dataUri.length * 3) / 4)
    if (bytes <= MAX_UPLOAD_BYTES) return { dataUri, width, height, bytes }
  }
  throw new ImageError('That photo could not be compressed enough. Try a smaller one.')
}

/**
 * Save the finished image to the device.
 *
 * Two traps make this harder than it looks.
 *
 * First, `navigator.share()` requires *transient user activation*. Fetching the
 * image before calling it burns that window, and share then throws
 * NotAllowedError - so the blob must already be in hand when the click arrives.
 * `prefetchImage` is what puts it there.
 *
 * Second, `<a download>` is unreliable in in-app webviews (Nimiq Pay, Instagram,
 * X), which often ignore the attribute so the click silently does nothing.
 *
 * So: on touch devices prefer the share sheet, which is the only route that
 * reliably reaches the camera roll; on desktop prefer a real download, because
 * a share sheet is a strange answer to a button labelled "Download HD".
 */
export type SaveOutcome = 'saved' | 'shared' | 'opened'

/**
 * Fetch the image ahead of the click so the save path needs no await before
 * reaching the share sheet. Safe to call repeatedly; failures are swallowed
 * because this is an optimisation, not the save itself.
 */
export async function prefetchImage(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.blob()
  } catch {
    return null
  }
}

/**
 * Touch-first devices are where the share sheet is the right answer.
 *
 * Three signals rather than one, because getting this wrong on mobile is the
 * expensive direction: a misdetected phone falls back to `<a download>`, which
 * in-app webviews silently ignore, and the user who just paid gets nothing. A
 * misdetected desktop merely sees a share sheet it did not need.
 */
function prefersShareSheet(): boolean {
  if (typeof window === 'undefined') return false
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const noHover = window.matchMedia?.('(hover: none)').matches ?? false
  const touch = (navigator.maxTouchPoints ?? 0) > 0
  return coarse || noHover || touch
}

function saveViaAnchor(blob: Blob, filename: string): SaveOutcome {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000)
  return 'saved'
}

export async function downloadImage(
  url: string,
  filename: string,
  prefetched?: Blob | null,
): Promise<SaveOutcome> {
  // Use the prefetched blob when we have one: fetching here would cost us the
  // user activation that the share sheet depends on.
  const blob = prefetched ?? (await prefetchImage(url))
  if (!blob) {
    throw new ImageError('The image could not be downloaded. Check your connection.')
  }

  const file = new File([blob], filename, { type: blob.type || 'image/jpeg' })
  const nav = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean
    share?: (data: { files?: File[]; title?: string }) => Promise<void>
  }

  if (prefersShareSheet() && nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'NimSnap' })
      return 'shared'
    } catch (err) {
      // Dismissing the sheet is a decision, not a failure - do not then shove a
      // second UI at the user.
      if (err instanceof Error && err.name === 'AbortError') return 'shared'
      // Anything else (activation lost, unsupported) falls through to a download.
    }
  }

  try {
    if ('download' in document.createElement('a')) return saveViaAnchor(blob, filename)
  } catch {
    /* fall through */
  }

  // Last resort: show it so it can be long-pressed. Worse than a real save, far
  // better than a button that does nothing.
  const objectUrl = URL.createObjectURL(blob)
  const opened = window.open(objectUrl, '_blank', 'noopener')
  if (!opened) {
    URL.revokeObjectURL(objectUrl)
    throw new ImageError(
      'Your browser blocked the download. Press and hold the image above to save it.',
    )
  }
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
  return 'opened'
}
