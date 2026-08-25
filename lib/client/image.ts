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
 * The result is served from Replicate's CDN, so we fetch it into a blob first:
 * a bare cross-origin `download` attribute is ignored by most browsers and would
 * silently navigate away from the app instead of saving.
 */
export async function downloadImage(url: string, filename: string): Promise<void> {
  const res = await fetch(url)
  if (!res.ok) throw new ImageError('The image could not be downloaded.')
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Give the browser a beat to start the save before revoking.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000)
}
