#!/usr/bin/env bash
# READ-ONLY survey. Changes nothing, starts nothing, stops nothing.
# Run this on the VPS first and send me the output.
echo "=== OS ==="; (. /etc/os-release && echo "$PRETTY_NAME") 2>/dev/null; uname -m
echo; echo "=== who owns 80/443 ==="
(sudo ss -lntp 2>/dev/null || ss -lnt) | awk 'NR==1 || /:80 |:443 /'
echo; echo "=== web servers present ==="
for s in nginx caddy apache2 httpd traefik; do
  if command -v $s >/dev/null 2>&1; then
    printf "  %-9s installed" "$s"
    systemctl is-active $s 2>/dev/null | sed 's/^/  active=/' || echo
  fi
done
echo; echo "=== docker? ==="
command -v docker >/dev/null 2>&1 && (docker ps --format '  {{.Names}} -> {{.Ports}}' 2>/dev/null || echo "  docker present, no permission to list") || echo "  no docker"
echo; echo "=== node / pm2 ==="
command -v node >/dev/null 2>&1 && echo "  node $(node -v)" || echo "  no node"
command -v pm2  >/dev/null 2>&1 && echo "  pm2 present" || echo "  no pm2"
echo; echo "=== ports already taken (so I pick a free one) ==="
(ss -lnt 2>/dev/null | awk 'NR>1{print $4}' | sed 's/.*://' | sort -un | tr '\n' ' ')
echo; echo; echo "=== existing vhosts (names only) ==="
ls /etc/nginx/sites-enabled/ 2>/dev/null | sed 's/^/  nginx: /'
ls /etc/caddy/ 2>/dev/null | sed 's/^/  caddy: /'
echo; echo "=== disk + memory headroom ==="
df -h / | tail -1 | awk '{print "  disk: "$4" free of "$2}'
free -h 2>/dev/null | awk '/Mem:/{print "  ram:  "$7" available of "$2}'
echo; echo "=== survey complete - nothing was modified ==="
