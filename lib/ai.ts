import type { StylePreset } from './presets'

/**
 * AI transformation pipeline (Replicate).
 *
 * Two engines are supported because they take fundamentally different inputs:
 *
 *  - `kontext` (default) - FLUX.1 Kontext is an *instruction* editor. It rewrites
 *    the photo in place from a natural-language command, which is why it holds
 *    onto a person's identity so much better than re-synthesis. It takes no
 *    negative prompt and no strength.
 *  - `sdxl` - classic img2img diffusion. Takes a descriptive prompt, a negative
 *    prompt, and a strength. Cheaper, and a useful fallback.
 */

export type EngineId = 'kontext' | 'sdxl'

const ENGINE: EngineId = (process.env.REPLICATE_ENGINE as EngineId) ?? 'kontext'

const MODELS: Record<EngineId, string> = {
  kontext: process.env.REPLICATE_KONTEXT_MODEL ?? 'black-forest-labs/flux-kontext-pro',
  sdxl: process.env.REPLICATE_SDXL_MODEL ?? 'stability-ai/sdxl',
}

const REPLICATE_API = 'https://api.replicate.com/v1'

/**
 * Fallback ceiling on a single generation. The caller normally passes a deadline
 * derived from the platform's own request budget, which matters most on
 * serverless, where overrunning means being killed with no response at all.
 */
const DEFAULT_GENERATION_TIMEOUT_MS = 90_000

export class GenerationError extends Error {
  /**
   * False when retrying cannot possibly help - a bad token, an empty account.
   * The route uses this to stop offering a paid user a retry loop against an
   * error that will fail identically every time.
   */
  constructor(
    message: string,
    readonly retryable = true,
  ) {
    super(message)
    this.name = 'GenerationError'
  }
}

/**
 * Circuit breaker for the image engine.
 *
 * A credential or billing fault does not fail once - it fails for every request
 * until somebody intervenes. Without this, an account that runs out of credit
 * mid-session keeps happily taking ten cents from each new user and delivering
 * nothing, which is the single worst outcome for both them and us.
 *
 * So the first 401/402 trips the breaker, /api/orders stops selling, and the
 * app reports itself unavailable rather than insolvent. It re-arms on its own,
 * so topping the account up restores service without a deploy or a restart.
 */
const BREAKER_COOLDOWN_MS = 5 * 60 * 1000

const globalForBreaker = globalThis as unknown as { __nimsnapEngineDownUntil?: number }

export function tripEngineBreaker(reason: string): void {
  globalForBreaker.__nimsnapEngineDownUntil = Date.now() + BREAKER_COOLDOWN_MS
  console.error(
    `[nimsnap] engine breaker tripped (${reason}). Not selling shots for ${BREAKER_COOLDOWN_MS / 1000}s.`,
  )
}

export function isEngineAvailable(): boolean {
  const until = globalForBreaker.__nimsnapEngineDownUntil ?? 0
  return Date.now() >= until
}

/** True when the server is configured well enough to actually deliver a shot. */
export function isEngineConfigured(): boolean {
  return Boolean(process.env.REPLICATE_API_TOKEN) && isEngineAvailable()
}

function token(): string {
  const t = process.env.REPLICATE_API_TOKEN
  // Operator-facing detail goes to the log; the caller turns this into
  // something a paying user can actually understand.
  if (!t) {
    console.error('[nimsnap] REPLICATE_API_TOKEN is not set - generation cannot run.')
    throw new GenerationError('The image service is not configured.', false)
  }
  return t
}

function buildInput(preset: StylePreset, imageDataUri: string): Record<string, unknown> {
  if (ENGINE === 'kontext') {
    return {
      prompt: preset.instruction,
      input_image: imageDataUri,
      // Keep the user's framing; a forced square would crop faces out of portraits.
      aspect_ratio: 'match_input_image',
      output_format: 'jpg',
      safety_tolerance: 2,
    }
  }
  return {
    prompt: preset.prompt,
    negative_prompt: preset.negativePrompt,
    image: imageDataUri,
    prompt_strength: preset.strength,
    num_inference_steps: 30,
    guidance_scale: 7.5,
    refine: 'expert_ensemble_refiner',
  }
}

interface Prediction {
  id: string
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  output?: string | string[]
  error?: string
  urls?: { get?: string; cancel?: string }
}

async function replicate(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${REPLICATE_API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token()}`,
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })
}

function firstUrl(output: Prediction['output']): string | null {
  if (typeof output === 'string') return output
  if (Array.isArray(output) && typeof output[0] === 'string') return output[0]
  return null
}

/**
 * Run one transformation and resolve with the URL of the finished image.
 *
 * Uses Replicate's `Prefer: wait` so short generations come back on the initial
 * request with no polling round-trips at all - that is what keeps the happy path
 * near the five-second target. Longer runs fall back to polling.
 */
export async function generateImage(
  preset: StylePreset,
  imageDataUri: string,
  signal?: AbortSignal,
  budgetMs?: number,
): Promise<string> {
  const budget = Math.max(5_000, budgetMs ?? DEFAULT_GENERATION_TIMEOUT_MS)
  const deadline = Date.now() + budget

  const createRes = await replicate(`/models/${MODELS[ENGINE]}/predictions`, {
    method: 'POST',
    // Hold the connection open so a short generation comes back on this request
    // with no polling at all - but never longer than our own budget, or the
    // platform kills us while Replicate is still holding the line.
    headers: { prefer: `wait=${Math.max(5, Math.min(55, Math.floor(budget / 1000) - 5))}` },
    body: JSON.stringify({ input: buildInput(preset, imageDataUri) }),
    signal,
  })

  if (!createRes.ok) {
    const detail = await createRes.text().catch(() => '')
    console.error(`[nimsnap] Replicate ${createRes.status}: ${detail.slice(0, 300)}`)
    // 401 and 402 are configuration and billing problems. Retrying is
    // guaranteed to fail the same way, so they are marked terminal.
    if (createRes.status === 401) {
      tripEngineBreaker('401 - credentials rejected')
      throw new GenerationError('The image service rejected our credentials.', false)
    }
    if (createRes.status === 402) {
      tripEngineBreaker('402 - account out of credit')
      throw new GenerationError('The image service is out of credit.', false)
    }
    if (createRes.status === 422 || createRes.status === 400) {
      throw new GenerationError('That photo could not be processed. Try a different one.', false)
    }
    throw new GenerationError('The image service is unavailable right now.')
  }

  let prediction = (await createRes.json()) as Prediction

  while (prediction.status === 'starting' || prediction.status === 'processing') {
    if (Date.now() > deadline) {
      // Free the worker rather than leaving it running after we have given up.
      if (prediction.urls?.cancel) {
        await replicate(new URL(prediction.urls.cancel).pathname, { method: 'POST' }).catch(() => {})
      }
      throw new GenerationError('The transformation timed out. Your payment is still credited.')
    }
    await new Promise((resolve) => setTimeout(resolve, 900))
    if (signal?.aborted) throw new GenerationError('Generation was cancelled.')

    const pollRes = await replicate(`/predictions/${prediction.id}`, { signal })
    if (!pollRes.ok) throw new GenerationError('Lost contact with the image service.')
    prediction = (await pollRes.json()) as Prediction
  }

  if (prediction.status !== 'succeeded') {
    console.error(`[nimsnap] prediction ${prediction.status}: ${prediction.error ?? 'no detail'}`)
    // A model-side rejection (usually safety) will reject the same photo again.
    const terminal = /nsfw|safety|flagged|sensitive/i.test(prediction.error ?? '')
    throw new GenerationError(
      terminal
        ? 'That photo was rejected by the image model. Try a different one.'
        : 'The transformation did not finish. Your payment is still credited.',
      !terminal,
    )
  }

  const url = firstUrl(prediction.output)
  if (!url) throw new GenerationError('The model returned no image.')
  return url
}

export function activeEngine(): { engine: EngineId; model: string } {
  return { engine: ENGINE, model: MODELS[ENGINE] }
}
