#!/usr/bin/env bash
# Usage: scripts/deploy.sh proxy|shop
set -euo pipefail

PROXY_URL="https://trgo-proxy.omznc.workers.dev"
SHOP_URL="https://trgo.omarzunic.com"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

export GIT_COMMIT="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo dev)"
export ALLOWED_ORIGINS="$SHOP_URL,https://trgo.omznc.workers.dev,http://localhost:3000"
export VITE_PROXY_URL="$PROXY_URL"

case "${1:-}" in
proxy) cd "$ROOT/apps/proxy" ;;
shop) cd "$ROOT/apps/shop" ;;
*) echo "usage: $0 proxy|shop" >&2; exit 1 ;;
esac

# "cf deploy" builds with vite and reads the variables above.
cf deploy --profile personal
