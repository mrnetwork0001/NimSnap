'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import UploadZone from './UploadZone'
import PresetPicker from './PresetPicker'
import PayBar from './PayBar'
import GeneratingOverlay from './GeneratingOverlay'
import ResultView from './ResultView'
import HostBanner from './HostBanner'
import ExampleShowcase from './ExampleShowcase'
import { getPreset, type PresetId } from '@/lib/presets'
import { prepareImage } from '@/lib/client/image'
import { availableRails, payWithNim, payWithUsdt, PaymentError, type Rail } from '@/lib/client/pay'
import type { Quote } from '@/lib/rates'
import type { ExamplePair } from '@/lib/examples'

type Stage = 'compose' | 'working' | 'result'

interface Result {
  url: string
  presetId: PresetId
  txHash?: string
  rail?: string
  /** False when the image is served from a link that expires within the hour. */
  durable: boolean
}

/**
 * The whole studio, as one screen.
 *
 * Deliberately a single view rather than a wizard: upload, style and pay are all
 * reachable without navigation, which is what keeps first-run under the 60-second
 * bar. Stage only changes once the user has committed to a payment.
 */
export default function StudioApp({ examples = [] }: { examples?: ExamplePair[] }) {
  const [stage, setStage] = useState<Stage>('compose')
  const [file, setFile] = useState<{ dataUri: string } | null>(null)
  const [presetId, setPresetId] = useState<PresetId | null>(null)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [rails, setRails] = useState<Rail[]>([])
  const [rail, setRail] = useState<Rail | null>(null)
  const [paid, setPaid] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  /** An order already paid for but not yet redeemed, so a retry never re-charges. */
  const paidOrderRef = useRef<{ id: string; rail: Rail; txHash?: string } | null>(null)

  const preset = presetId ? getPreset(presetId) : null

  /* ---- Host detection + live price ------------------------------------- */

  useEffect(() => {
    // The host injects window.nimiq before our script runs, but detection still
    // waits briefly so a slow injection does not get reported as "no wallet".
    let cancelled = false
    availableRails().then((detected) => {
      if (!cancelled) setRails(detected)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setRail((current) => (current && rails.includes(current) ? current : (rails[0] ?? null)))
  }, [rails])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/quote')
        if (!res.ok) throw new Error('Could not fetch the current price.')
        const json = (await res.json()) as { quote: Quote }
        if (!cancelled) setQuote(json.quote)
      } catch {
        // Non-fatal: the order endpoint re-quotes anyway. The bar just shows "…".
      }
    }
    load()
    // Keep the displayed NIM amount honest while the user browses styles.
    const interval = setInterval(load, 60_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  /* ---- Intake ----------------------------------------------------------- */

  const onFile = useCallback(async (chosen: File) => {
    setError(null)
    setHint('Preparing your photo…')
    try {
      const prepared = await prepareImage(chosen)
      setFile({ dataUri: prepared.dataUri })
      // A fresh photo invalidates any previously paid order.
      paidOrderRef.current = null
      setHint(null)
    } catch (err) {
      setHint(null)
      setError(err instanceof Error ? err.message : 'That photo could not be read.')
    }
  }, [])

  /* ---- Pay + generate --------------------------------------------------- */

  const run = useCallback(async () => {
    if (!file || !presetId || !rail) return
    setError(null)
    setStage('working')
    setPaid(false)

    try {
      // Reuse a paid-but-unredeemed order rather than charging twice for a retry.
      let orderId = paidOrderRef.current?.id
      let payRail: Rail = rail
      let txHash = paidOrderRef.current?.txHash

      if (!orderId) {
        const orderRes = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ presetId }),
        })
        const orderJson = await orderRes.json()
        if (!orderRes.ok) throw new Error(orderJson.error ?? 'Could not start the order.')

        orderId = orderJson.orderId as string
        const liveQuote = orderJson.quote as Quote
        setQuote(liveQuote)

        if (rail === 'nim') {
          await payWithNim(orderId, liveQuote)
        } else if (rail === 'usdt') {
          const paymentResult = await payWithUsdt(liveQuote)
          txHash = paymentResult.txHash
        }
        payRail = rail
        paidOrderRef.current = { id: orderId, rail: payRail, txHash }
      }

      setPaid(true)

      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderId, rail: payRail, txHash, image: file.dataUri }),
      })
      const genJson = await genRes.json()
      if (!genRes.ok) throw new Error(genJson.error ?? 'The transformation failed.')

      // Redeemed - this order can no longer be reused.
      paidOrderRef.current = null
      setResult({
        url: genJson.resultUrl as string,
        presetId,
        txHash: genJson.txHash as string | undefined,
        rail: genJson.rail as string | undefined,
        durable: genJson.durable !== false,
      })
      setStage('result')
    } catch (err) {
      setStage('compose')
      setPaid(false)
      if (err instanceof PaymentError && err.cancelled) {
        setError('Payment cancelled. Nothing was charged.')
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    }
  }, [file, presetId, rail])

  const canPay = Boolean(file && presetId && rail && stage === 'compose')

  const retryHint = useMemo(
    () =>
      paidOrderRef.current
        ? 'Your payment is still credited - tap to retry at no extra cost.'
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [error],
  )

  /* ---- Render ----------------------------------------------------------- */

  if (stage === 'result' && result && file) {
    const resultPreset = getPreset(result.presetId)
    return (
      <div className="mx-auto w-full max-w-md px-2.5 pb-12">
        {resultPreset && (
          <ResultView
            beforeSrc={file.dataUri}
            afterSrc={result.url}
            preset={resultPreset}
            txHash={result.txHash}
            rail={result.rail}
            durable={result.durable}
            onAnotherStyle={() => {
              setResult(null)
              setStage('compose')
            }}
            onStartOver={() => {
              setResult(null)
              setFile(null)
              setPresetId(null)
              setStage('compose')
            }}
          />
        )}
      </div>
    )
  }

  return (
    <>
      <div className="mx-auto grid w-full max-w-md gap-5 px-2.5 pb-44 lg:max-w-5xl lg:grid-cols-2 lg:items-start lg:gap-8 lg:pb-28">
        <div className="min-w-0 space-y-5">
          <HostBanner rails={rails} />

          <UploadZone
            previewUrl={file?.dataUri ?? null}
            onFile={onFile}
            disabled={stage === 'working'}
          />

          <PresetPicker
            selected={presetId}
            onSelect={setPresetId}
            disabled={stage === 'working'}
          />
        </div>

        {/* Only worth showing while they have nothing of their own to look at. */}
        {!file && examples.length > 0 && (
          <div className="min-w-0 lg:sticky lg:top-4">
            <ExampleShowcase examples={examples} />
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="card-sm border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-900 lg:col-span-2"
          >
            <p>{error}</p>
            {retryHint && <p className="mt-1 text-xs text-rose-700/80">{retryHint}</p>}
          </div>
        )}
      </div>

      <PayBar
        quote={quote}
        rails={rails}
        rail={rail}
        onRailChange={setRail}
        onPay={run}
        ready={canPay}
        busy={stage === 'working'}
        hint={hint ?? (!file ? 'Add a photo to get started' : !presetId ? 'Pick a style' : null)}
      />

      {stage === 'working' && (
        <GeneratingOverlay presetName={preset?.name ?? 'shot'} paid={paid} />
      )}
    </>
  )
}
