#!/usr/bin/env bash
# Pull, rebuild, restart NimSnap only. Touches no other service.
set -euo pipefail
APP_DIR=/srv/nimsnap
APP_USER=nimsnap
cd "$APP_DIR"

run() { sudo -u "$APP_USER" "$@"; }

# Everything under the app dir must belong to the service user. A build run as
# root once leaves root-owned files in .next and node_modules, and every later
# deploy then fails on EACCES - which surfaces as a misleading "error in
# next/font" rather than a permissions error.
if find "$APP_DIR" -user root -not -path "$APP_DIR/.git/*" -print -quit | grep -q .; then
  echo "==> repairing ownership left by a previous root-run build"
  chown -R "$APP_USER:$APP_USER" "$APP_DIR"
  chmod 600 "$APP_DIR/.env.local"
fi

run git fetch origin main --quiet --depth=1
run git reset --hard origin/main --quiet
echo "==> at $(run git log --oneline -1)"

# NOT --omit=dev. The build needs tailwindcss, typescript and postcss, all of
# which are devDependencies. Worse, `npm ci --omit=dev` exits 0 after stripping
# them, so an `|| npm install` fallback never fires and the failure only shows
# up later as a confusing webpack error.
run npm ci

# Verify the build toolchain actually landed. A partial or interrupted install
# can leave node_modules without devDependencies while still exiting 0, and the
# failure that follows is deeply misleading: without `typescript` present, Next
# silently stops reading tsconfig path aliases, so every `@/lib/...` import
# fails to resolve and the build reports a dozen module-not-found errors that
# look like missing source files rather than a missing compiler.
missing=""
for m in typescript tailwindcss postcss autoprefixer; do
  [ -d "$APP_DIR/node_modules/$m" ] || missing="$missing $m"
done
if [ -n "$missing" ]; then
  echo "==> build dependencies missing after npm ci:$missing"
  echo "    retrying with an explicit dev install"
  run npm install --include=dev --no-audit --no-fund
  for m in typescript tailwindcss postcss autoprefixer; do
    if [ ! -d "$APP_DIR/node_modules/$m" ]; then
      echo "==> still missing $m - aborting before the build can fail confusingly"
      exit 1
    fi
  done
fi

# Cap the heap so a build can never crowd the other services sharing this box.
run env NODE_OPTIONS=--max-old-space-size=1536 npm run build

systemctl restart nimsnap
sleep 5

PORT="$(grep -E '^PORT=' "$APP_DIR/.env.local" | cut -d= -f2 || echo 8791)"
if curl -fsS --max-time 10 "http://127.0.0.1:${PORT}/api/quote" >/dev/null 2>&1; then
  echo "==> updated and healthy on :${PORT}"
else
  echo "==> unhealthy. Inspect with: journalctl -u nimsnap -n 40 --no-pager"
  exit 1
fi
