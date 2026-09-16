/**
 * Minimal fixed-window rate limiter.
 *
 * Order creation and generation are unauthenticated by design - the whole point
 * is that there is no signup - so this is the only thing standing between the
 * app and someone hammering the price feed or the model endpoint.
 */

interface Window {
  count: number
  resetAt: number
}

const buckets = new Map<string, Window>()

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || now > existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    if (buckets.size > 10_000) sweep(now)
    return true
  }
  if (existing.count >= limit) return false
  existing.count += 1
  return true
}

function sweep(now: number): void {
  for (const [key, win] of buckets) {
    if (now > win.resetAt) buckets.delete(key)
  }
}

/** Best-effort client identity behind a proxy. */
export function clientKey(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  return fwd?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
}
