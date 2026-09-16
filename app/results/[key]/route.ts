import { createReadStream, existsSync, statSync } from 'fs'
import { join } from 'path'
import { Readable } from 'stream'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Serve a stored result.
 *
 * Results cannot live in public/: Next.js enumerates that directory once at boot
 * in production, so anything written there at request time is never served and a
 * paying user gets a broken image. They are written outside it and streamed from
 * here instead.
 *
 * Only the local-disk backend needs this route - when S3 is configured the URL
 * points at the bucket and never reaches us.
 */
const LOCAL_DIR = process.env.RESULT_LOCAL_DIR ?? '.data/results'

/** 16 random bytes plus a known image extension. Anything else is not ours. */
const KEY_PATTERN = /^[0-9a-f]{32}\.(jpg|png|webp)$/

const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export async function GET(_req: Request, { params }: { params: { key: string } }) {
  const key = params.key
  // The pattern is the path-traversal guard: no slashes, no dots beyond the
  // extension, nothing that could escape the results directory.
  if (!KEY_PATTERN.test(key)) {
    return new NextResponse('Not found', { status: 404 })
  }

  const path = join(process.cwd(), LOCAL_DIR, key)
  if (!existsSync(path)) {
    return new NextResponse('Not found', { status: 404 })
  }

  const ext = key.slice(key.lastIndexOf('.') + 1)
  const { size } = statSync(path)

  return new NextResponse(Readable.toWeb(createReadStream(path)) as ReadableStream, {
    headers: {
      'content-type': MIME[ext] ?? 'application/octet-stream',
      'content-length': String(size),
      // The key is unguessable and the bytes never change, so this is safe to
      // cache hard - it keeps a re-opened result instant.
      'cache-control': 'public, max-age=31536000, immutable',
    },
  })
}
