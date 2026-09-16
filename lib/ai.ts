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

/** Hard ceiling on a single generation, so a wedged prediction cannot hang a paid order. */
const GENERATION_TIMEOUT_MS = 90_000

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

/** True when the server is configured well enough to actually deliver a shot. */
export function isEngineConfigured(): boolean {
  return Boolean(process.env.REPLICATE_API_TOKEN)
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
): Promise<string> {
  const deadline = Date.now() + GENERATION_TIMEOUT_MS

  const createRes = await replicate(`/models/${MODELS[ENGINE]}/predictions`, {
    method: 'POST',
    // Ask Replicate to hold the connection open briefly and return a finished
    // prediction if it completes within the window.
    headers: { prefer: 'wait=55' },
    body: JSON.stringify({ input: buildInput(preset, imageDataUri) }),
    signal,
  })

  if (!createRes.ok) {
    const detail = await createRes.text().catch(() => '')
    console.error(`[nimsnap] Replicate ${createRes.status}: ${detail.slice(0, 300)}`)
    // 401 and 402 are configuration and billing problems. Retrying is
    // guaranteed to fail the same way, so they are marked terminal.
    if (createRes.status === 401) {
      throw new GenerationError('The image service rejected our credentials.', false)
    }
    if (createRes.status === 402) {
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
