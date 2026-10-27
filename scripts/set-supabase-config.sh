#!/bin/bash
# ============================================================
# Point the Car QR Showcase app at a Supabase project.
#
# Usage:
#   ./scripts/set-supabase-config.sh <SUPABASE_URL> <SUPABASE_ANON_KEY>
#
# Example:
#   ./scripts/set-supabase-config.sh \
#     https://abcdefghijklm.supabase.co \
#     eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
#
# This edits public/runtime-config.js (the source of truth) AND
# dist/runtime-config.js (what actually gets deployed), so NO rebuild
# is required. Afterwards, redeploy with the deploy tool.
# ============================================================
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <SUPABASE_URL> <SUPABASE_ANON_KEY>" >&2
  exit 1
fi

URL="$1"
KEY="$2"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ -z "$URL" ] || [ -z "$KEY" ]; then
  echo "Error: both values are required." >&2
  exit 1
fi

case "$URL" in
  https://*) ;;
  *)
    echo "Warning: '$URL' does not start with https:// — expected the Supabase API URL" >&2
    ;;
esac

# Sanity check: the anon key is a JWT whose payload names the project ref.
PROJECT_REF=$(echo "$KEY" | cut -d. -f2 | tr '_-' '/+' | base64 -d 2>/dev/null | grep -o '"ref":"[^"]*"' | cut -d'"' -f4 || true)
if [ -n "$PROJECT_REF" ]; then
  URL_REF=$(echo "$URL" | sed -E 's#https://([^.]+)\..*#\1#')
  echo "Key project ref : $PROJECT_REF"
  echo "URL project ref : $URL_REF"
  if [ "$PROJECT_REF" != "$URL_REF" ]; then
    echo "WARNING: the URL and the key point at DIFFERENT projects!" >&2
  else
    echo "OK: URL and key belong to the same project."
  fi
fi

write_config() {
  cat > "$1" <<EOF
// ============================================
// Runtime Configuration
// --------------------------------------------
// This file is NOT bundled. It is loaded as a plain script
// BEFORE the app, so you can change these values and redeploy
// WITHOUT rebuilding the app.
//
// To point the app at a different Supabase project, edit the
// two values below and redeploy. No code changes needed.
// ============================================
window.__APP_CONFIG__ = {
  supabaseUrl: '$URL',
  supabaseAnonKey: '$KEY'
}
EOF
}

write_config "$ROOT/public/runtime-config.js"
echo "Wrote $ROOT/public/runtime-config.js"

if [ -d "$ROOT/dist" ]; then
  write_config "$ROOT/dist/runtime-config.js"
  echo "Wrote $ROOT/dist/runtime-config.js (no rebuild needed)"
else
  echo "NOTE: dist/ not found — run './node_modules/.bin/vite build' first."
fi

echo
echo "Next: deploy with the deploy tool (dist_dir=$ROOT/dist), then verify:"
echo "  curl -s https://<your-deploy-host>/runtime-config.js"
