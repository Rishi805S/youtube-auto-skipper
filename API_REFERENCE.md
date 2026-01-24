# API Reference

Complete API documentation for all modules and functions in youtube-auto-skipper.

## Table of Contents

- [Engine Module](#engine-module)
  - [tieredFetcher](#tieredfetcher)
  - [normalizeSegments](#normalizesegments)
- [API Module](#api-module)
  - [SponsorBlockClient](#sponsorblockclient)
- [Pipeline Module](#pipeline-module)
  - [chapterScraper](#chapterscraper)
  - [transcriptParser](#transcriptparser)
- [Features Module](#features-module)
  - [adSkipper](#adskipper)
  - [InputHandler](#inputhandler)
- [Services Module](#services-module)
  - [InjectorService](#injectorservice)
  - [NotificationService](#notificationservice)
- [UI Module](#ui-module)
  - [ProgressBarVisualizer](#progressbarvisualizer)
  - [NotificationManager](#notificationmanager)
- [Utils Module](#utils-module)
  - [Logger](#logger)
  - [VideoManager](#videomanager)
  - [domHelpers](#domhelpers)
- [Config Module](#config-module)
  - [constants](#constants)
- [Types](#types)

---

## Engine Module

### tieredFetcher

**File:** `src/engine/tieredFetcher.ts`

Three-tiered segment detection system that tries multiple sources in priority order.

#### `getSegmentsByPriority(videoId: string): Promise<Segment[]>`

Fetches sponsor segments using a cascading strategy (chapters → SponsorBlock → transcript).

**Parameters:**
- `videoId: string` - YouTube video ID (11 characters)

**Returns:**
- `Promise<Segment[]>` - Array of normalized segments with `start` and `end` times

**Logic Flow:**
1. **Tier 1 (Fastest):** Scrapes video description for chapter timestamps
2. **Tier 2 (Most Accurate):** Queries SponsorBlock community database
3. **Tier 3 (Fallback):** Analyzes transcript for sponsor keywords

**Error Handling:**
- Returns empty array `[]` if all tiers fail
- Logs errors to console with `[Fetch]` prefix
- Never throws exceptions (graceful degradation)

**Example:**
```typescript
import { getSegmentsByPriority } from './engine/tieredFetcher';

const videoId = 'dQw4w9WgXcQ';
const segments = await getSegmentsByPriority(videoId);

if (segments.length > 0) {
  console.log(`Found ${segments.length} sponsor segments`);
  segments.forEach(seg => {
    console.log(`Skip from ${seg.start}s to ${seg.end}s`);
  });
}
```

**Performance:**
- Tier 1: ~50-200ms (DOM parsing only)
- Tier 2: ~100-500ms (network + parsing)
- Tier 3: ~500-2000ms (network + NLP heuristics)

**Related:**
- [normalizeSegments](#normalizesegments) - Post-processes results
- [Segment Type](#segment) - Return value structure

---

### normalizeSegments

**File:** `src/engine/normalizeSegments.ts`

Post-processes raw segments by sorting, merging overlaps, and adding padding.

#### `normalizeSegments(segments: Segment[], padding = 0): Segment[]`

Deduplicates and merges segments that overlap or are within padding threshold.

**Parameters:**
- `segments: Segment[]` - Array of raw segments from any source
- `padding?: number` - Seconds to add before/after each segment (default: 0)

**Returns:**
- `Segment[]` - Sorted, merged, deduplicated segments

**Algorithm:**
1. Add padding to each segment (early start, late end)
2. Sort segments by start time
3. Merge segments where `next.start <= current.end`
4. Return consolidated list

**Example:**
```typescript
import { normalizeSegments } from './engine/normalizeSegments';

const raw = [
  { start: 100, end: 120 },
  { start: 115, end: 130 }, // Overlaps with first
  { start: 200, end: 220 },
];

const merged = normalizeSegments(raw, 2);
// Result: [
//   { start: 98, end: 132 },  // Merged first two with 2s padding
//   { start: 198, end: 222 }  // Third segment with padding
// ]
```

**Edge Cases:**
- Empty input → returns `[]`
- Single segment → returns padded version
- Negative `start` after padding → clamped to `0`

**Related:**
- [getSegmentsByPriority](#getsegmentsbypriority) - Uses this as final step

---

## API Module

### SponsorBlockClient

**File:** `src/api/SponsorBlockClient.ts`

Client for the SponsorBlock community API (https://sponsor.ajay.app).

#### `fetchSponsorBlockSegments(videoId: string): Promise<Segment[]>`

Fetches crowdsourced sponsor segments from SponsorBlock API.

**Parameters:**
- `videoId: string` - YouTube video ID

**Returns:**
- `Promise<Segment[]>` - Segments with `sponsor` category only

**API Details:**
- **Endpoint:** `https://sponsor.ajay.app/api/skipSegments?videoID={videoId}`
- **Method:** GET
- **Rate Limit:** None enforced (be respectful)
- **Privacy:** No authentication required, anonymous requests

**Response Filtering:**
- Only includes `category === 'sponsor'`
- Ignores: intro, outro, interaction, selfpromo, music_offtopic

**Example:**
```typescript
import { fetchSponsorBlockSegments } from './api/SponsorBlockClient';

const segments = await fetchSponsorBlockSegments('dQw4w9WgXcQ');
// Returns: [{ start: 10.5, end: 45.2, category: 'sponsor' }, ...]
```

**Error Handling:**
- HTTP errors (404, 500) → returns `[]`
- Network failures → returns `[]`
- Invalid JSON → returns `[]`
- No exceptions thrown

**Raw API Response Format:**
```typescript
interface SponsorBlockApiSegment {
  category: string;           // 'sponsor', 'intro', 'outro', etc.
  segment: [number, number]; // [startTime, endTime]
  UUID: string;              // Unique segment ID
  videoDuration: number;     // Total video length
  locked: number;            // Is segment vote-locked?
  votes: number;             // Community upvotes/downvotes
}
```

**Related:**
- [Types: SponsorBlockApiSegment](#sponsorblockapisegment)
- [Official API Docs](https://wiki.sponsor.ajay.app/w/API_Docs)

---

## Pipeline Module

### chapterScraper

**File:** `src/pipeline/chapterScraper.ts`

**Tier 1 Strategy:** Extracts sponsor segments from YouTube video description chapters.

#### `scrapeChapterSegments(): Promise<Segment[]>`

Parses description DOM to find chapters with "sponsor" in the title.

**Parameters:** None (operates on current page)

**Returns:**
- `Promise<Segment[]>` - Segments matching sponsor keyword

**How It Works:**
1. Clicks "Show more" button in description (`#expand`)
2. Finds all anchor tags in `#description a`
3. Filters anchors containing timestamps (MM:SS or HH:MM:SS format)
4. Extracts chapter titles from adjacent text
5. Filters chapters where title includes "sponsor" (case-insensitive)
6. Calculates `end` time from next chapter's start (or video duration)

**Example:**
```typescript
import { scrapeChapterSegments } from './pipeline/chapterScraper';

// Requires YouTube page with description like:
// "0:00 Intro
//  1:30 Sponsor
//  3:45 Main Content"

const segments = await scrapeChapterSegments();
// Returns: [{ start: 90, end: 225 }]  // 1:30 to 3:45
```

**Regex Pattern:**
```typescript
const TIME_RE = /(\d{1,2}(?::\d{2}){1,2})/;
// Matches: "1:30", "12:45", "1:23:45"
```

**DOM Structure Expected:**
```html
<div id="description">
  <a href="...">0:00</a> Intro<br>
  <a href="...">1:30</a> Sponsor<br>
  <a href="...">3:45</a> Content
</div>
```

**Error Handling:**
- Description not expanded → waits 200ms, retries
- No timestamps found → returns `[]`
- Parsing errors → logs to console, returns `[]`

**Performance:**
- Best case: 50ms (description already open)
- Worst case: 250ms (needs to expand + wait)

**Related:**
- [domHelpers: clickWithRetry](#clickwithretry)
- [domHelpers: timestampToSeconds](#timestamptoseconds)

---

### transcriptParser

**File:** `src/pipeline/transcriptParser.ts`

**Tier 3 Strategy:** Uses transcript captions to detect sponsor segments via keyword heuristics.

#### `parseTranscriptSegments(): Promise<Segment[]>`

Analyzes video transcript for sponsor-related keywords and phrases.

**Parameters:** None (operates on current page)

**Returns:**
- `Promise<Segment[]>` - Segments where sponsor keywords cluster

**Heuristics:**
**Sponsor Keywords:**
```typescript
const KEYWORDS = [
  'sponsor', 'sponsored by', 'thanks to', 'brought to you by',
  'affiliate link', 'discount code', 'promo code', 'coupon',
  'use code', 'visit', 'check out', 'go to'
];
```

**Algorithm:**
1. Fetch transcript from YouTube's caption track
2. Split into timed cues (text + start time)
3. Score each cue based on keyword matches
4. Group high-scoring cues into segments
5. Apply duration thresholds (10-60 seconds typical)

**Example:**
```typescript
import { parseTranscriptSegments } from './pipeline/transcriptParser';

const segments = await parseTranscriptSegments();
// Returns segments where transcript contains sponsor keywords
```

**Configuration:**
```typescript
// From src/config/constants.ts
TRANSCRIPT_HEURISTICS: {
  SEGMENT_DURATION: 30,    // Default segment length (seconds)
  GAP_THRESHOLD: 60,       // Max gap between related keywords
  MIN_CONFIDENCE: 0.7,     // Minimum score to include
  MAX_CONFIDENCE: 0.9,     // Max score ceiling
  CONFIDENCE_INCREMENT: 0.1 // Score boost per keyword match
}
```

**Limitations:**
- Requires captions to be available
- Not effective with auto-generated captions that lack keywords
- May produce false positives on product review videos

**Error Handling:**
- No captions available → returns `[]`
- Transcript fetch fails → returns `[]`
- Parsing errors → logs warning, returns `[]`

**Performance:**
- Network: 500-1500ms (downloading caption file)
- Parsing: 50-200ms (depends on transcript length)

**Related:**
- [InjectorService](#injectorservice) - Fetches caption URL
- [CONFIG.TRANSCRIPT_HEURISTICS](#constants)

---

## Features Module

### adSkipper

**File:** `src/features/adSkipper.ts`

Automatic YouTube ad detection and skipping.

#### `trySkipAd(): void`

Attempts to skip the currently playing ad (if any).

**Parameters:** None

**Returns:** `void`

**How It Works:**
1. Check if `#movie_player` has class `ad-showing`
2. Fast-forward unskippable ads: `video.currentTime = video.duration`
3. Click skip button using selector cascade (see [CONFIG.SELECTORS.AD_SKIP_BUTTON](#constants))

**Example:**
```typescript
import { trySkipAd } from './features/adSkipper';

// Call every second to catch ads immediately
setInterval(() => {
  trySkipAd();
}, 1000);
```

**Skip Button Detection:**
- Primary: Known CSS selectors (`.ytp-skip-ad-button`, etc.)
- Fallback: Text/ARIA label search for "skip" keyword
- Visible check: Ensures button is actually clickable

---

#### `startAdDetection(): NodeJS.Timeout`

Starts a polling interval to continuously check for ads.

**Parameters:** None

**Returns:** `NodeJS.Timeout` - Interval ID for cleanup

**Example:**
```typescript
import { startAdDetection, stopAdDetection } from './features/adSkipper';

const intervalId = startAdDetection();

// Later, when user disables feature:
stopAdDetection(intervalId);
```

**Interval Timing:** 1000ms (configurable via `CONFIG.TIMEOUTS.AD_CHECK_INTERVAL`)

---

#### `stopAdDetection(intervalId: NodeJS.Timeout): void`

Stops the ad detection loop.

**Parameters:**
- `intervalId: NodeJS.Timeout` - ID returned from `startAdDetection()`

**Returns:** `void`

---

### InputHandler

**File:** `src/features/InputHandler.ts`

Keyboard shortcut handler for extension controls.

#### `class InputHandler`

Manages keyboard shortcuts and state updates.

**Constructor:**
```typescript
constructor(
  private getState: () => SkipperState,
  private updateState: StateUpdater,
  private showStats: StatsProvider,
  private showInfo: InfoProvider,
  private showPerf: InfoProvider,
  private openPopup: PopupOpener
)
```

**Parameters:**
- `getState` - Function that returns current state
- `updateState` - Function to update state
- `showStats` - Callback to display statistics
- `showInfo` - Callback to show extension info
- `showPerf` - Callback to show performance metrics
- `openPopup` - Callback to open extension popup

**Example:**
```typescript
import { InputHandler } from './features/InputHandler';

const state = { isEnabled: true, sponsorAction: 'skip', skipAds: true };

const handler = new InputHandler(
  () => state,
  (newState) => Object.assign(state, newState),
  () => console.log('Stats'),
  () => console.log('Info'),
  () => console.log('Performance'),
  () => chrome.runtime.openOptionsPage()
);

handler.init();
```

---

#### `init(): void`

Attaches keyboard event listeners.

**Keyboard Shortcuts:**
| Shortcut | Action |
|----------|--------|
| `Alt+S` | Toggle extension on/off |
| `Alt+1` | Set action to SKIP |
| `Alt+2` | Set action to MUTE |
| `Alt+3` | Set action to WATCH (notify only) |
| `Alt+A` | Toggle ad skipping |
| `Alt+D` | Show statistics |
| `Alt+M` | Show info |
| `Alt+P` | Show performance |
| `Alt+O` | Open popup |
| `Alt+H` | Show help |

**Input Protection:**
- Shortcuts ignored when typing in `<input>` or `<textarea>`

---

#### Type: `SkipperState`

```typescript
interface SkipperState {
  isEnabled: boolean;
  sponsorAction: 'skip' | 'mute' | 'ignore';
  skipAds: boolean;
}
```

---

## Services Module

### InjectorService

**File:** `src/services/InjectorService.ts`

Injects scripts into the page context to access YouTube's internal variables.

#### `static injectTrackUrlFetcher(tabId: number): Promise<void>`

Injects a script into the main page context to fetch caption track URLs.

**Parameters:**
- `tabId: number` - Chrome tab ID

**Returns:** `Promise<void>`

**Why This Exists:**
Chrome extensions run in an "isolated world" separate from the page's JavaScript. To access `window.ytInitialPlayerResponse` (which contains caption URLs), we inject code into the main world.

**Example:**
```typescript
import { InjectorService } from './services/InjectorService';

// From background script:
chrome.tabs.query({ active: true }, ([tab]) => {
  InjectorService.injectTrackUrlFetcher(tab.id);
});

// From content script (listener):
window.addEventListener('message', (event) => {
  if (event.data.type === 'SPONSORSKIP_TRACK_URL') {
    const captionUrl = event.data.payload;
    // Use caption URL...
  }
});
```

**Message Protocol:**
```typescript
// Sent from injected script to content script:
window.postMessage({
  type: 'SPONSORSKIP_TRACK_URL',
  payload: 'https://youtube.com/api/timedtext?v=...'
}, '*');
```

**Related:**
- [Chrome Scripting API Docs](https://developer.chrome.com/docs/extensions/reference/scripting/)

---

### NotificationService

**File:** `src/services/NotificationService.ts`

Service for sending notifications between extension contexts.

#### Functions

See implementation for message passing utilities between content scripts, background, and popup.

---

## UI Module

### ProgressBarVisualizer

**File:** `src/ui/ProgressBarVisualizer.ts`

Renders red markers on YouTube's progress bar to indicate sponsor segments.

#### `class ProgressBarVisualizer`

Visual indicators for detected segments.

**Methods:**
- `render(segments: Segment[]): void` - Draws markers on progress bar
- `clear(): void` - Removes all markers

**Example:**
```typescript
import { ProgressBarVisualizer } from './ui/ProgressBarVisualizer';

const visualizer = new ProgressBarVisualizer();
visualizer.render([
  { start: 90, end: 120 },
  { start: 300, end: 330 }
]);

// Later:
visualizer.clear();
```

**Visual Style:**
- Red semi-transparent bars
- Positioned absolutely over progress bar
- Width calculated as `(segment.length / video.duration) * 100%`

---

### NotificationManager

**File:** `src/ui/NotificationManager.ts`

Toast notification system.

#### `static show(message: string): void`

Displays a temporary toast notification in the top-right corner.

**Parameters:**
- `message: string` - Text to display (supports emoji)

**Returns:** `void`

**Example:**
```typescript
import { NotificationManager } from './ui/NotificationManager';

NotificationManager.show('⏭️ Skipped sponsor segment');
NotificationManager.show('🔇 Muting segment');
```

**Behavior:**
- Duration: 3 seconds (configurable via `CONFIG.TIMEOUTS.TOAST_DURATION`)
- Position: Fixed top-right
- Auto-removes after timeout
- Can show multiple toasts (stack vertically)

**Styling:** See `CONFIG.STYLES.TOAST` for CSS properties

---

## Utils Module

### Logger

**File:** `src/utils/Logger.ts`

Centralized logging utility with prefix and debug toggle.

#### `class Logger`

Static logging methods with consistent formatting.

**Methods:**

##### `static log(message: string, ...args: any[]): void`

Logs info messages (only if debug enabled).

**Example:**
```typescript
import { Logger } from './utils/Logger';

Logger.log('Video detected', { duration: 300, title: 'Demo' });
// Output: [SponsorSkip] Video detected { duration: 300, title: 'Demo' }
```

---

##### `static warn(message: string, ...args: any[]): void`

Logs warnings (always shown).

---

##### `static error(message: string, ...args: any[]): void`

Logs errors (always shown).

---

##### `static info(message: string, ...args: any[]): void`

Logs informational messages (always shown).

---

**Configuration:**
```typescript
class Logger {
  private static prefix = '[SponsorSkip]';
  private static isDebug = true; // Toggle via settings
}
```

---

### VideoManager

**File:** `src/utils/VideoManager.ts`

Singleton for managing video element access and state.

#### `class VideoManager`

**Methods:**

##### `static getInstance(): VideoManager`

Returns singleton instance.

---

##### `getVideo(): HTMLVideoElement | null`

Returns current video element.

**Example:**
```typescript
import { VideoManager } from './utils/VideoManager';

const manager = VideoManager.getInstance();
const video = manager.getVideo();

if (video) {
  console.log('Current time:', video.currentTime);
  console.log('Duration:', video.duration);
}
```

---

##### `getDuration(): number`

Returns video duration in seconds.

**Returns:** `number` - Duration or `0` if no video

---

##### `getCurrentTime(): number`

Returns current playback time in seconds.

---

### domHelpers

**File:** `src/utils/domHelpers.ts`

DOM utility functions.

#### `findFirstVisible<T extends HTMLElement>(selectors: string | string[]): T | null`

Finds first visible element matching selector(s).

**Parameters:**
- `selectors: string | string[]` - CSS selector(s) to try

**Returns:** First visible element or `null`

**Example:**
```typescript
import { findFirstVisible } from './utils/domHelpers';

const skipButton = findFirstVisible([
  '.ytp-skip-ad-button',
  'button[aria-label*="Skip"]'
]);

if (skipButton) {
  skipButton.click();
}
```

---

#### `clickWithRetry(selector: string, retries = 3): Promise<boolean>`

Clicks an element with retry logic.

**Parameters:**
- `selector: string` - CSS selector
- `retries?: number` - Max attempts (default: 3)

**Returns:** `Promise<boolean>` - Success status

**Example:**
```typescript
import { clickWithRetry } from './utils/domHelpers';

const success = await clickWithRetry('#expand', 5);
if (success) {
  console.log('Description expanded');
}
```

---

#### `timestampToSeconds(timestamp: string): number`

Converts "MM:SS" or "HH:MM:SS" to seconds.

**Parameters:**
- `timestamp: string` - Time string (e.g., "1:30", "1:23:45")

**Returns:** `number` - Total seconds

**Example:**
```typescript
import { timestampToSeconds } from './utils/domHelpers';

timestampToSeconds('1:30');      // 90
timestampToSeconds('1:23:45');   // 5025
timestampToSeconds('0:05');      // 5
```

---

## Config Module

### constants

**File:** `src/config/constants.ts`

Centralized configuration constants.

#### `CONFIG` Object

**Structure:**
```typescript
export const CONFIG = {
  SELECTORS: {
    VIDEO: string;
    PLAYER: string;
    AD_SKIP_BUTTON: string[];
  };
  TIMEOUTS: {
    AD_CHECK_INTERVAL: number;      // 1000ms
    SKIP_COOLDOWN: number;          // 3000ms
    TOAST_DURATION: number;         // 3000ms
    URL_CHANGE_DELAY: number;       // 1000ms
    VIDEO_CHECK_THROTTLE: number;   // 500ms
  };
  STYLES: {
    TOAST: string; // CSS string
  };
  DEFAULTS: {
    ENABLED: boolean;
    ACTION: 'skip' | 'mute' | 'ignore';
    SKIP_ADS: boolean;
  };
  TRANSCRIPT_HEURISTICS: {
    SEGMENT_DURATION: number;       // 30s
    GAP_THRESHOLD: number;          // 60s
    MIN_CONFIDENCE: number;         // 0.7
    MAX_CONFIDENCE: number;         // 0.9
    CONFIDENCE_INCREMENT: number;   // 0.1
  };
};
```

**Example:**
```typescript
import { CONFIG } from './config/constants';

// Use selector
const video = document.querySelector(CONFIG.SELECTORS.VIDEO);

// Use timeout
setTimeout(checkAds, CONFIG.TIMEOUTS.AD_CHECK_INTERVAL);

// Use defaults
const state = {
  isEnabled: CONFIG.DEFAULTS.ENABLED,
  action: CONFIG.DEFAULTS.ACTION
};
```

---

## Types

**File:** `src/types/types.ts`

### `Segment`

```typescript
interface Segment {
  start: number;    // Start time in seconds
  end: number;      // End time in seconds
  category?: string; // Optional: 'sponsor', 'intro', 'outro', etc.
}
```

---

### `Cue`

```typescript
interface Cue {
  start: number; // Start time in seconds
  text: string;  // Caption text
}
```

Used in transcript parsing.

---

### `SponsorBlockApiSegment`

```typescript
interface SponsorBlockApiSegment {
  category: string;           // 'sponsor', 'intro', 'outro', etc.
  segment: [number, number]; // [startTime, endTime] tuple
}
```

Raw API response format from SponsorBlock.

---

## Quick Lookup Table

| Function | Module | Purpose |
|----------|--------|---------|
| `getSegmentsByPriority()` | engine/tieredFetcher | Fetch segments using 3-tier strategy |
| `normalizeSegments()` | engine/normalizeSegments | Merge overlapping segments |
| `fetchSponsorBlockSegments()` | api/SponsorBlockClient | Query SponsorBlock API |
| `scrapeChapterSegments()` | pipeline/chapterScraper | Parse description chapters |
| `parseTranscriptSegments()` | pipeline/transcriptParser | Analyze captions for sponsors |
| `trySkipAd()` | features/adSkipper | Skip current ad |
| `startAdDetection()` | features/adSkipper | Start ad polling loop |
| `InputHandler.init()` | features/InputHandler | Setup keyboard shortcuts |
| `InjectorService.injectTrackUrlFetcher()` | services/InjectorService | Access YouTube internals |
| `NotificationManager.show()` | ui/NotificationManager | Show toast notification |
| `Logger.log()` | utils/Logger | Log debug message |
| `VideoManager.getInstance()` | utils/VideoManager | Get video singleton |
| `findFirstVisible()` | utils/domHelpers | Find visible DOM element |
| `clickWithRetry()` | utils/domHelpers | Click with retry logic |
| `timestampToSeconds()` | utils/domHelpers | Convert timestamp to seconds |

---

## Error Handling Patterns

All async functions follow these conventions:

**Pattern 1: Return Empty Array**
```typescript
try {
  // Attempt operation
  return results;
} catch (error) {
  console.error('[Context] Error:', error);
  return []; // Never throw
}
```

**Used by:**
- `getSegmentsByPriority()`
- `fetchSponsorBlockSegments()`
- `scrapeChapterSegments()`
- `parseTranscriptSegments()`

**Pattern 2: Silent Failure**
```typescript
if (!element) return; // Exit early
doSomething(element);
```

**Used by:**
- `trySkipAd()`
- UI rendering functions

**Pattern 3: Defensive Checks**
```typescript
if (!state.isEnabled || !segments.length) return;
// Proceed with logic
```

**Used by:**
- Main content script loops
- Event handlers

---

## Cross-References

- **Architecture:** See [CODE_MASTERY.md](./CODE_MASTERY.md) for system diagrams
- **Testing:** See [TESTING_DETAILED.md](./TESTING_DETAILED.md) for unit test examples
- **Troubleshooting:** See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues
- **Contributing:** See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines

---

**Last Updated:** 2024
**Version:** 1.0.0
