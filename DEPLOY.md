# Deploying NimSnap to Vercel

## Project settings

| Setting | Value |
| --- | --- |
| Framework preset | **Next.js** (auto-detected) |
| Root directory | **`./`** - the repo root, leave it empty |
| Build command | leave default (`next build`) |
| Output directory | leave default |
| Install command | leave default (`npm install`) |
| Node version | **20.x or later** |

Nothing needs overriding. `vercel.json` already pins the generate function's
duration and the cache policy for stored results.

## Environment variables

Set these in **Project > Settings > Environment Variables**, for Production
(and Preview, if you want previews to work).

### Required - the app refuses to sell a shot without this

```
REPLICATE_API_TOKEN = r8_...
```

Get it at https://replicate.com/account/api-tokens. Roughly $0.055 per generated
image. `/api/orders` returns 503 until this exists, by design: taking money for a
shot that cannot be delivered is worse than being unavailable.

### Required - where payments land

At least one. Both is better.

```
NEXT_PUBLIC_NIM_TREASURY_ADDRESS  = NQ.. .... .... .... .... .... .... .... ....
NEXT_PUBLIC_USDT_TREASURY_ADDRESS = 0x...            (Polygon)
```

These are `NEXT_PUBLIC_` because the browser builds the transaction. The server
re-reads them from its own environment when verifying, so a tampered client
cannot redirect a payment and still unlock a generation.

### Required on Vercel specifically - order storage

**Without this the app is broken on Vercel.** Orders are held in memory by
default, which is correct for a container but not for serverless: the order is
minted in one invocation and redeemed in another, and those do not share memory.
The user pays, then the order 404s.

```
UPSTASH_REDIS_REST_URL   = https://....upstash.io
UPSTASH_REDIS_REST_TOKEN = ...
```

Create a free Redis database at https://upstash.com - the free tier is far more
than this needs.

### Strongly recommended - durable results

Vercel's filesystem is read-only and ephemeral, so local result storage cannot
work there. Without S3 the app degrades honestly rather than breaking: the user
gets the model's own URL, the response carries `durable: false`, and the result
screen tells them to save it now - but **that link expires within the hour**.

Any S3-compatible bucket works. Cloudflare R2 has a free tier and no egress fees.

```
S3_ENDPOINT          = https://<account>.r2.cloudflarestorage.com
S3_BUCKET            = nimsnap-results
S3_ACCESS_KEY_ID     = ...
S3_SECRET_ACCESS_KEY = ...
S3_REGION            = auto
S3_PUBLIC_BASE       = https://<your public bucket domain>
```

The bucket must be publicly readable, since the browser loads results from it
directly. Objects are named with 16 random bytes, never with anything derivable
from public chain data, so they cannot be enumerated.

### Optional

```
NEXT_PUBLIC_DEMO_MODE = false    # MUST be false in production, or shots are free
FUNCTION_BUDGET_MS    = 60000    # raise to 300000 only on Vercel Pro
REPLICATE_ENGINE      = kontext  # or sdxl
NIMIQ_RPC_URL         =          # your own Albatross node, if you run one
POLYGON_RPC_URL       =          # comma-separated overrides
```

> `NEXT_PUBLIC_*` values are compiled into the browser bundle at build time, so
> changing one requires a **redeploy**, not just a restart. Changing it in the
> dashboard alone leaves the client running the old value while the server sees
> the new one.

## After deploying

1. **Check it is configured.** `POST /api/orders` should return 200, not 503.
   A 503 means `REPLICATE_API_TOKEN` is missing.
2. **Check the price feed.** `GET /api/quote` should return `nimAvailable: true`
   and a `lunas` amount.
3. **Open it as a Mini App** on a phone with Nimiq Pay installed:

   ```
   https://nimpay.app/miniapps/open/usenimsnap.vercel.app/app
   ```

   The path matters: `/app` is the studio, `/` is the landing page.

4. **Make one real payment.** This is the only way to confirm the NIM settlement
   path end to end - see the note in README.md under "Known gaps". Until this is
   done, whether a NIM payment can be verified at all is unproven.

## Free-plan limits worth knowing

- **Function duration is capped at 60s.** `vercel.json` and `maxDuration` are set
  to match, and the server budgets settlement and generation to finish inside it.
  Overrunning would mean being killed with no JSON response - after payment.
- **The filesystem is read-only**, hence the S3 requirement above.
- **Instances are not shared**, hence the Upstash requirement above.
