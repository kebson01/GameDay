#!/usr/bin/env bash
# Build GameDay for a static host under a sub-folder (e.g. GitHub Pages).
#
#   scripts/build-static.sh /some/path/app/ ../my-site/some/path/app
#
# 1. Builds with that base path (assets, router, service worker, manifest).
# 2. Static hosts have no rewrite rules, so a direct link or refresh on
#    /some/path/app/TailgateDirectory would 404. We copy index.html into a
#    folder for every route so each URL resolves to the app.
# 3. Adds a robots "noindex" tag so search engines don't list it.
set -euo pipefail

BASE="${1:?usage: build-static.sh <base-path, e.g. /x/app/> <output-dir>}"
OUT="${2:?usage: build-static.sh <base-path> <output-dir>}"
[[ "$BASE" == /*/ ]] || { echo "base path must start and end with /"; exit 1; }

cd "$(dirname "$0")/.."
GAMEDAY_BASE="$BASE" npm run build

# Keep the app out of search results
sed -i 's#<head>#<head>\n    <meta name="robots" content="noindex, nofollow, noarchive" />#' dist/index.html

# One folder per route, taken from the <Route path="/X"> list
for route in $(grep -oE 'path="/[A-Za-z]+"' src/pages/index.jsx | sed -E 's/path="\/(.*)"/\1/' | sort -u); do
  mkdir -p "dist/$route"
  cp dist/index.html "dist/$route/index.html"
done

mkdir -p "$OUT"
rm -rf "${OUT:?}"/*
cp -r dist/. "$OUT"/
echo "Built GameDay for $BASE into $OUT"
