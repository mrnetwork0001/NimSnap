import { createHash } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'

/**
 * Result storage.
 *
 * Replicate deletes prediction output after an hour ("You must save a copy of
 * any files in the output if you'd like to continue using them"). Handing that
 * URL straight to the client meant a paying user who came back later found a
 * broken image — they paid $0.10 for something that evaporated.
 *
 * So we copy the result somewhere durable before returning it. The backend is
 * chosen from the environment:
 *
 *  - S3-compatible (Cloudflare R2, AWS S3, Backblaze) when S3_* is configured
 *  - local disk otherwise, which is correct for a container or VM with a volume
 *
 * If persistence fails we fall back to the upstream URL rather than failing the
 * whole generation: a result that works for an hour beats no result at all for
 * someone who has already paid. The caller is told which happened.
 */

export interface StoredResult {
  url: string
  /** False when we had to fall back to the upstream, expiring URL. */
  durable: boolean
}

const PUBLIC_DIR = process.env.RESULT_LOCAL_DIR ?? 'public/results'
const PUBLIC_BASE = process.env.RESULT_PUBLIC_BASE ?? '/results'

interface S3Config {
  endpoint: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  region: string
  publicBase: string
}

function s3Config(): S3Config | null {
  const endpoint = process.env.S3_ENDPOINT
  const bucket = process.env.S3_BUCKET
  const accessKeyId = process.env.S3_ACCESS_KEY_ID
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null
  return {
    endpoint: endpoint.replace(/\/+$/, ''),
    bucket,
    accessKeyId,
    secretAccessKey,
    region: process.env.S3_REGION ?? 'auto',
    // Where the object will be publicly readable from. Falls back to the
    // endpoint, which is right for R2 public buckets and path-style S3.
    publicBase: (process.env.S3_PUBLIC_BASE ?? `${endpoint.replace(/\/+$/, '')}/${bucket}`).replace(/\/+$/, ''),
  }
}

/* ------------------------------------------------------- SigV4 signing ---- */

const enc = (s: string) => new TextEncoder().encode(s)
const hex = (b: ArrayBuffer) => Buffer.from(b).toString('hex')

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey('raw', key as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return crypto.subtle.sign('HMAC', k, enc(data))
}

function sha256Hex(body: Uint8Array | string): string {
  return createHash('sha256').update(body).digest('hex')
}

/**
 * Sign and send a single PutObject with AWS Signature V4.
 *
 * Hand-rolled rather than pulling in the AWS SDK: this is the only S3 call the
 * app ever makes, and the SDK would add tens of megabytes to a deployment for
 * one request.
 */
async function putToS3(cfg: S3Config, key: string, body: Uint8Array, contentType: string): Promise<string> {
  const url = new URL(`${cfg.endpoint}/${cfg.bucket}/${key}`)
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)
  const payloadHash = sha256Hex(body)

  const headers: Record<string, string> = {
    host: url.host,
    'content-type': contentType,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  }
  const signedHeaders = Object.keys(headers).sort().join(';')
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((h) => `${h}:${headers[h]}\n`)
    .join('')

  const canonicalRequest = [
    'PUT',
    url.pathname,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  const scope = `${dateStamp}/${cfg.region}/s3/aws4_request`
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join('\n')

  let signingKey: ArrayBuffer | Uint8Array = enc(`AWS4${cfg.secretAccessKey}`)
  for (const part of [dateStamp, cfg.region, 's3', 'aws4_request']) {
    signingKey = await hmac(signingKey, part)
  }
  const signature = hex(await hmac(signingKey, stringToSign))

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      ...headers,
      authorization:
        `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${scope}, ` +
        `SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    body: body as BodyInit,
  })
  if (!res.ok) {
    throw new Error(`S3 upload failed (${res.status}): ${(await res.text()).slice(0, 200)}`)
  }
  return `${cfg.publicBase}/${key}`
}

/* ------------------------------------------------------------- public ---- */

/**
 * Copy a finished generation somewhere it will still exist tomorrow.
 *
 * @param sourceUrl the model's output URL, which is short-lived
 * @param orderId   used to name the object, so a result is traceable to its payment
 */
export async function persistResult(sourceUrl: string, orderId: string): Promise<StoredResult> {
  let bytes: Uint8Array
  let contentType = 'image/jpeg'
  try {
    const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(20_000) })
    if (!res.ok) throw new Error(`source responded ${res.status}`)
    contentType = res.headers.get('content-type') ?? contentType
    bytes = new Uint8Array(await res.arrayBuffer())
  } catch (err) {
    // Could not even read the model output — nothing to persist. Hand back the
    // original so the user still gets their image while it lasts.
    console.error('[storage] could not download model output:', err)
    return { url: sourceUrl, durable: false }
  }

  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
  const key = `${orderId}.${ext}`
  const cfg = s3Config()

  try {
    if (cfg) return { url: await putToS3(cfg, key, bytes, contentType), durable: true }

    const dir = join(process.cwd(), PUBLIC_DIR)
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, key), bytes)
    return { url: `${PUBLIC_BASE}/${key}`, durable: true }
  } catch (err) {
    // A storage outage must not cost somebody the generation they paid for.
    console.error('[storage] persistence failed, falling back to the expiring URL:', err)
    return { url: sourceUrl, durable: false }
  }
}

/** Describes the active backend, for the preflight/health view. */
export function storageBackend(): 's3' | 'local' {
  return s3Config() ? 's3' : 'local'
}
