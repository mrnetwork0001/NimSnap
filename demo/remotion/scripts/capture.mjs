// Footage capture with Playwright (Google Chrome stable).
// 1920x1080 desktop clips and a 430x932 phone clip -> H.264 in public/clips.
//
// The phone-sized capture is the studio itself: NimSnap is a Mini App, so a
// desktop-shaped studio would misrepresent where it actually runs.
import { chromium } from 'playwright'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.CAPTURE_BASE || 'https://nimsnap.xyz'
const OUT = path.resolve('public/clips')
const TMP = path.resolve('clips/tmp')
fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(TMP, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Wheel-scroll in small steps so the recording reads as a glide, not a jump. */
async function scrollBy(page, px, { step = 6, every = 16 } = {}) {
  const n = Math.round(Math.abs(px) / step)
  const dir = px < 0 ? -1 : 1
  for (let i = 0; i < n; i++) {
    await page.mouse.wheel(0, dir * step)
    await sleep(every)
  }
}

async function record(name, seconds, size, run) {
  const target = path.join(OUT, `${name}.mp4`)
  if (fs.existsSync(target) && !process.env.FORCE) {
    console.log(`${name}: present, skipping (FORCE=1 to redo)`)
    return
  }
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const dir = path.join(TMP, name)
  fs.rmSync(dir, { recursive: true, force: true })
  const ctx = await browser.newContext({
    viewport: size,
    deviceScaleFactor: 1,
    recordVideo: { dir, size },
    // Touch signals matter: the studio offers the share sheet on touch devices.
    hasTouch: size.width < 900,
    isMobile: size.width < 900,
  })
  const page = await ctx.newPage()
  const t0 = Date.now()
  try {
    await run(page)
  } catch (e) {
    console.log(`${name}: ${e.message.split('\n')[0]}`)
  }
  const left = seconds * 1000 - (Date.now() - t0)
  if (left > 0) await sleep(left)
  await ctx.close()
  await browser.close()
  const webm = fs.readdirSync(dir).find((f) => f.endsWith('.webm'))
  // Playwright starts recording before navigation finishes, so every clip opens
  // on a blank page. Trim that off here rather than leaving each composition to
  // remember an offset - a forgotten one renders as an empty browser frame.
  const LEAD_IN = Number(process.env.LEAD_IN ?? 3.4)
  execSync(
    `ffmpeg -y -loglevel error -ss ${LEAD_IN} -i "${path.join(dir, webm)}" -r 30 -c:v libx264 ` +
      `-preset veryfast -crf 18 -pix_fmt yuv420p -vf scale=${size.width}:${size.height} -an "${target}"`,
  )
  const d = execSync(
    `ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${target}"`,
  ).toString().trim()
  console.log(`${name}: ${Number(d).toFixed(1)}s  ${size.width}x${size.height}`)
}

const DESKTOP = { width: 1920, height: 1080 }
const PHONE = { width: 430, height: 932 }

// 1. Landing page, top to bottom.
await record('landing', 30, DESKTOP, async (page) => {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await page.mouse.move(960, 540)
  await sleep(3200)
  for (let i = 0; i < 7; i++) {
    await scrollBy(page, 760)
    await sleep(1200)
  }
})

// 2. The studio at phone size, sliding across every style.
await record('styles', 26, PHONE, async (page) => {
  await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' })
  await sleep(2600)

  const rail = page.locator('[role=radiogroup][aria-label="Style presets"]')
  await rail.scrollIntoViewIfNeeded()
  await sleep(1200)

  // Step through all eight, selecting each so the checkmark and the card state
  // both read on camera.
  const cards = page.locator('[role=radio]')
  const n = await cards.count()
  for (let i = 0; i < n; i++) {
    const card = cards.nth(i)
    await card.scrollIntoViewIfNeeded()
    await sleep(320)
    await card.click({ timeout: 5000 }).catch(() => {})
    await sleep(1500)
  }
  // Glide back to the start so the clip can loop cleanly.
  await rail.evaluate((el) => el.scrollTo({ left: 0, behavior: 'smooth' }))
  await sleep(1600)
})

// 3. The upload card, for the "upload a photo" beat.
await record('upload', 10, PHONE, async (page) => {
  await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' })
  await sleep(3000)
  await scrollBy(page, 120)
  await sleep(2400)
  await scrollBy(page, -120)
  await sleep(2000)
})

console.log('\ncapture done. Phone footage you record yourself goes in public/clips/ as:')
console.log('  phone-pay.mp4       paying inside Nimiq Pay, on-chain')
console.log('  phone-explorer.mp4  the transaction on the block explorer')
