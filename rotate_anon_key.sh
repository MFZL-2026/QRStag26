#!/usr/bin/env bash
# Applies a NEW Supabase anon key and redeploys.
#
#   ./rotate_anon_key.sh <new_anon_key>
#
# Use this AFTER you reset the service_role key in the Supabase dashboard.
# Resetting service_role rotates the project JWT secret, which regenerates the
# anon key too - and the anon key is what the live site uses. This script
# updates all three places it lives, rebuilds, syncs docs/ and pushes.
#
# The anon key is a PUBLIC key (row-level security is what protects the data),
# so passing it on the command line is fine - but the service_role key must
# never be passed here, and must never be committed.
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "usage: $0 <new_anon_key>" >&2
  exit 2
fi

NEW_KEY="$1"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# This script may sit at the repo root or in a subdirectory of it. Walk up to
# whichever ancestor owns package.json - that is the repo root. (Assuming
# "$HERE/.." is the root silently builds the wrong tree.)
REPO="$HERE"
while [ "$REPO" != "/" ] && [ ! -f "$REPO/package.json" ]; do
  REPO="$(dirname "$REPO")"
done
if [ ! -f "$REPO/package.json" ]; then
  echo "error: could not locate the repo root (no package.json at or above $HERE)" >&2
  exit 1
fi
export HOME="${HOME:-/workspace/.home}"

# Accept both key formats:
#   - legacy JWT  eyJ...        (role: anon)
#   - new format  sb_publishable_...   (opaque, apikey header only)
if [[ "$NEW_KEY" =~ ^eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}$ ]] \
   || [[ "$NEW_KEY" =~ ^sb_publishable_[A-Za-z0-9_-]{10,}$ ]]; then
  :
else
  echo "error: that does not look like a Supabase publishable key" >&2
  echo "       expected a legacy JWT (eyJ...) or sb_publishable_..." >&2
  exit 2
fi

cd "$REPO"

echo "-> updating the anon key in runtime-config.js and the source fallbacks"
python3 - "$NEW_KEY" <<'PY'
import re, sys
key = sys.argv[1]
targets = [
    ("public/runtime-config.js", r"supabaseAnonKey: '[^']*'"),
    ("src/CustomerApp.tsx", r"const FALLBACK_[A-Z_]*ANON_KEY = '[^']*'"),
    ("src/lib/supabase.ts", r"const FALLBACK_[A-Z_]*ANON_KEY = '[^']*'"),
]
for path, pattern in targets:
    try:
        s = open(path, encoding="utf-8").read()
    except FileNotFoundError:
        print(f"   skip {path} (not present)")
        continue
    new, n = re.subn(pattern, lambda m: m.group(0).split("'")[0] + "'" + key + "'", s)
    if n:
        open(path, "w", encoding="utf-8").write(new)
        print(f"   updated {path}")
    else:
        print(f"   no match in {path} (nothing to change)")
PY

echo "-> rebuilding"
npx vite build

echo "-> syncing docs/ (what GitHub Pages serves)"
cp -r dist/. docs/
for d in docs dist; do
  ( cd "$d" || exit 1
    grep -rhoE '(src|href)="\./assets/[^"]+"' *.html | sed 's/.*assets\///;s/"//' | sort -u > /tmp/_used.txt
    for f in assets/*; do b=$(basename "$f"); grep -qx "$b" /tmp/_used.txt || rm "$f"; done )
done

echo "-> committing and pushing"
git add -A
git commit -q -m "Rotate Supabase publishable key

Updates runtime-config.js and the source fallbacks to the new publishable key,
refreshes the build, and syncs docs/ (what GitHub Pages serves).

Co-Authored-By: Mavis <agent@minimax.com>" || echo "   (nothing to commit)"
git push origin publish/main:main

echo "-> done. Verify the live site still loads data:"
echo "   curl -s -o /dev/null -w '%{http_code}\\n' https://mfzl-2026.github.io/QRStag26/"
