/**
 * Produce the before/after showcase assets.
 *
 * Runs your own source photos through the real preset instructions and the real
 * model, so the pairs on the landing view are genuine output from the same
 * $0.10 pipeline a paying user gets — not stock images or mockups.
 *
 * Usage:
 *   1. Drop source photos in examples-src/ named after the preset they show:
 *        examples-src/executive.jpg   examples-src/cyberpunk.jpg
 *        examples-src/ecommerce.jpg   examples-src/anime.jpg
 *      Use photos you have the right to publish — these ship in the repo.
 *   2. REPLICATE_API_TOKEN=r8_... node scripts/generate-examples.mjs
 *
 * Costs roughly $0.055 per pair on flux-kontext-pro.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { join, extname } from 'path'
import { execFileSync } from 'child_process'

const ROOT = process.cwd()
const SRC_DIR = join(ROOT, 'examples-src')
const OUT_DIR = join(ROOT, 'public', 'examples')

// Load .env.local the way Next does, so the script needs no extra flags.
const envPath = join(ROOT, '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const token = process.env.REPLICATE_API_TOKEN
if (!token) {
  console.error('REPLICATE_API_TOKEN is not set. Add it to .env.local or pass it inline.')
  process.exit(1)
}

const { PRESETS } = await import(join(ROOT, 'lib', 'presets.ts'))
const MODEL = process.env.REPLICATE_KONTEXT_MODEL ?? 'black-forest-labs/flux-kontext-pro'

/** Longest edge for the published "before" asset. Matches what the app uploads. */
const MAX_EDGE = 1280

if (!existsSync(SRC_DIR)) {
  console.error(`No source directory. Create ${SRC_DIR} and add photos named after each preset.`)
  process.exit(1)
}
mkdirSync(OUT_DIR, { recursive: true })

function findSource(presetId) {
  const entries = readdirSync(SRC_DIR)
  return entries.find((f) => f.replace(extname(f), '').toLowerCase() === presetId)
}

/** Downscale with macOS `sips`; fall back to copying if it is unavailable. */
function writeBefore(srcPath, destPath) {
  try {
    execFileSync('sips', ['-Z', String(MAX_EDGE), '-s', 'format', 'jpeg', srcPath, '--out', destPath], {
      stdio: 'ignore',
    })
  } catch {
    writeFileSync(destPath, readFileSync(srcPath))
    console.warn('   (sips unavailable — copied the source at full size)')
  }
}

function toDataUri(path) {
  const ext = extname(path).toLowerCase()
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
  return `data:${mime};base64,${readFileSync(path).toString('base64')}`
}

async function generate(preset, dataUri) {
  const res = await fetch(`https://api.replicate.com/v1/models/${MODEL}/predictions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      prefer: 'wait=55',
    },
    body: JSON.stringify({
      input: {
        prompt: preset.instruction,
        input_image: dataUri,
        aspect_ratio: 'match_input_image',
        output_format: 'jpg',
        safety_tolerance: 2,
      },
    }),
  })
  if (!res.ok) throw new Error(`Replicate ${res.status}: ${(await res.text()).slice(0, 200)}`)

  let prediction = await res.json()
  while (prediction.status === 'starting' || prediction.status === 'processing') {
    await new Promise((r) => setTimeout(r, 1000))
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { authorization: `Bearer ${token}` },
    })
    prediction = await poll.json()
  }
  if (prediction.status !== 'succeeded') {
    throw new Error(prediction.error || `prediction ${prediction.status}`)
  }
  const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
  if (!url) throw new Error('model returned no image')
  return url
}

let made = 0
let spent = 0

for (const preset of PRESETS) {
  const src = findSource(preset.id)
  if (!src) {
    console.log(`- ${preset.id.padEnd(10)} no source photo, skipping`)
    continue
  }
  const srcPath = join(SRC_DIR, src)
  process.stdout.write(`* ${preset.id.padEnd(10)} generating... `)
  try {
    const outUrl = await generate(preset, toDataUri(srcPath))
    // Replicate deletes output files after an hour, so pull it down immediately.
    const img = await fetch(outUrl)
    if (!img.ok) throw new Error(`could not download result (${img.status})`)
    writeFileSync(join(OUT_DIR, `${preset.id}-after.jpg`), Buffer.from(await img.arrayBuffer()))
    writeBefore(srcPath, join(OUT_DIR, `${preset.id}-before.jpg`))
    made++
    spent += 0.055
    console.log('done')
  } catch (err) {
    console.log(`FAILED — ${err.message}`)
  }
}

console.log(`\n${made} pair(s) written to public/examples (~$${spent.toFixed(2)} spent).`)
if (made > 0) {
  console.log('The showcase renders automatically for every pair present on disk.')
}
