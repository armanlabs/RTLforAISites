# RTL for AI Sites

A browser extension that adds smart RTL (Right-to-Left) support for Persian/Arabic content on AI chat websites.

## Features

- **Per-block RTL detection** — Each paragraph/heading/list item gets its direction based on whether it *contains* Persian/Arabic letters (not just the first character)
- **Icon protection** — Prevents icon fonts (Material Symbols, Font Awesome, etc.) from breaking when Persian fonts are applied
- **Input support** — Sets `dir="auto"` on textareas and contenteditable elements
- **SPA compatible** — Works with single-page apps that navigate without reload
- **Cross-browser** — Manifest V3 for both Chrome and Firefox

## Supported Sites

| Site | Status |
|------|--------|
| claude.ai | ✅ |
| chatgpt.com / chat.openai.com | ✅ |
| gemini.google.com | ✅ |
| **notebooklm.google.com** | ✅ |
| grok.com / x.com/i/grok | ✅ |
| chat.deepseek.com | ✅ |
| perplexity.ai | ✅ |
| copilot.microsoft.com | ✅ |
| poe.com | ✅ |
| arena.ai | ✅ |

## Installation

### Chrome / Edge / Brave
1. Download `rtl-ai-chrome-v<version>.zip` from [Releases](https://github.com/your-repo/releases)
2. Unzip the file
3. Open `chrome://extensions/` → Enable **Developer mode**
4. Click **Load unpacked** → Select the unzipped folder

### Firefox
1. Download `rtl-ai-firefox-v<version>.zip` from [Releases](https://github.com/your-repo/releases)
2. Unzip the file
3. Open `about:debugging` → **This Firefox** → **Load Temporary Add-on**
4. Select `manifest.json` from the unzipped folder

## Development

### Project Structure
```
project/
├── src/                    # Extension source
│   ├── content.js          # Main content script (RTL logic)
│   ├── rtl.css             # RTL styles
│   ├── popup.html          # Extension popup UI
│   ├── popup.js            # Popup logic
│   ├── icons/              # Extension icons (48, 96, 128px)
│   └── _locales/           # i18n messages
├── manifests/
│   ├── manifest.chrome.json    # Chrome Manifest V3
│   └── manifest.firefox.json   # Firefox Manifest V3
├── .github/workflows/
│   └── release.yml         # CI/CD: builds on tag push
├── build.sh                # Build script (local)
└── bump-version.sh         # Version bump helper (local)
```

### Local Development

**Prerequisites:** bash, zip

```bash
# Clone and enter project
cd project

# Test build (both browsers)
./build.sh both

# Or build individually
./build.sh chrome
./build.sh firefox

# Output: dist/rtl-ai-chrome-vX.Y.Z.zip, dist/rtl-ai-firefox-vX.Y.Z.zip
```

### Testing Locally

1. Run `./build.sh both`
2. Load the unzipped `src/` folder as an unpacked extension (see Installation)
3. Visit any supported site and test RTL behavior

### Adding a New Site

1. Add the domain to `matches` in both manifest files
2. Add site-specific selectors to `SITE_SELECTORS` in `src/content.js`
3. Test and submit PR

## Release Process

### Automated (Recommended)

```bash
# 1. Commit your changes
git add .
git commit -m "feat: your changes"

# 2. Create and push a version tag (format: vX.Y.Z)
git tag v1.0.2
git push && git push --tags
```

**GitHub Actions will automatically:**
1. Extract version from tag (`v1.0.2` → `1.0.2`)
2. Update both manifests with the new version
3. Build Chrome & Firefox packages
4. Create a GitHub Release with the zip files attached

### Manual (Local)

```bash
# Bump version in manifests
./bump-version.sh 1.0.2

# Build
./build.sh both

# Commit, tag, push
git add manifests/
git commit -m "chore: bump version to 1.0.2"
git tag v1.0.2
git push && git push --tags
```

## How It Works

### RTL Detection
```javascript
// Persian/Arabic Unicode ranges
const RTL_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
```

Each text block (p, li, h1-h6, blockquote, etc.) is checked individually. If it contains **any** RTL character → `dir="rtl"`, otherwise `dir="ltr"`.

### Icon Protection
Icon elements are detected via class patterns (`material-symbols`, `fa-`, `icon`, etc.) and their `font-family` is locked with inline `!important` to prevent Persian font substitution from breaking ligatures.

### MutationObserver
Watches for DOM changes (including streamed AI responses) and re-processes new content automatically.

## Configuration

Settings are stored in `chrome.storage.local` (synced across devices):

| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | `true` | Master toggle |
| `font` | `true` | Apply Persian font + icon protection |

Access via extension popup or programmatically:
```javascript
chrome.storage.local.set({ enabled: false });
chrome.storage.local.set({ font: false });
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `./build.sh both`
5. Submit a PR

## License

MIT License — feel free to use, modify, and distribute.

## Credits

- Icon fonts: Google Material Symbols, Font Awesome
- Inspired by the need for proper Persian/Arabic support on AI platforms