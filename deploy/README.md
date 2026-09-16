# Deploying NimSnap to a shared VPS

Written for a box that is **already running other services**. Every step here is
additive: nothing installs a web server, edits an existing vhost, or restarts
anything but NimSnap itself.

The app binds to **127.0.0.1 only**, so it cannot collide with whatever already
answers on 80/443. A reverse proxy you already run is what puts it on the
internet.

## 1. Survey first (read-only)

```bash
bash deploy/00-survey.sh
```

Changes nothing. Tells you which web server owns 80/443, which ports are free,
and whether Docker/pm2 are in play. Do this before anything else.

## 2. DNS

At Namecheap, point the domain at the box:

| Type | Host | Value |
| --- | --- | --- |
| A | `@` | `38.49.216.120` |
| A | `www` | `38.49.216.120` |

Wait for it to resolve before requesting a certificate, or the challenge fails:

```bash
dig +short nimsnap.xyz
```

## 3. Install

```bash
sudo PORT=8791 bash deploy/01-install.sh
```

Pick a port the survey showed as free. The script refuses to start if the port
is taken rather than fighting for it, and refuses to overwrite an existing
service unit.

It creates a `nimsnap` system user, clones to `/srv/nimsnap`, builds, and
registers one systemd service.

## 4. Fill in the environment, then rebuild

```bash
sudo -u nimsnap nano /srv/nimsnap/.env.local
sudo bash deploy/02-update.sh
```

Minimum to be able to sell a shot:

```
REPLICATE_API_TOKEN=r8_...
NEXT_PUBLIC_NIM_TREASURY_ADDRESS=NQ.. .... ....
NEXT_PUBLIC_DEMO_MODE=false
```

`NEXT_PUBLIC_*` values are compiled into the browser bundle **at build time**, so
they must be set before the build. Editing them later without rebuilding leaves
the browser running the old values while the server sees the new ones.

On a VPS you do **not** need Upstash or S3. The order store works in memory
because this is one long-lived process, and results are written to
`/srv/nimsnap/.data/results` and served by the app. Both of those are exactly
what fails on serverless.

## 5. Put it behind your existing proxy

Replace `__PORT__` with the port you chose.

**nginx**
```bash
sudo cp deploy/nginx-nimsnap.conf /etc/nginx/sites-available/nimsnap
sudo sed -i 's/__PORT__/8791/' /etc/nginx/sites-available/nimsnap
sudo ln -s /etc/nginx/sites-available/nimsnap /etc/nginx/sites-enabled/nimsnap
sudo nginx -t                 # MUST pass before the next line
sudo systemctl reload nginx   # reload, not restart - live connections survive
sudo certbot --nginx -d nimsnap.xyz -d www.nimsnap.xyz
```

**Caddy**
```bash
sudo sed 's/__PORT__/8791/' deploy/Caddyfile.snippet >> /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```
Caddy handles TLS itself; there is no certbot step.

If `nginx -t` or `caddy validate` fails, **stop**. Nothing has been applied yet
and your existing sites are untouched.

## 6. Verify

```bash
curl -s https://nimsnap.xyz/api/quote | head -c 200      # 200 + a live NIM price
curl -o /dev/null -w '%{http_code}\n' -X POST https://nimsnap.xyz/api/orders \
     -H 'content-type: application/json' -d '{"presetId":"anime"}'
```

`503` on the second means `REPLICATE_API_TOKEN` is missing - the app refuses to
sell a shot it cannot deliver.

Then open it as a Mini App on a phone with Nimiq Pay:

```
https://nimpay.app/miniapps/open/nimsnap.xyz/app
```

The `/app` matters: `/` is the landing page, `/app` is the studio.

## Updating later

```bash
sudo bash deploy/02-update.sh
```

## If you need to back it all out

```bash
sudo systemctl disable --now nimsnap
sudo rm /etc/systemd/system/nimsnap.service
sudo rm -f /etc/nginx/sites-enabled/nimsnap        # or remove the Caddy block
sudo nginx -t && sudo systemctl reload nginx
sudo systemctl daemon-reload
```

Everything NimSnap added lives in `/srv/nimsnap`, `/var/log/nimsnap`, one
systemd unit and one vhost. Removing those four leaves the machine as it was.
