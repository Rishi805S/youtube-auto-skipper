# Getting Started with YouTube Auto Skipper

Complete guide to setting up your development environment and making your first contribution.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Building the Extension](#building-the-extension)
4. [Loading in Chrome](#loading-in-chrome)
5. [Testing Your Setup](#testing-your-setup)
6. [Development Workflow](#development-workflow)
7. [Running Tests](#running-tests)
8. [Code Quality Tools](#code-quality-tools)
9. [Common Setup Issues](#common-setup-issues)
10. [Next Steps](#next-steps)

---

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

#### 1. Node.js (v18 or higher)
**Check your version:**
```bash
node --version
# Should output: v18.x.x or higher
```

**Install/Update:**
- **macOS:** `brew install node` or download from [nodejs.org](https://nodejs.org/)
- **Linux:** `sudo apt install nodejs npm` (Ubuntu/Debian)
- **Windows:** Download installer from [nodejs.org](https://nodejs.org/)

#### 2. npm (v9 or higher)
Comes bundled with Node.js. Verify with:
```bash
npm --version
# Should output: 9.x.x or higher
```

#### 3. Git
**Check:**
```bash
git --version
```

**Install:**
- **macOS:** `brew install git` or from [git-scm.com](https://git-scm.com/)
- **Linux:** `sudo apt install git`
- **Windows:** Download from [git-scm.com](https://git-scm.com/)

#### 4. Google Chrome (Latest Version)
The extension targets Chrome, so you'll need it for testing.
- **Download:** [google.com/chrome](https://www.google.com/chrome/)

### Recommended Tools

- **VS Code:** Best IDE for TypeScript development ([code.visualstudio.com](https://code.visualstudio.com/))
- **VS Code Extensions:**
  - ESLint (`dbaeumer.vscode-eslint`)
  - Prettier (`esbenp.prettier-vscode`)
  - TypeScript and JavaScript Language Features (built-in)

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/youtube-auto-skipper.git
cd youtube-auto-skipper
```

### 2. Install Dependencies

```bash
npm install
```

This will:
- Install all Node.js dependencies
- Download Playwright browser binaries (for E2E tests)
- Set up TypeScript, Rollup, Jest, etc.

**Expected output:**
```
added 450 packages in 30s
```

**Note:** The first install may take 2-5 minutes due to Playwright setup.

### 3. Verify Installation

Check that all tools are available:

```bash
# Check TypeScript compiler
npx tsc --version
# Output: Version 5.4.5

# Check Rollup bundler
npx rollup --version
# Output: rollup v4.18.0

# Check Jest test runner
npx jest --version
# Output: 30.0.5
```

---

## Building the Extension

### Production Build

```bash
npm run build
```

This will:
1. Compile TypeScript files → JavaScript
2. Bundle all modules using Rollup
3. Minify code for production
4. Copy static files (manifest.json, popup.html, icons)
5. Output everything to `dist/` folder

**Expected output:**
```
dist/
├── background.js
├── content.js
├── popup.js
├── popup.html
├── manifest.json
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

**Build time:** ~5-10 seconds

### Development Build (with Watch Mode)

For active development, use watch mode to automatically rebuild on file changes:

```bash
npm run watch
```

**What this does:**
- Watches all `src/**/*.ts` files
- Rebuilds on save
- Skips minification (faster builds)
- Includes source maps for debugging

**Terminal output:**
```
[watch] build started (change: src/content/simple-skipper.ts)
[watch] build finished in 1.2s
```

**Tip:** Keep this running in a separate terminal while developing!

---

## Loading in Chrome

### Step 1: Open Extensions Page

Navigate to:
```
chrome://extensions/
```

Or click:
`Chrome Menu (⋮) → Extensions → Manage Extensions`

### Step 2: Enable Developer Mode

Toggle **Developer mode** switch in the top-right corner.

**Before:**
```
[Developer mode: OFF]
```

**After:**
```
[Developer mode: ON]
✓ Load unpacked
✓ Pack extension
✓ Update
```

### Step 3: Load Unpacked Extension

1. Click **"Load unpacked"** button
2. Navigate to the `youtube-auto-skipper` folder
3. Select the **`dist/`** folder (not the root project folder!)
4. Click **"Select"**

**Success indicators:**
- Extension appears in the list
- Icon shows in Chrome toolbar
- No error messages

### Step 4: Verify Installation

The extension card should show:
```
📦 YouTube Auto Skipper
   Version 1.0.0
   Manifest V3
   ID: <random-extension-id>
   [✓] Enabled
```

### Step 5: Pin to Toolbar (Optional)

1. Click the puzzle icon (Extensions) in Chrome toolbar
2. Find "YouTube Auto Skipper"
3. Click the pin icon to keep it visible

---

## Testing Your Setup

### Quick Test Checklist

#### 1. Navigate to YouTube
Open any YouTube video:
```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

#### 2. Check Console for Logs
1. Open DevTools: `F12` or `Ctrl+Shift+I` (Windows/Linux) / `Cmd+Option+I` (Mac)
2. Go to **Console** tab
3. Look for extension logs:

```
[SponsorSkip] Simple content script loaded
[SponsorSkip] Current video ID: dQw4w9WgXcQ
[SponsorSkip] New video detected, loading segments...
[Fetch][Tier 1] Description chapters: 0
[Fetch][Tier 2] SponsorBlock API: 0
[SponsorSkip] Segments loaded: []
```

**If you see these logs:** ✅ Content script is working!

#### 3. Test Keyboard Shortcuts

Try pressing:
- **`Alt+H`** → Should show help toast in top-right corner
- **`Alt+S`** → Should toggle extension (toast notification)
- **`Alt+1`** → Should show "Action: SKIP" toast

**If toasts appear:** ✅ Input handler is working!

#### 4. Test Extension Popup

1. Click extension icon in toolbar
2. Popup should open showing:
   - Enable/Disable toggle
   - Action selector (Skip/Mute/Watch)
   - Ad skipping toggle
   - Statistics

**If popup opens:** ✅ Popup is working!

### Test Videos

Use these videos to test different scenarios:

1. **Video with SponsorBlock data:**
   ```
   https://www.youtube.com/watch?v=dQw4w9WgXcQ
   ```

2. **Video with description chapters:**
   Search for: "video with sponsor timestamps in description"

3. **Video with ads:**
   Any popular video (to test ad skipping)

---

## Development Workflow

### Recommended Workflow

```bash
# Terminal 1: Start watch mode
npm run watch

# Terminal 2: Run tests on file changes
npm run test:watch

# Make changes in VS Code
# → Save file
# → Rollup rebuilds (Terminal 1)
# → Tests re-run (Terminal 2)
# → Reload extension in Chrome
```

### Reload Extension After Changes

After making code changes, you **must reload the extension** in Chrome:

**Option 1: Extensions Page**
1. Go to `chrome://extensions/`
2. Find "YouTube Auto Skipper"
3. Click the **refresh icon** (🔄)

**Option 2: Keyboard Shortcut**
- Press `Ctrl+R` (Windows/Linux) or `Cmd+R` (Mac) on `chrome://extensions/` page

**Option 3: Use Extension Reloader**
Install "Extensions Reloader" extension for one-click reload:
- [Chrome Web Store Link](https://chrome.google.com/webstore/detail/extensions-reloader/fimgfedafeadlieiabdeeaodndnlbhid)

### Hot Reload (Not Supported)

⚠️ **Note:** Chrome extensions do not support true hot reload. You must manually reload after every change.

---

## Running Tests

### Unit Tests

Run all unit tests:
```bash
npm test
```

**Watch mode (recommended for TDD):**
```bash
npm run test:watch
```

**Run specific test file:**
```bash
npm test -- tieredFetcher.test.ts
```

**Run with coverage:**
```bash
npm test -- --coverage
```

**Expected output:**
```
PASS  tests/unit/tieredFetcher.test.ts
  ✓ returns normalized chapters if available (5 ms)
  ✓ returns normalized SponsorBlock segments if chapters unavailable (3 ms)
  ✓ returns empty array if all sources fail (2 ms)

Test Suites: 5 passed, 5 total
Tests:       15 passed, 15 total
Time:        2.5s
```

### End-to-End Tests

Run Playwright E2E tests:
```bash
npm run test:e2e
```

**Run in headed mode (see browser):**
```bash
npx playwright test --headed
```

**Run specific test:**
```bash
npx playwright test sponsorSkip
```

**Debug mode:**
```bash
npx playwright test --debug
```

**Expected output:**
```
Running 3 tests using 1 worker

  ✓ [chromium] › sponsorSkip.test.ts:5:1 › loads YouTube page (1.2s)
  ✓ [chromium] › sponsorSkip.test.ts:12:1 › injects content script (0.8s)
  ✓ [chromium] › sponsorSkip.test.ts:20:1 › detects video ID (1.1s)

  3 passed (3.1s)
```

---

## Code Quality Tools

### Linting (ESLint)

Check code for errors and style issues:
```bash
npm run lint
```

**Auto-fix issues:**
```bash
npm run lint:fix
```

**Example output:**
```
✖ 3 problems (2 errors, 1 warning)
  2 errors and 0 warnings potentially fixable with the `--fix` option.

src/content/simple-skipper.ts
  12:5  error  'x' is defined but never used  @typescript-eslint/no-unused-vars
```

### Formatting (Prettier)

Check formatting:
```bash
npm run format-check
```

**Auto-format all files:**
```bash
npm run format
```

**VS Code Integration:**
1. Install Prettier extension
2. Add to `settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

### Type Checking (TypeScript)

Check types without building:
```bash
npm run build:ts
```

**Example output:**
```
src/content/simple-skipper.ts:45:10 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

Found 1 error in src/content/simple-skipper.ts:45
```

### Pre-Commit Checklist

Before committing, run:
```bash
npm run lint
npm run format-check
npm run build:ts
npm test
```

Or create a single command in `package.json`:
```json
"precommit": "npm run lint && npm run format-check && npm run build:ts && npm test"
```

---

## Common Setup Issues

### Issue 1: `npm install` fails with EACCES

**Error:**
```
npm ERR! code EACCES
npm ERR! syscall access
npm ERR! path /usr/local/lib/node_modules
```

**Solution:**
Fix npm permissions or use nvm:
```bash
# Option 1: Use nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Option 2: Fix permissions
sudo chown -R $USER /usr/local/lib/node_modules
```

---

### Issue 2: Extension doesn't load in Chrome

**Symptoms:**
- "Manifest file is missing or unreadable"
- "Required value 'version' is missing"

**Solution:**
Ensure you selected the **`dist/`** folder, not the root folder:
```
✗ Wrong: /path/to/youtube-auto-skipper
✓ Correct: /path/to/youtube-auto-skipper/dist
```

Run build first if `dist/` doesn't exist:
```bash
npm run build
```

---

### Issue 3: Extension loads but doesn't work

**Symptoms:**
- No console logs
- Keyboard shortcuts don't work
- No progress bar markers

**Debug steps:**
1. Check extension is enabled: `chrome://extensions/`
2. Check Console for errors: `F12` → Console tab
3. Verify content script injected:
   - Go to `chrome://extensions/`
   - Click "Inspect views: background page" (if available)
   - Check for error messages
4. Force reload extension: Click refresh icon (🔄)
5. Hard refresh YouTube page: `Ctrl+Shift+R` (Windows/Linux) / `Cmd+Shift+R` (Mac)

---

### Issue 4: TypeScript errors after `npm install`

**Error:**
```
error TS2307: Cannot find module '@types/chrome'
```

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

### Issue 5: Playwright tests fail to run

**Error:**
```
browserType.launch: Executable doesn't exist at /path/to/chrome
```

**Solution:**
Install Playwright browsers:
```bash
npx playwright install chrome
```

Or install all browsers:
```bash
npx playwright install
```

---

### Issue 6: Extension works but logs are missing

**Cause:** `Logger.isDebug` is set to `false`

**Solution:**
1. Open `src/utils/Logger.ts`
2. Ensure:
```typescript
private static isDebug = true;
```
3. Rebuild:
```bash
npm run build
```
4. Reload extension in Chrome

---

### Issue 7: Changes not reflected after rebuild

**Cause:** Chrome caches extension files aggressively

**Solution:**
1. Reload extension: `chrome://extensions/` → Click refresh (🔄)
2. Hard refresh YouTube tab: `Ctrl+Shift+R`
3. Clear cache: Chrome Settings → Privacy → Clear browsing data → Cached images and files
4. **Nuclear option:** Remove and re-add extension

---

### Issue 8: ESLint/Prettier conflicts

**Error:**
```
Delete `␍` [prettier/prettier]
```

**Cause:** Line ending mismatch (CRLF vs LF)

**Solution:**
Add to `.prettierrc`:
```json
{
  "endOfLine": "lf"
}
```

Convert all files:
```bash
npm run format
```

---

## Next Steps

### Learn the Codebase

1. **Read Architecture Docs:**
   - [CODE_MASTERY.md](./CODE_MASTERY.md) - High-level architecture
   - [MODULES.md](./MODULES.md) - Module deep dives
   - [API_REFERENCE.md](./API_REFERENCE.md) - Function signatures

2. **Explore Key Files:**
   ```
   src/content/simple-skipper.ts    ← Start here (main orchestrator)
   src/engine/tieredFetcher.ts      ← Core detection logic
   src/features/adSkipper.ts         ← Ad skipping feature
   src/ui/NotificationManager.ts     ← UI feedback
   ```

3. **Run Existing Tests:**
   ```bash
   npm run test:watch
   ```
   Open test files to understand expected behavior.

### Make Your First Change

**Easy First Tasks:**
1. Add a new keyboard shortcut (modify `src/features/InputHandler.ts`)
2. Customize toast notification style (modify `src/config/constants.ts`)
3. Add a new sponsor keyword (modify `src/pipeline/transcriptParser.ts`)
4. Improve logging messages (modify `src/utils/Logger.ts`)

### Join the Community

- **Report Bugs:** [GitHub Issues](https://github.com/yourusername/youtube-auto-skipper/issues)
- **Suggest Features:** [GitHub Discussions](https://github.com/yourusername/youtube-auto-skipper/discussions)
- **Contribute Code:** See [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## Quick Reference

### Essential Commands

```bash
# Development
npm run watch              # Auto-rebuild on changes
npm run dev                # Development build + watch

# Building
npm run build              # Production build
npm run build:ts           # Type check only

# Testing
npm test                   # Run unit tests
npm run test:watch         # Watch mode
npm run test:e2e           # E2E tests

# Code Quality
npm run lint               # Check for errors
npm run lint:fix           # Auto-fix errors
npm run format             # Format code
npm run format-check       # Check formatting
```

### File Locations

```
src/                   ← Source code
dist/                  ← Built extension (load this in Chrome)
tests/                 ← Unit and E2E tests
public/                ← Static assets (icons, popup.html)
docs/                  ← Documentation
```

### Useful Chrome URLs

```
chrome://extensions/                 ← Manage extensions
chrome://extensions/?errors=<id>     ← View extension errors
chrome://inspect/#extensions         ← Inspect background page
about:blank                          ← Clean slate for testing
```

---

## Getting Help

**Stuck?** Check these resources:

1. **Documentation:**
   - [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues
   - [FAQ.md](./FAQ.md) - Frequently asked questions
   - [API_REFERENCE.md](./API_REFERENCE.md) - Function docs

2. **Debugging:**
   - Enable verbose logging in `src/utils/Logger.ts`
   - Check Console (F12) for error messages
   - Inspect background page: `chrome://extensions/` → "Inspect views"

3. **Community:**
   - [GitHub Issues](https://github.com/yourusername/youtube-auto-skipper/issues)
   - [Discussions](https://github.com/yourusername/youtube-auto-skipper/discussions)

---

**Happy Coding! 🚀**

**Last Updated:** 2024
**Version:** 1.0.0
