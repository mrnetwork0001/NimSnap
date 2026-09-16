#!/usr/bin/env bash
#
# NimSnap installer - additive only.
#
# What this DOES:   creates a user, a directory, clones the repo, builds, and
#                   registers one systemd service bound to loopback.
# What it NEVER does: install or reconfigure a web server, touch an existing
#                   vhost, stop or restart any service other than its own, or
#                   change firewall rules.
#
# Usage:  sudo PORT=8791 bash 01-install.sh
set -euo pipefail

PORT="${PORT:-8791}"
APP_DIR=/srv/nimsnap
REPO=https://github.com/mrnetwork0001/NimSnap.git

echo "==> NimSnap install (port ${PORT}, loopback only)"

# --- refuse to run if the port is taken, rather than fighting for it ---------
if ss -lnt 2>/dev/null | awk '{print $4}' | grep -qE "[:.]${PORT}\$"; then
  echo "ERROR: port ${PORT} is already in use. Re-run with a free one:"
  echo "       sudo PORT=<free port> bash 01-install.sh"
  exit 1
fi

# --- refuse to clobber an existing unit -------------------------------------
if [ -e /etc/systemd/system/nimsnap.service ] && [ "${FORCE:-0}" != "1" ]; then
  echo "NOTE: nimsnap.service already exists. Use 02-update.sh to deploy a new"
  echo "      version, or re-run with FORCE=1 to reinstall the unit."
  exit 1
fi

command -v node >/dev/null 2>&1 || { echo "ERROR: node is not installed. Install Node 20+ first."; exit 1; }
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 18 ] || { echo "ERROR: node 18+ required, found $(node -v)"; exit 1; }

# --- dedicated unprivileged user --------------------------------------------
id -u nimsnap >/dev/null 2>&1 || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin nimsnap
mkdir -p "$APP_DIR" /var/log/nimsnap
chown -R nimsnap:nimsnap "$APP_DIR" /var/log/nimsnap

# --- code --------------------------------------------------------------------
if [ -d "$APP_DIR/.git" ]; then
  sudo -u nimsnap git -C "$APP_DIR" fetch --all --quiet
  sudo -u nimsnap git -C "$APP_DIR" reset --hard origin/main --quiet
else
  sudo -u nimsnap git clone --quiet "$REPO" "$APP_DIR"
fi

# --- env ---------------------------------------------------------------------
if [ ! -f "$APP_DIR/.env.local" ]; then
  sudo -u nimsnap cp "$APP_DIR/.env.example" "$APP_DIR/.env.local"
  echo "PORT=${PORT}" | sudo -u nimsnap tee -a "$APP_DIR/.env.local" >/dev/null
  echo
  echo "  !! Created $APP_DIR/.env.local from the template."
  echo "  !! Fill in REPLICATE_API_TOKEN and NEXT_PUBLIC_NIM_TREASURY_ADDRESS,"
  echo "  !! set NEXT_PUBLIC_DEMO_MODE=false, THEN run 02-update.sh."
  echo "  !! NEXT_PUBLIC_* values are baked in at build time, so they must be"
  echo "  !! set before the build, not after."
else
  grep -q '^PORT=' "$APP_DIR/.env.local" || echo "PORT=${PORT}" | sudo -u nimsnap tee -a "$APP_DIR/.env.local" >/dev/null
fi
chmod 600 "$APP_DIR/.env.local"
chown nimsnap:nimsnap "$APP_DIR/.env.local"

# --- build -------------------------------------------------------------------
sudo -u nimsnap mkdir -p "$APP_DIR/.data/results"
cd "$APP_DIR"
sudo -u nimsnap npm ci --omit=dev --silent 2>/dev/null || sudo -u nimsnap npm install --silent
sudo -u nimsnap npm install --silent --no-save next@14.2.5 >/dev/null 2>&1 || true
sudo -u nimsnap npm run build

# --- service (ours only) -----------------------------------------------------
sed "s|\${PORT}|${PORT}|g" "$APP_DIR/deploy/nimsnap.service" > /etc/systemd/system/nimsnap.service
systemctl daemon-reload            # re-reads unit files; disturbs nothing running
systemctl enable nimsnap --quiet
systemctl restart nimsnap          # only ever this service

sleep 4
echo
if curl -fsS --max-time 10 "http://127.0.0.1:${PORT}/api/quote" >/dev/null 2>&1; then
  echo "==> NimSnap is up on 127.0.0.1:${PORT}"
else
  echo "==> NOT responding yet. Check:  journalctl -u nimsnap -n 40 --no-pager"
fi
echo "==> Nothing else on this machine was modified."
echo "==> Next: put a vhost in front of it (deploy/nginx-nimsnap.conf or Caddyfile.snippet)."
