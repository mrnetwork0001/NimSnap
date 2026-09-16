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

function loadViaElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new ImageError('That file could not be read as an image.'))
    }
    img.src = url
  })
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith('image/')) {
    throw new ImageError('Please choose an image file.')
  }
  if (file.size > MAX_UPLOAD_BYTES * 4) {
    throw new ImageError('That photo is far too large. Try one under 40MB.')
  }

  const bitmap = await loadBitmap(file)
  const srcW = 'width' in bitmap ? bitmap.width : 0
  const srcH = 'height' in bitmap ? bitmap.height : 0
  if (!srcW || !srcH) throw new ImageError('That image appears to be empty.')

  const scale = Math.min(1, MAX_EDGE / Math.max(srcW, srcH))
  const width = Math.round(srcW * scale)
  const height = Math.round(srcH * scale)

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
 * `<a download>` is unreliable in exactly the place this app runs: in-app
 * webviews (Nimiq Pay, Instagram, X) frequently ignore the attribute entirely,
 * so the click silently does nothing and a paying user is left with no file and
 * no error. Three strategies are tried in order of how good the outcome is.
 *
 * Resolves with the strategy that worked so the UI can tell the user what to do
 * next - "saved" needs no follow-up, "shared" hands off to the share sheet, and
 * "opened" means they must press and hold the image themselves.
 */
export type SaveOutcome = 'saved' | 'shared' | 'opened'

export async function downloadImage(url: string, filename: string): Promise<SaveOutcome> {
  let blob: Blob
  try {
    const res = await fetch(url)
    if (!res.ok) throw new ImageError(`The image could not be fetched (${res.status}).`)
    blob = await res.blob()
  } catch (err) {
    if (err instanceof ImageError) throw err
    throw new ImageError('The image could not be downloaded. Check your connection.')
  }

  const file = new File([blob], filename, { type: blob.type || 'image/jpeg' })

  // 1. The native share sheet. On iOS and Android this is the only route that
  //    reliably reaches the camera roll from inside a webview, and it is what
  //    people expect on a phone.
  try {
    const nav = navigator as Navigator & {
      canShare?: (data: { files?: File[] }) => boolean
      share?: (data: { files?: File[]; title?: string }) => Promise<void>
    }
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: 'NimSnap' })
      return 'shared'
    }
  } catch (err) {
    // A user dismissing the sheet is a decision, not a failure - do not fall
    // through and shove a second UI at them.
    if (err instanceof Error && err.name === 'AbortError') return 'shared'
  }

  // 2. A real download, which is right on desktop.
  const objectUrl = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement('a')
    if ('download' in anchor) {
      anchor.href = objectUrl
      anchor.download = filename
      anchor.rel = 'noopener'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000)
      return 'saved'
    }
  } catch {
    /* fall through to opening it */
  }

  // 3. Last resort: put the image on screen so it can be long-pressed. Worse
  //    than a real save, but far better than a button that does nothing.
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
