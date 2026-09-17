# NimSnap - Pay-Per-Shot AI Photo Studio

> A Nimiq Mini App that turns any photo into a studio-grade portrait, avatar,
> product shot or restored print for **$0.10 a shot**, paid in **NIM**.
> No account. No subscription. No forms.

<img width="2842" height="1642" alt="image" src="https://github.com/user-attachments/assets/ab351eb7-cce8-4e4a-8ba7-4732c14f284b" />


**Live at [nimsnap.xyz](https://nimsnap.xyz)** - pay from any browser with a
Nimiq Wallet, or open it inside Nimiq Pay on a phone.

> **Mini App deeplink.** `https://nimpay.app/miniapps/open/nimsnap.xyz/app`
> resolves only once an app is listed in
> [nimiq/awesome](https://github.com/nimiq/awesome). NimSnap's catalog entry is
> pending, so until it merges the browser path above is the way in.

Built for the **Nimiq Mini Apps Competition (Cycle II)**. MIT licensed.

---

## Why pay-per-shot

Every AI photo tool wants $20–$50/month. Most people need three headshots a year.
NimSnap prices the actual unit of value - one generated photo - at ten cents, which
is only practical on a rail where a ten-cent payment isn't eaten by fees. That is
the entire argument for building it on Nimiq Pay.

---

## Routes

| | |
| --- | --- |
| `/` | Landing page - what NimSnap is, for anyone arriving from a link |
| `/app` | The studio itself |

The Nimiq Pay deeplink and the PWA `start_url` both point at `/app`, so someone
opening the Mini App lands in the tool rather than paying a marketing click to
reach it. The landing page is for the web.

## The flow

1. **Open** - in Nimiq Pay on a phone, or any browser. No signup, no wallet
   connect step: inside Nimiq Pay the wallet is already there, and in a browser
   Nimiq's hosted checkout handles it.
2. **Upload** - camera or library. The photo is downscaled and compressed on-device.
3. **Pick a style** - eight presets: Executive Portrait, Cyberpunk Hero,
   E-Commerce Studio, Anime Portrait, Restore & Enhance, Passport Photo,
   Colour Sweep, Pet Portrait.
4. **Tap "Generate for $0.10"** - Nimiq Pay raises its native confirmation sheet
   on a phone; in a browser, Nimiq's hosted checkout opens instead.
5. **Compare and save** - drag the before/after slider, download HD, share.

---

## How payment actually works

This is worth stating precisely, because it is easy to assume there's a
"checkout SDK" with an API key. There isn't.

A Mini App runs **inside** the Nimiq Pay app, which injects a provider at
`window.nimiq` before the page script runs. `@nimiq/mini-app-sdk` is a thin
typing-and-detection helper over that provider - there is no API key anywhere
in the system, and the payment confirmation UI belongs to the host, not to us.

**NIM rail.** The client asks the provider to send a basic transaction with data:

```ts
const nimiq = await init()                        // waits for window.nimiq
await nimiq.sendBasicTransactionWithData({
  recipient: NIM_TREASURY,
  value: quote.lunas,                             // 1 NIM = 1e5 Lunas
  data: orderId,                                  // server-minted, single-use
})
```

Nimiq Pay renders its own confirm sheet and signs. The provider returns a
**serialized transaction**, not a hash - which is exactly why the order id is
planted in the transaction's `data` field. That memo is the join key the server
uses to recognise this payment later.

**Hub rail (any browser).** Nimiq Pay is a phone app, so a desktop visitor has no
injected provider. Nimiq's own hosted checkout covers them: `@nimiq/hub-api`
opens a popup, the user approves with their wallet at wallet.nimiq.com, and it
returns a signed transaction. Its `extraData` field carries the order id exactly
as the Mini App rail's `data` does, so on chain the two are indistinguishable and
settlement verification is identical - one code path serves both.

Because the popup needs live user activation, the order and the Hub bundle are
both prepared as soon as a photo and style are chosen; minting the order inside
the click handler would spend the activation and get the popup blocked.

**USDT rail.** Nimiq Pay also exposes `window.ethereum`, so USDT on Polygon is a
plain ERC-20 `transfer` - no extra setup, no bridge.

**Verification.** The client is never trusted. `POST /api/generate` independently
reads the chain and requires a transaction that (a) landed in *our* treasury,
(b) carries *this* order's id, and (c) moved at least the quoted amount, before
a single token is spent on the model. See [Security model](#security-model).

---

## Quickstart

```bash
git clone https://github.com/mrnetwork/NimSnap.git
cd NimSnap
npm install
cp .env.example .env.local
npm run dev
```

`.env.local` for a local dry run - full flow, no funds move:

```env
NEXT_PUBLIC_DEMO_MODE=true
REPLICATE_API_TOKEN=r8_...        # still needed for real generations
```

For a real deployment, turn demo mode off and set at least one treasury:

```env
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_NIM_TREASURY_ADDRESS=NQ__ ____ ____ ____ ____ ____ ____ ____ ____
NEXT_PUBLIC_USDT_TREASURY_ADDRESS=0x...
REPLICATE_API_TOKEN=r8_...
```

Every variable is documented in [`.env.example`](.env.example).

### Opening it in Nimiq Pay

Once deployed over HTTPS, either link opens it inside the host app:

```
nimiqpay://miniapp?url=your-app.com/app
https://nimpay.app/miniapps/open/your-app.com/app
```

The NIM rail only works inside Nimiq Pay - in a desktop browser there is no
provider to sign with, and the UI says so rather than failing at the last step.

---

## Showcase examples

Someone opening NimSnap in a plain browser has no wallet, so the pay button is
correctly disabled - which used to leave them staring at a dead end with nothing
showing what the app does. The home screen now carries real before/after pairs
they can drag, which also gives shared links somewhere to land.

The pairs must be genuine output from this pipeline, so they are generated by
running your own photos through the real presets and the real model:

```bash
# 1. add source photos named after the preset they demonstrate
examples-src/executive.jpg   examples-src/cyberpunk.jpg
examples-src/ecommerce.jpg   examples-src/anime.jpg

# 2. generate (~$0.055 per pair)
node scripts/generate-examples.mjs
```

Results land in `public/examples/` and the showcase renders whichever pairs are
present. **With no assets on disk the section does not render at all**, so a
deployment can never show a placeholder as though it were a real result. Use
photos you have the right to publish, and get consent for any recognisable face.

The home route stays statically prerendered, so the disk check runs at build
time: generate the pairs before `npm run build`. Dropping files onto an already
built server will not surface them until it is rebuilt.

---

## Architecture

```
Nimiq Pay host webview
  │  injects window.nimiq + window.ethereum
  ▼
Next.js 14 App Router (client)
  ├── lib/client/image.ts   downscale + re-encode on-device before upload
  ├── lib/client/pay.ts     NIM via @nimiq/mini-app-sdk (inside Nimiq Pay),
  │                         NIM via @nimiq/hub-api (any browser),
  │                         USDT via window.ethereum
  ├── lib/client/credit.ts  keeps a paid-but-unredeemed order on the device
  │
  ▼  POST /api/orders      → mints a single-use order id, quote and claim token
  ▼  POST /api/generate    → verify on chain, THEN transform
  ▼  GET  /api/orders/[id] → recover a paid order (claim token required)
  ▼  GET  /results/[key]   → serve a stored result
  │
Server (Node runtime)
  ├── lib/rates.ts       live NIM/USD (CoinGecko, cached, stale-tolerant)
  ├── lib/orders.ts      order store - in-memory, or Upstash Redis if configured
  ├── lib/settlement.ts  independent chain verification (Nimiq indexer / Polygon RPC)
  ├── lib/ai.ts          Replicate - FLUX.1 Kontext (default) or SDXL img2img,
  │                      with a breaker that stops sales when the engine is dead
  └── lib/storage.ts     durable results - S3-compatible, or local disk
```

**Pricing is live.** The shot is denominated in dollars but paid in Lunas, so the
server quotes against a real NIM/USD feed at order time and holds the user to that
quote. At the time of writing $0.10 ≈ 259 NIM ≈ 25,869,875 Lunas, and it moves with
the market.

**Engine choice.** FLUX.1 Kontext is the default because it's an *instruction*
editor - it rewrites the photo in place rather than re-synthesising it, which is
what keeps a headshot recognisably the same person. SDXL img2img is available via
`REPLICATE_ENGINE=sdxl`. Presets carry prompts for both.

---

## The eight styles

Each preset is a complete instruction set, tuned for its subject rather than
shared across all of them. `strength` controls how far the result may drift from
the original, and it differs on purpose.

| Style | For | Drift | What it must preserve |
| --- | --- | --- | --- |
| Executive Portrait | Selfies | 0.42 | The person, recognisably |
| Cyberpunk Hero | Avatars | 0.58 | Face and identity, reinterpreted |
| E-Commerce Studio | Products | 0.50 | Shape, colour, label |
| Anime Portrait | Selfies, pets | 0.62 | Pose and features, illustrated |
| Restore & Enhance | Old prints | **0.28** | Everything except the damage |
| Passport Photo | ID photos | **0.34** | The face, exactly |
| Colour Sweep | Products | 0.52 | The product; only the backdrop changes |
| Pet Portrait | Dogs, cats | 0.40 | The specific animal's markings |

Restore and Passport sit lowest because they are the two jobs where the subject
must not change at all. A restored photo that invents a different person, or an
ID photo that quietly slims a face, is worse than useless - so their instructions
enumerate what survives rather than saying "keep everything", which edit models
honour far less reliably.

Adding one is a single entry in `lib/presets.ts` plus an icon in
`components/PresetIcon.tsx`; TypeScript will refuse to build if you forget the
icon.

---

## When something goes wrong

Most of the work in this codebase is here rather than in the happy path, because
the happy path involves somebody's money.

**The payment survives the app dying.** A paid-but-unredeemed order is written to
the device the instant the money moves, and recovered on the next load: if the
generation finished, the image comes back; if it did not, the shot is offered
again at no charge. Recovery is authorised by a claim token that never leaves the
paying client - the order id cannot authorise it, because that id is published
on chain.

**A failed generation does not burn the payment.** The order stays redeemable,
and the client keeps the credit. Retrying costs nothing.

**A retry cannot be sold the wrong thing.** The server generates from the order's
own preset, so a retry after switching styles delivers - and labels - the style
that was actually paid for.

**Nothing hangs forever.** The generate request carries a 120-second ceiling, and
a "Stop waiting" button appears after twelve seconds. Cancelling never forfeits
the payment.

**The app stops selling when it cannot deliver.** No model credentials, or a 401
or 402 from the model, and `/api/orders` returns 503 rather than taking money for
a shot that cannot be generated. It re-arms on its own once the account recovers.

**A busy model is a queue, not a failure.** Replicate throttles low-credit
accounts hard; a 429 waits the interval it names and retries once.

---

## Security model

The trust boundary is `POST /api/generate`. A client that lies gets nothing.

| Attack | Defence |
| --- | --- |
| "I paid" without paying | Server reads the chain itself; the client's claim is ignored |
| Redirect payment to own address | Server re-reads the treasury from its own env, not the request |
| Replay one payment for many shots | Order ids are server-minted and burned via `consumedAt` |
| Guess someone else's paid order | Ids are 8 random bytes, not sequential |
| Underpay after a price move | Amount checked against the server-issued quote, ±5% tolerance |
| Pay the wrong token | USDT verification requires a `Transfer` log from the real USDT contract |
| Free generations via demo rail | `rail: "demo"` is rejected unless the deployment enables it |
| Hammer the model endpoint | Per-IP rate limits on quote, order and generate |
| Replay one USDT transfer across many orders | Transaction hashes are claimed atomically and are single-use |
| Enumerate other people's photos | Results are named with 16 random bytes, never the onchain order id |
| Recover someone else's order | Recovery needs a claim token that never leaves the paying client |
| Keep selling when the engine is dead | A 401/402 from the model trips a breaker and `/api/orders` stops selling |

Two deliberate choices worth calling out:

- **Payment is verified before the model runs**, so a failed payment never costs
  us a generation.
- **A failed generation leaves the order paid-but-unconsumed**, so the user can
  retry without paying twice. The credit is only burned once an image exists.

---

## Verified behaviour

Checked against the running deployment, not asserted.

**A real payment settled on Nimiq mainnet.** The order id is planted in the
transaction's data field, and the indexer returns that field hex-encoded:

```
IN  258.70 NIM   data = 30383134663763613333666333386136
                 utf8 = 0814f7ca33fc38a6   <- the order id
```

The server matched it, the model ran, and the image was delivered. That closed
the project's longest-standing unknown: whether `dataCarriesOrderId` would
recognise a real payment at all. It is now pinned in
`test/encoding-mainnet.test.ts`, with a real staking payload as a negative case.

**All eight presets produce their intended output.** Each was run through the
real pipeline. Restore kept the monochrome period look and the print edge while
removing scratches, rather than colourising. Passport produced a plain backdrop,
even frontal light and correct framing. Pet Portrait gave studio lighting and
real fur texture. Colour Sweep initially fixed its backdrop at teal, and a green
bottle reproduced exactly the failure that had been predicted for it - the
product lost its edges - so it now chooses a colour that contrasts with whatever
it is given.

**API guards:**

```
GET  /api/quote                        -> live quote, 258.70 NIM for $0.10
POST /api/orders  {presetId:"nope"}    -> 400  Unknown style preset
POST /api/orders  (no model configured)-> 503  refuses to sell what it cannot deliver
POST /api/generate unknown order       -> 404
POST /api/generate "../etc/passwd"     -> 404  (id regex rejects it)
POST /api/generate non-image payload   -> 400
POST /api/generate rail:nim, no treasury -> 402 stage:"payment"  (model never called)
GET  /api/orders/<id>  (no token)      -> 404, byte-identical to a wrong token
GET  /results/<key>.jpg                -> 200 image/jpeg, served after boot
GET  /results/../../package.json       -> 404
```

**94 tests**, including a regression test for the expiry ordering that once let a
late payment be rejected after the money had left the wallet. Production build:
112 kB first load on the studio route.

## Known gaps

Stated plainly rather than left to be discovered.

- **The catalog entry is not merged yet.** Until NimSnap appears in
  [nimiq/awesome](https://github.com/nimiq/awesome), the `nimpay.app` deeplink
  returns "This app isn't in the directory" and it cannot be opened as a Mini
  App. The browser path works regardless.
- **Replicate throttles low-credit accounts.** Below $5 of credit the limit drops
  to six predictions a minute with a burst of one, so two users arriving together
  is enough to trip it. A 429 is treated as a queue and retried once, but under
  real load the account needs headroom.
- **No USDT treasury is configured**, so that rail is hidden. The code path is
  built and tested; it needs only a Polygon address.
- **The showcase has no assets.** `scripts/generate-examples.mjs` produces them
  from photos you own; until it is run the section does not render at all, rather
  than showing a placeholder.
- **Order storage is in memory.** Correct for this deployment, which is a single
  long-lived server. On serverless it must move to Upstash, or a paid order will
  404 between invocations.
- **Restoration cannot recover what is not there.** Where a face is genuinely
  unresolvable the model must guess, and a guess is a plausible reconstruction,
  not the person. Uploads are downscaled to 1280px, so this is not upscaling.

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm start          # serve the production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

---

## License

MIT. See [LICENSE](LICENSE).
