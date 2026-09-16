#!/usr/bin/env bash
# Pull, rebuild, restart NimSnap only. Touches no other service.
set -euo pipefail
APP_DIR=/srv/nimsnap
cd "$APP_DIR"
sudo -u nimsnap git fetch --all --quiet
sudo -u nimsnap git reset --hard origin/main --quiet
sudo -u nimsnap npm ci --omit=dev --silent 2>/dev/null || sudo -u nimsnap npm install --silent
sudo -u nimsnap npm run build
systemctl restart nimsnap
sleep 4
PORT="$(grep -E '^PORT=' "$APP_DIR/.env.local" | cut -d= -f2)"
curl -fsS --max-time 10 "http://127.0.0.1:${PORT}/api/quote" >/dev/null 2>&1 \
  && echo "==> updated and healthy on :${PORT}" \
  || { echo "==> unhealthy, rolling back is manual: journalctl -u nimsnap -n 40 --no-pager"; exit 1; }
