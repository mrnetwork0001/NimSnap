# 📸 NimSnap — Pay-Per-Shot AI Photo Studio

> A Nimiq Mini App that turns any photo into a studio-grade portrait, avatar or
> product shot for **$0.10 a shot**, settled instantly in **NIM** or **USDT**.
> No account. No subscription. No forms.

Built for the **Nimiq Mini Apps Competition (Cycle II)**. Apache-2.0.

---

## Why pay-per-shot

Every AI photo tool wants $20–$50/month. Most people need three headshots a year.
NimSnap prices the actual unit of value — one generated photo — at ten cents, which
is only practical on a rail where a ten-cent payment isn't eaten by fees. That is
the entire argument for building it on Nimiq Pay.

---

## The flow

1. **Open** — the app loads inside Nimiq Pay. No signup, no wallet connect step.
2. **Upload** — camera or library. The photo is downscaled and compressed on-device.
3. **Pick a style** — Executive Portrait, Cyberpunk Hero, E-Commerce Studio, Anime.
4. **Tap "Generate for $0.10"** — Nimiq Pay raises its native confirmation sheet.
5. **Compare and save** — drag the before/after slider, download HD, share.

---

## How payment actually works

This is worth stating precisely, because it is easy to assume there's a
"checkout SDK" with an API key. There isn't.

A Mini App runs **inside** the Nimiq Pay app, which injects a provider at
`window.nimiq` before the page script runs. `@nimiq/mini-app-sdk` is a thin
typing-and-detection helper over that provider — there is no API key anywhere
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
**serialized transaction**, not a hash — which is exactly why the order id is
planted in the transaction's `data` field. That memo is the join key the server
uses to recognise this payment later.

**USDT rail.** Nimiq Pay also exposes `window.ethereum`, so USDT on Polygon is a
plain ERC-20 `transfer` — no extra setup, no bridge.

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

`.env.local` for a local dry run — full flow, no funds move:

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
nimiqpay://miniapp?url=your-app.com
https://nimpay.app/miniapps/open/your-app.com
```

The NIM rail only works inside Nimiq Pay — in a desktop browser there is no
provider to sign with, and the UI says so rather than failing at the last step.

---

## Architecture

```
Nimiq Pay host webview
  │  injects window.nimiq + window.ethereum
  ▼
Next.js 14 App Router (client)
  ├── lib/client/image.ts   downscale + re-encode on-device before upload
  ├── lib/client/pay.ts     NIM via @nimiq/mini-app-sdk, USDT via window.ethereum
  │
  ▼  POST /api/orders   → server mints a single-use order id + price quote
  ▼  POST /api/generate → verify on chain, THEN transform
  │
Server (Node runtime)
  ├── lib/rates.ts       live NIM/USD (CoinGecko, cached, stale-tolerant)
  ├── lib/orders.ts      order store — in-memory, or Upstash Redis if configured
  ├── lib/settlement.ts  independent chain verification (Nimiq indexer / Polygon RPC)
  └── lib/ai.ts          Replicate — FLUX.1 Kontext (default) or SDXL img2img
```

**Pricing is live.** The shot is denominated in dollars but paid in Lunas, so the
server quotes against a real NIM/USD feed at order time and holds the user to that
quote. At the time of writing $0.10 ≈ 265 NIM ≈ 26,565,365 Lunas.

**Engine choice.** FLUX.1 Kontext is the default because it's an *instruction*
editor — it rewrites the photo in place rather than re-synthesising it, which is
what keeps a headshot recognisably the same person. SDXL img2img is available via
`REPLICATE_ENGINE=sdxl`. Presets carry prompts for both.

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

Two deliberate choices worth calling out:

- **Payment is verified before the model runs**, so a failed payment never costs
  us a generation.
- **A failed generation leaves the order paid-but-unconsumed**, so the user can
  retry without paying twice. The credit is only burned once an image exists.

---

## Verified behaviour

Checked against the running build:

```
GET  /api/quote                        → live quote, 265.65 NIM for $0.10
POST /api/orders  {presetId:"nope"}    → 400  Unknown style preset
POST /api/generate unknown order       → 404  Unknown order
POST /api/generate "../etc/passwd"     → 404  (id regex rejects it)
POST /api/generate non-image payload   → 400  Missing or unsupported image upload
POST /api/generate rail:nim, no treasury → 402 stage:"payment"  (model never called)
POST /api/generate rail:demo           → reaches generation stage
  ↳ retry after failure                → still allowed, credit preserved
```

Production build: **97.1 kB** first load JS.

---

## Known gaps

Stated plainly rather than left to be discovered:

- **The `data` field encoding is confirmed by construction, not by observation.**
  Indexers may return a transaction's data as raw hex or as decoded UTF-8, and no
  recent mainnet transaction carrying a data payload was available to sample.
  `dataCarriesOrderId` accepts both representations, so either works — but this
  is the one thing to confirm against a live payment before judging day.
- **Order storage defaults to memory.** Correct for `next start` on a container
  or VM. On a serverless platform, set `UPSTASH_REDIS_REST_URL` /
  `UPSTASH_REDIS_REST_TOKEN` or orders will not survive between instances.
- **The 5-second target depends on Replicate.** The pipeline uses `Prefer: wait`
  so short runs return with no polling at all, but the model's own latency is not
  something the app controls. There is a 90s hard ceiling.

---

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

Apache-2.0. See [LICENSE](LICENSE).
