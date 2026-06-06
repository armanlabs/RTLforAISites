#!/usr/bin/env bash
# bump-version.sh — updates version in both manifests
# Usage: ./bump-version.sh 1.0.1

set -e

NEW_VERSION="${1:-}"
if [[ -z "$NEW_VERSION" ]]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 1.0.1"
  exit 1
fi

# Validate semver-ish
if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: Version must be in format X.Y.Z (e.g., 1.0.1)"
  exit 1
fi

MANIFEST_CHROME="manifests/manifest.chrome.json"
MANIFEST_FIREFOX="manifests/manifest.firefox.json"

for f in "$MANIFEST_CHROME" "$MANIFEST_FIREFOX"; do
  if [[ ! -f "$f" ]]; then
    echo "Error: $f not found"
    exit 1
  fi
  # Update version field (handles both "version": "1.0.0" and "version": "1.0.0",)
  sed -i "s/\"version\"[[:space:]]*:[[:space:]]*\"[0-9.]*\"/\"version\": \"$NEW_VERSION\"/" "$f"
  echo "✓ Updated $f to v$NEW_VERSION"
done

echo ""
echo "Done. Don't forget to commit and tag:"
echo "  git add manifests/"
echo "  git commit -m \"chore: bump version to $NEW_VERSION\""
echo "  git tag v$NEW_VERSION"
echo "  git push && git push --tags"