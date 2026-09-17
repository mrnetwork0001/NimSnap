'use client'

import { useEffect, useState } from 'react'
import type { Quote } from '../rates'

/**
 * Live shot price, shared by every component on the page.
 *
 * Two things here are deliberate.
 *
 * The first is the module-level store. The landing page shows the live NIM
 * figure in more than one place, and the naive version - a fetch inside each
 * component - multiplies the request rate by the number of places we happen to
 * render it. One store, one interval, many readers: adding a third or fourth
 * display costs nothing.
 *
 * The second is the interval itself. The server caches the CoinGecko rate for
 * thirty seconds, so polling faster than that returns a number we already have.
 * Fifteen seconds picks up each new rate within half a cache window while
 * costing four requests a minute against a sixty-a-minute limit - live in the
 * way that matters, without pretending to a precision the upstream feed does
 * not offer.
 */

const POLL_MS = 15_000

export interface LiveQuote {
  quote: Quote | null
  /**
   * Whether the number on screen is currently backed by a reachable feed.
   * False once a fetch fails or the rate goes stale - we keep displaying the
   * last good figure, but stop badging it as live.
   */
  live: boolean
}

let snapshot: LiveQuote = { quote: null, live: false }
const readers = new Set<(next: LiveQuote) => void>()
let timer: ReturnType<typeof setInterval> | null = null
let inflight: AbortController | null = null

function emit(next: LiveQuote) {
  snapshot = next
  readers.forEach((notify) => notify(next))
}

async function refresh() {
  // A backgrounded tab does not need a price. Skipping here rather than
  // tearing down the interval keeps resumption instant on refocus.
  if (typeof document !== 'undefined' && document.hidden) return

  inflight?.abort()
  const controller = new AbortController()
  inflight = controller

  try {
    const res = await fetch('/api/quote', { signal: controller.signal, cache: 'no-store' })
    if (!res.ok) throw new Error(`quote ${res.status}`)
    const json = (await res.json()) as { quote: Quote }
    const quote = json.quote
    emit({ quote, live: Boolean(quote?.nimAvailable) && !quote?.rateStale })
  } catch {
    if (controller.signal.aborted) return
    // A dead feed is not a reason to blank the page. Hold the last good number
    // and drop the live badge, which is the honest thing to show.
    if (snapshot.quote) emit({ quote: snapshot.quote, live: false })
  } finally {
    if (inflight === controller) inflight = null
  }
}

function onVisibility() {
  if (!document.hidden) void refresh()
}

function start() {
  if (timer) return
  timer = setInterval(() => void refresh(), POLL_MS)
  document.addEventListener('visibilitychange', onVisibility)
  void refresh()
}

function stop() {
  if (timer) clearInterval(timer)
  timer = null
  document.removeEventListener('visibilitychange', onVisibility)
  inflight?.abort()
  inflight = null
}

export function useLiveQuote(): LiveQuote {
  const [state, setState] = useState<LiveQuote>(snapshot)

  useEffect(() => {
    readers.add(setState)
    setState(snapshot)
    start()
    return () => {
      readers.delete(setState)
      if (readers.size === 0) stop()
    }
  }, [])

  return state
}
