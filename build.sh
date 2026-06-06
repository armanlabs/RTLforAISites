#!/usr/bin/env bash
# build.sh — builds Chrome and Firefox extension zips from a single source
# Usage:
#   ./build.sh          → builds both
#   ./build.sh chrome   → builds only Chrome
#   ./build.sh firefox  → builds only Firefox

set -e

VERSION=$(grep '"version"' manifests/manifest.chrome.json | head -1 | sed 's/.*"\([0-9.]*\)".*/\1/')
DIST="dist"
SRC="src"

mkdir -p "$DIST"

build_chrome() {
  echo "Building Chrome v$VERSION..."
  local OUT="$DIST/rtl-ai-chrome-v$VERSION.zip"
  rm -f "$OUT"
  cp manifests/manifest.chrome.json "$SRC/manifest.json"
  (cd "$SRC" && zip -r "../$OUT" . --exclude "*.DS_Store")
  rm "$SRC/manifest.json"
  echo "✓ $OUT"
}

build_firefox() {
  echo "Building Firefox v$VERSION..."
  local OUT="$DIST/rtl-ai-firefox-v$VERSION.zip"
  rm -f "$OUT"
  cp manifests/manifest.firefox.json "$SRC/manifest.json"
  (cd "$SRC" && zip -r "../$OUT" . --exclude "*.DS_Store")
  rm "$SRC/manifest.json"
  echo "✓ $OUT"
}

case "${1:-both}" in
  chrome)  build_chrome ;;
  firefox) build_firefox ;;
  both)    build_chrome && build_firefox ;;
  *)       echo "Usage: $0 [chrome|firefox|both]" && exit 1 ;;
esac

echo ""
echo "Done. Files in $DIST/:"
ls -lh "$DIST/"
