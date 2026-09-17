// Narration for the NimSnap demo, generated with ElevenLabs.
//   node vo-gen.js              all sections
//   VO_ONLY=v03 node vo-gen.js  one section
// Key and voice come from .env next to this file (never committed).
const fs = require('fs')
for (const line of fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8').split('\n') : []) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}
const key = process.env.ELEVENLABS_API_KEY
if (!key) { console.error('Set ELEVENLABS_API_KEY in demo/remotion/.env'); process.exit(1) }
const VOICE = process.env.ELEVENLABS_VOICE || 'CwhRBWXzGAHq8TQ4Fs17'
const MODEL = 'eleven_multilingual_v2'

// Eleven sections, roughly 150 s of speech. Every claim here is one the app can
// actually demonstrate on camera - the onchain section is real footage of a
// real mainnet payment, not a mock.
const SECTIONS = [
  ['00', "NimSnap. Studio photos for ten cents a shot."],
  ['01', "Every AI photo tool wants twenty to fifty dollars a month. Most people need three headshots a year. So they pay for eleven months they never use, or they go without."],
  ['02', "NimSnap prices the thing you actually want. One finished photo. Ten cents. No account, no email, no subscription, and nothing to cancel."],
  ['03', "Upload a photo. Pick a style. Eight of them, each tuned for its subject: executive headshots, Web3 avatars, product shots, anime, pet portraits."],
  ['04', "Two of them exist because the subject must not change at all. Restore repairs an old print without inventing a different person. Passport changes the background and the lighting, and leaves the face exactly as it is."],
  ['05', "Ten cents only works on a rail where ten cents survives the fee. That is the whole reason this is a Nimiq Mini App, and not a website with a card form."],
  ['06', "Inside Nimiq Pay, the wallet is already there. No connect step, no signup. The app hands the host a transaction and Nimiq Pay draws its own confirmation sheet."],
  ['07', "The order id rides inside that transaction. So when the app says a payment landed, the server does not take the client's word for it. It reads the chain itself, finds the transaction carrying that order id, checks the amount, and only then spends anything on the model."],
  ['08', "Here is the whole thing, uncut, on Nimiq mainnet. A photo goes in. A style is chosen. Nimiq Pay raises its own confirmation sheet, and two hundred and sixty NIM - ten cents at today's rate - leaves the wallet. The server reads the chain, finds the order id inside that transaction, and only then does the model run. A few seconds later the finished photo comes back, with a before and after you can drag."],
  ['09', "And you can check it yourself. Every finished shot links straight to its transaction. Two hundred and sixty point two four NIM, into the NimSnap treasury, carrying order seventy c b e a e five. Same amount, same order, same block."],
  ['10', "Eight styles. Ten cents a shot. Verified before you are charged, and yours to keep afterwards. NimSnap, at nimsnap dot xyz."],
]

const only = process.env.VO_ONLY ? process.env.VO_ONLY.replace(/^v/, '') : null
const todo = SECTIONS.filter(([id]) => !only || id === only)
console.log('characters:', todo.reduce((n, s) => n + s[1].length, 0), 'in', todo.length, 'sections')
fs.mkdirSync('vo', { recursive: true })
fs.mkdirSync('public/vo', { recursive: true })

;(async () => {
  for (const [id, text] of todo) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({
        text, model_id: MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.0, use_speaker_boost: true },
      }),
    })
    if (!res.ok) { console.error(`v${id}: ${res.status} ${(await res.text()).slice(0, 200)}`); continue }
    const buf = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(`vo/v${id}.mp3`, buf)
    fs.writeFileSync(`public/vo/v${id}.mp3`, buf)
    console.log(`v${id}: ${(buf.length / 1024).toFixed(0)}kb`)
  }
  console.log('\nMeasure durations with:')
  console.log('  for f in vo/*.mp3; do echo "$f $(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 $f)"; done')
})()
