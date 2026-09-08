import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { rm, readFile, writeFile } from 'fs/promises'
import { join } from 'path'

/**
 * Replicate deletes model output after an hour, so a paid result has to be
 * copied somewhere durable before we hand it over. The property that matters
 * most: a storage problem must never cost somebody the generation they paid
 * for — we degrade to the expiring URL and say so, rather than failing.
 */

const TMP = 'test-results-tmp'
const BLOCKED = 'test-results-blocked'

async function freshStorage(env: Record<string, string | undefined> = {}) {
  vi.resetModules()
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  return import('@/lib/storage')
}

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4])

const okImage = () =>
  vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'image/jpeg' }),
    arrayBuffer: async () => JPEG.buffer,
    text: async () => '',
  })

beforeEach(() => {
  for (const k of ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_PUBLIC_BASE']) {
    delete process.env[k]
  }
  process.env.RESULT_LOCAL_DIR = TMP
  process.env.RESULT_PUBLIC_BASE = '/results'
})

afterEach(async () => {
  vi.unstubAllGlobals()
  await rm(join(process.cwd(), TMP), { recursive: true, force: true })
  await rm(join(process.cwd(), BLOCKED), { recursive: true, force: true })
})

describe('local backend', () => {
  test('writes the image to disk and returns a stable public path', async () => {
    vi.stubGlobal('fetch', okImage())
    const { persistResult } = await freshStorage()
    const r = await persistResult('https://replicate.delivery/abc.jpg', 'deadbeefdeadbeef')

    expect(r.durable).toBe(true)
    expect(r.url).toBe('/results/deadbeefdeadbeef.jpg')
    const written = await readFile(join(process.cwd(), TMP, 'deadbeefdeadbeef.jpg'))
    expect(new Uint8Array(written)).toEqual(JPEG)
  })

  test('names the object after the order, so a file traces back to its payment', async () => {
    vi.stubGlobal('fetch', okImage())
    const { persistResult } = await freshStorage()
    expect((await persistResult('https://x/y.jpg', 'aaaabbbbccccdddd')).url).toContain('aaaabbbbccccdddd')
  })

  test('honours the content type when choosing an extension', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200,
      headers: new Headers({ 'content-type': 'image/png' }),
      arrayBuffer: async () => JPEG.buffer, text: async () => '',
    }))
    const { persistResult } = await freshStorage()
    expect((await persistResult('https://x/y', 'deadbeefdeadbeef')).url).toMatch(/\.png$/)
  })
})

describe('degradation', () => {
  test('falls back to the expiring URL when the source cannot be read', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, headers: new Headers(), arrayBuffer: async () => JPEG.buffer, text: async () => '' }))
    const { persistResult } = await freshStorage()
    const src = 'https://replicate.delivery/gone.jpg'
    const r = await persistResult(src, 'deadbeefdeadbeef')

    // The user still gets their image; we just cannot promise it will last.
    expect(r.url).toBe(src)
    expect(r.durable).toBe(false)
  })

  test('falls back rather than throwing when the source fetch errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    const { persistResult } = await freshStorage()
    const r = await persistResult('https://x/y.jpg', 'deadbeefdeadbeef')
    expect(r.durable).toBe(false)
    expect(r.url).toBe('https://x/y.jpg')
  })

  test('falls back when the write target is unusable', async () => {
    vi.stubGlobal('fetch', okImage())
    // Put a regular file where the results directory needs to be, so mkdir
    // fails with ENOTDIR the way a bad mount or a permissions problem would.
    const blocker = join(process.cwd(), BLOCKED)
    await writeFile(blocker, 'not a directory')
    try {
      const { persistResult } = await freshStorage({ RESULT_LOCAL_DIR: `${BLOCKED}/sub` })
      const r = await persistResult('https://x/y.jpg', 'deadbeefdeadbeef')
      expect(r.durable).toBe(false)
      expect(r.url).toBe('https://x/y.jpg')
    } finally {
      await rm(blocker, { force: true })
    }
  })
})

describe('s3 backend', () => {
  const s3Env = {
    S3_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
    S3_BUCKET: 'nimsnap',
    S3_ACCESS_KEY_ID: 'AKIAEXAMPLE',
    S3_SECRET_ACCESS_KEY: 'secret',
    S3_PUBLIC_BASE: 'https://cdn.nimsnap.test',
  }

  test('is selected when credentials are present', async () => {
    const { storageBackend } = await freshStorage(s3Env)
    expect(storageBackend()).toBe('s3')
  })

  test('local is selected when they are not', async () => {
    const { storageBackend } = await freshStorage()
    expect(storageBackend()).toBe('local')
  })

  test('uploads with a signed PUT and returns the public URL', async () => {
    const calls: { url: string; init: RequestInit }[] = []
    const f = vi.fn().mockImplementation((url: string | URL, init?: RequestInit) => {
      const href = url.toString()
      if (init?.method === 'PUT') {
        calls.push({ url: href, init })
        return Promise.resolve({ ok: true, status: 200, text: async () => '' })
      }
      return Promise.resolve({
        ok: true, status: 200,
        headers: new Headers({ 'content-type': 'image/jpeg' }),
        arrayBuffer: async () => JPEG.buffer, text: async () => '',
      })
    })
    vi.stubGlobal('fetch', f)

    const { persistResult } = await freshStorage(s3Env)
    const r = await persistResult('https://replicate.delivery/a.jpg', 'deadbeefdeadbeef')

    expect(r.durable).toBe(true)
    expect(r.url).toBe('https://cdn.nimsnap.test/deadbeefdeadbeef.jpg')

    expect(calls).toHaveLength(1)
    const headers = calls[0].init.headers as Record<string, string>
    expect(calls[0].url).toBe('https://account.r2.cloudflarestorage.com/nimsnap/deadbeefdeadbeef.jpg')
    expect(headers.authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=AKIAEXAMPLE\//)
    expect(headers.authorization).toMatch(/Signature=[0-9a-f]{64}/)
    expect(headers['x-amz-content-sha256']).toMatch(/^[0-9a-f]{64}$/)
    expect(headers['x-amz-date']).toMatch(/^\d{8}T\d{6}Z$/)
  })

  test('falls back to the expiring URL when the upload is rejected', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((_u, init?: RequestInit) =>
      init?.method === 'PUT'
        ? Promise.resolve({ ok: false, status: 403, text: async () => 'AccessDenied' })
        : Promise.resolve({
            ok: true, status: 200,
            headers: new Headers({ 'content-type': 'image/jpeg' }),
            arrayBuffer: async () => JPEG.buffer, text: async () => '',
          }),
    ))
    const { persistResult } = await freshStorage(s3Env)
    const r = await persistResult('https://replicate.delivery/a.jpg', 'deadbeefdeadbeef')
    expect(r.durable).toBe(false)
    expect(r.url).toBe('https://replicate.delivery/a.jpg')
  })
})
