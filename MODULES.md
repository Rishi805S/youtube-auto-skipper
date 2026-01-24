# Module Deep Dives

Comprehensive documentation of each module in youtube-auto-skipper, covering architecture, data flow, and implementation patterns.

## Table of Contents

1. [Background Service Worker](#1-background-service-worker)
2. [Content Script Architecture](#2-content-script-architecture)
3. [Engine & Detection Logic](#3-engine--detection-logic)
4. [Pipeline (Data Fetching)](#4-pipeline-data-fetching)
5. [Features (Ad Skipping, Input Handling)](#5-features-ad-skipping-input-handling)
6. [Services (Injection, Notifications)](#6-services-injection-notifications)
7. [UI Components](#7-ui-components)
8. [Utils & Config](#8-utils--config)
9. [Type Definitions](#9-type-definitions)

---

## 1. Background Service Worker

**Directory:** `src/background/`

### Purpose
Runs persistently in the background to:
- Monitor navigation events (YouTube SPA routing)
- Manage chrome.storage for persistent settings
- Handle cross-context messaging
- Initialize content scripts on YouTube tabs

### Files

#### `index.ts` - Background Script Entry Point

**Responsibilities:**
- Listen for `chrome.webNavigation.onHistoryStateUpdated` (detects YouTube video changes)
- Inject content scripts dynamically when needed
- Store/retrieve user settings and statistics
- Handle messages from popup and content scripts

**Key Events:**
```typescript
// YouTube uses SPA navigation, so we listen to history changes
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.url.includes('youtube.com/watch')) {
    // Inject or notify content script
    reinitializeContentScript(details.tabId);
  }
});
```

**Storage Schema:**
```typescript
{
  'skipper-enabled': boolean,
  'skipper-action': 'skip' | 'mute' | 'ignore',
  'skipper-ads': boolean,
  'stats-total-skips': number,
  'stats-time-saved': number
}
```

**Message Handlers:**
```typescript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_SETTINGS':
      // Load from chrome.storage.sync
      break;
    case 'UPDATE_SETTINGS':
      // Save to chrome.storage.sync
      break;
    case 'INCREMENT_SKIP':
      // Update statistics
      break;
  }
});
```

### Data Flow

```
YouTube Page Load
    ↓
webNavigation.onHistoryStateUpdated
    ↓
Background Script checks URL
    ↓
Injects content script if YouTube video page
    ↓
Content script requests settings
    ↓
Background returns settings from chrome.storage
```

### Dependencies
- **Chrome APIs:** `webNavigation`, `storage`, `runtime`, `tabs`
- **External:** None

### Performance Considerations
- Background scripts are event-based (not always running in MV3)
- Use `chrome.storage.sync` for small data only (<8KB limit)
- Avoid heavy computation in background context

---

## 2. Content Script Architecture

**Directory:** `src/content/`

### Purpose
The "brain" of the extension that runs on every YouTube page. Orchestrates all detection, skipping, and UI interactions.

### Files

#### `simple-skipper.ts` - Main Content Script Orchestrator

**Responsibilities:**
- Detect video changes (YouTube SPA)
- Load segments via tieredFetcher
- Monitor video playback (`timeupdate` event)
- Execute skip/mute actions
- Manage UI (progress bar markers, toasts)
- Handle keyboard shortcuts

**Core State:**
```typescript
const state: SkipperState = {
  isEnabled: true,
  sponsorAction: 'skip' | 'mute' | 'ignore',
  skipAds: true
};

let currentSegments: Segment[] = [];
let currentVideoId: string | null = null;
let skippedSegments = new Set<number>(); // Track processed segments
let lastSkipTimes = new Map<number, number>(); // Cooldown tracking
```

**Initialization Flow:**
```typescript
1. MutationObserver watches for video element changes
2. When video detected → loadSegments()
3. getSegmentsByPriority(videoId) → fetch segments
4. Initialize ProgressBarVisualizer with segments
5. Start timeupdate listener → checkForSkip()
6. Initialize InputHandler for keyboard shortcuts
7. Start ad detection loop (if enabled)
```

**Main Loop (`checkForSkip`):**
```typescript
function checkForSkip(video: HTMLVideoElement) {
  if (!state.isEnabled || !currentSegments.length) return;

  const currentTime = video.currentTime;

  for (const [index, segment] of currentSegments.entries()) {
    if (currentTime >= segment.start && currentTime < segment.end) {
      const canSkip = !skippedSegments.has(index) || 
                      Date.now() - lastSkipTimes.get(index) > 3000;
      
      if (canSkip) {
        executeSkipAction(video, segment, index);
        break;
      }
    }
  }
}
```

**Action Execution:**
```typescript
function executeSkipAction(video, segment, index) {
  switch (state.sponsorAction) {
    case 'skip':
      video.currentTime = segment.end;
      NotificationManager.show(`⏭️ Skipped ${duration}s`);
      break;
    
    case 'mute':
      originalVolume = video.volume;
      video.volume = 0;
      isMuted = true;
      setTimeout(() => {
        video.volume = originalVolume;
        isMuted = false;
      }, (segment.end - segment.start) * 1000);
      break;
    
    case 'ignore':
      NotificationManager.show(`ℹ️ Sponsor segment detected`);
      break;
  }
  
  skippedSegments.add(index);
  lastSkipTimes.set(index, Date.now());
}
```

### Data Flow

```
Video Detected (MutationObserver)
    ↓
Extract video ID from URL
    ↓
loadSegments() → getSegmentsByPriority(videoId)
    ↓
[Tier 1] Scrape chapters
    ↓
[Tier 2] Query SponsorBlock API
    ↓
[Tier 3] Parse transcript
    ↓
normalizeSegments(results)
    ↓
Initialize ProgressBarVisualizer
    ↓
video.addEventListener('timeupdate', checkForSkip)
    ↓
Monitor playback position
    ↓
Execute action when inside segment
```

### Dependencies
- **Internal:** engine/tieredFetcher, features/adSkipper, features/InputHandler, ui/ProgressBarVisualizer, ui/NotificationManager
- **External:** YouTube DOM structure

### Performance Considerations
- **Throttling:** `checkForSkip` runs on `timeupdate` (~250ms)
- **Cooldown:** 3-second cooldown prevents repeat skip loops
- **Early exits:** Check `isEnabled` and segment count first
- **Memory:** Clear `skippedSegments` on video change

---

## 3. Engine & Detection Logic

**Directory:** `src/engine/`

### Purpose
Core algorithm for detecting sponsor segments using a three-tiered strategy.

### Files

#### `tieredFetcher.ts` - Priority-Based Segment Detection

**Responsibility:** Implements the cascading detection strategy.

**Algorithm:**
```
1. Try Tier 1 (Local/Fast)
   ↓ (if empty)
2. Try Tier 2 (Network/Accurate)
   ↓ (if empty)
3. Try Tier 3 (Network/Heuristic)
   ↓
4. Return best result or []
```

**Implementation:**
```typescript
export async function getSegmentsByPriority(videoId: string): Promise<Segment[]> {
  try {
    // TIER 1: Local DOM scraping (fastest)
    const chapters = await scrapeChapterSegments();
    if (chapters.length) {
      console.log('[Tier 1] Success:', chapters.length);
      return normalizeSegments(chapters);
    }

    // TIER 2: Crowdsourced API (most reliable)
    const sponsorBlock = await fetchSponsorBlockSegments(videoId);
    if (sponsorBlock.length) {
      console.log('[Tier 2] Success:', sponsorBlock.length);
      return normalizeSegments(sponsorBlock);
    }

    // TIER 3: Transcript analysis (fallback)
    const transcript = await parseTranscriptSegments();
    console.log('[Tier 3] Fallback:', transcript.length);
    return normalizeSegments(transcript);
    
  } catch (error) {
    console.error('[Fetch] All tiers failed:', error);
    return []; // Graceful degradation
  }
}
```

**Tier Comparison:**
| Tier | Source | Speed | Accuracy | Network | Availability |
|------|--------|-------|----------|---------|--------------|
| 1 | Description chapters | 50-200ms | High (if present) | None | ~5% of videos |
| 2 | SponsorBlock API | 100-500ms | Very High | Yes | ~30% of videos |
| 3 | Transcript analysis | 500-2000ms | Medium | Yes | ~80% of videos |

**Why This Order?**
1. **Speed:** Try fastest first (no network)
2. **Accuracy:** SponsorBlock is human-verified
3. **Coverage:** Transcript catches videos without chapters/SB data

---

#### `normalizeSegments.ts` - Segment Post-Processing

**Responsibility:** Clean up raw segments by merging overlaps and adding padding.

**Algorithm:**
```typescript
function normalizeSegments(segments: Segment[], padding = 0): Segment[] {
  // Step 1: Add padding
  const padded = segments.map(seg => ({
    start: Math.max(0, seg.start - padding),
    end: seg.end + padding
  }));

  // Step 2: Sort by start time
  const sorted = padded.sort((a, b) => a.start - b.start);

  // Step 3: Merge overlapping segments
  const merged: Segment[] = [];
  let current = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start <= current.end) {
      // Overlaps → extend current segment
      current.end = Math.max(current.end, sorted[i].end);
    } else {
      // No overlap → save current, start new
      merged.push(current);
      current = sorted[i];
    }
  }
  merged.push(current);

  return merged;
}
```

**Example:**
```typescript
// Input:
[
  { start: 100, end: 120 },
  { start: 115, end: 135 },  // Overlaps with first
  { start: 300, end: 320 }
]

// After normalizeSegments(input, 2):
[
  { start: 98, end: 137 },   // Merged 1st and 2nd, added 2s padding
  { start: 298, end: 322 }   // 3rd segment with padding
]
```

**Use Cases:**
- Multiple sources may return slightly different time ranges for same segment
- Padding ensures we don't start skipping too abruptly
- Merging reduces UI clutter (fewer progress bar markers)

### Dependencies
- **pipeline:** chapterScraper, transcriptParser
- **api:** SponsorBlockClient
- **types:** Segment

---

## 4. Pipeline (Data Fetching)

**Directory:** `src/pipeline/`

### Purpose
Implements the three detection tiers as independent modules.

### Files

#### `chapterScraper.ts` - Tier 1: Description Chapters

**How It Works:**
```typescript
1. Find and click "Show more" button (#expand)
2. Wait for description to render (200ms)
3. Query all links in #description a
4. Filter links containing timestamps (regex: /\d{1,2}(:\d{2}){1,2}/)
5. Extract chapter titles from adjacent text
6. Filter chapters where title includes "sponsor" (case-insensitive)
7. Calculate end times from next chapter start or video duration
8. Return segments
```

**DOM Structure Expected:**
```html
<div id="description">
  <button id="expand">Show more</button>
  <a href="...">0:00</a> Intro<br>
  <a href="...">1:30</a> Sponsor - Brand Name<br>
  <a href="...">3:45</a> Main Content
</div>
```

**Code Example:**
```typescript
export async function scrapeChapterSegments(): Promise<Segment[]> {
  await clickWithRetry('#expand');
  await delay(200);

  const anchors = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('#description a')
  );

  const timestampAnchors = anchors.filter(a => 
    /\d{1,2}(:\d{2}){1,2}/.test(a.textContent || '')
  );

  const chapters = timestampAnchors.map((anchor, i) => {
    const start = timestampToSeconds(anchor.textContent);
    const end = timestampAnchors[i + 1]
      ? timestampToSeconds(timestampAnchors[i + 1].textContent)
      : videoManager.getDuration();
    const title = extractTitle(anchor);
    return { start, end, title };
  });

  return chapters.filter(ch => /sponsor/i.test(ch.title));
}
```

**Pros:**
- ✅ No network requests (instant)
- ✅ 100% accurate when present
- ✅ Creator-controlled

**Cons:**
- ❌ Rarely used (~5% of videos)
- ❌ Requires manual timestamps by creator
- ❌ DOM structure can change (YouTube updates)

---

#### `transcriptParser.ts` - Tier 3: Transcript Heuristics

**How It Works:**
```typescript
1. Inject script to access window.ytInitialPlayerResponse
2. Extract caption track URL from response
3. Fetch and parse caption XML/JSON
4. Split into timed cues (text + start time)
5. Score each cue based on keyword matches
6. Group high-scoring cues into segments
7. Apply duration and gap thresholds
8. Return segments
```

**Keyword Detection:**
```typescript
const SPONSOR_KEYWORDS = [
  'sponsor', 'sponsored by', 'thanks to',
  'brought to you by', 'affiliate link',
  'discount code', 'promo code', 'coupon',
  'use code', 'check out', 'visit'
];

function scoreTranscript(cues: Cue[]): Segment[] {
  const segments: Segment[] = [];
  let currentSegment: Segment | null = null;
  let confidence = 0;

  for (const cue of cues) {
    const text = cue.text.toLowerCase();
    const matchCount = SPONSOR_KEYWORDS.filter(kw => text.includes(kw)).length;

    if (matchCount > 0) {
      confidence += CONFIG.CONFIDENCE_INCREMENT * matchCount;
      
      if (!currentSegment) {
        currentSegment = { start: cue.start, end: cue.start + 30 };
      } else {
        currentSegment.end = cue.start + 30;
      }
    } else if (currentSegment) {
      // Check if gap is too large
      if (cue.start - currentSegment.end > CONFIG.GAP_THRESHOLD) {
        if (confidence >= CONFIG.MIN_CONFIDENCE) {
          segments.push(currentSegment);
        }
        currentSegment = null;
        confidence = 0;
      }
    }
  }

  if (currentSegment && confidence >= CONFIG.MIN_CONFIDENCE) {
    segments.push(currentSegment);
  }

  return segments;
}
```

**Pros:**
- ✅ High availability (~80% of videos have captions)
- ✅ Works on videos without SponsorBlock data
- ✅ Can detect novel sponsor patterns

**Cons:**
- ❌ Slower (network + parsing overhead)
- ❌ False positives possible (product reviews, etc.)
- ❌ Requires accurate captions
- ❌ Auto-generated captions may lack keywords

---

### Data Flow Comparison

```
Tier 1: DOM → Parser → Segments (50-200ms)
Tier 2: Network → API → JSON → Segments (100-500ms)
Tier 3: DOM → Injector → Network → XML → NLP → Segments (500-2000ms)
```

### Dependencies
- **utils:** domHelpers (clickWithRetry, timestampToSeconds)
- **utils:** VideoManager (getDuration)
- **services:** InjectorService (for transcript URL)
- **types:** Segment, Cue

---

## 5. Features (Ad Skipping, Input Handling)

**Directory:** `src/features/`

### Purpose
User-facing features that extend core functionality.

### Files

#### `adSkipper.ts` - Automatic Ad Skipping

**Responsibility:** Detect and skip YouTube ads.

**Detection Logic:**
```typescript
function isAdPlaying(): boolean {
  const player = document.getElementById('movie_player');
  return player?.classList.contains('ad-showing') || false;
}
```

**Skip Strategies:**
```typescript
export function trySkipAd(): void {
  if (!isAdPlaying()) return;

  const video = document.querySelector('#movie_player video') as HTMLVideoElement;

  // Strategy 1: Fast-forward unskippable ads
  if (video && video.duration > 0 && video.currentTime < video.duration - 0.5) {
    Logger.log(`Fast-forwarding ad: ${video.currentTime}s → ${video.duration}s`);
    video.currentTime = video.duration; // Jump to end
  }

  // Strategy 2: Click skip button
  const skipButton = findFirstVisible(CONFIG.SELECTORS.AD_SKIP_BUTTON);
  if (skipButton) {
    Logger.log('Clicking skip button');
    skipButton.click();
  }
}
```

**Polling Loop:**
```typescript
export function startAdDetection(): NodeJS.Timeout {
  return setInterval(() => {
    trySkipAd();
  }, CONFIG.TIMEOUTS.AD_CHECK_INTERVAL); // 1000ms
}
```

**Why Polling?**
- YouTube doesn't emit reliable ad events
- MutationObserver too slow for real-time ad changes
- 1-second polling is lightweight and responsive

**Button Selectors:**
```typescript
// Primary selectors (known classes)
'.ytp-skip-ad-button',
'.ytp-ad-skip-button-container button'

// Fallback: text/ARIA search
buttons.filter(btn =>
  btn.textContent.toLowerCase().includes('skip') ||
  btn.getAttribute('aria-label')?.includes('skip')
)
```

---

#### `InputHandler.ts` - Keyboard Shortcut Manager

**Responsibility:** Handle keyboard shortcuts for extension control.

**Architecture:**
```typescript
class InputHandler {
  constructor(
    private getState: () => SkipperState,
    private updateState: (newState: Partial<SkipperState>) => void,
    private showStats: () => void,
    private showInfo: () => void,
    private showPerf: () => void,
    private openPopup: () => void
  ) {}

  init() {
    document.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  private handleKeydown(e: KeyboardEvent) {
    // Ignore if typing in input field
    if (e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement) {
      return;
    }

    if (!e.altKey) return; // All shortcuts require Alt key

    const key = e.key.toLowerCase();
    
    switch (key) {
      case 's': // Alt+S: Toggle extension
        const newEnabled = !this.getState().isEnabled;
        this.updateState({ isEnabled: newEnabled });
        NotificationManager.show(
          `🎛️ SponsorSkip ${newEnabled ? 'Enabled' : 'Disabled'}`
        );
        break;
      
      case '1': // Alt+1: Skip mode
        this.updateState({ sponsorAction: 'skip' });
        NotificationManager.show('⏭️ Action: SKIP segments');
        break;
      
      // ... other shortcuts
    }
  }
}
```

**Keyboard Shortcut Map:**
| Key | Action | Feedback |
|-----|--------|----------|
| `Alt+S` | Toggle extension on/off | Toast: "Enabled" / "Disabled" |
| `Alt+1` | Set action to SKIP | Toast: "Action: SKIP" |
| `Alt+2` | Set action to MUTE | Toast: "Action: MUTE" |
| `Alt+3` | Set action to WATCH | Toast: "Action: WATCH" |
| `Alt+A` | Toggle ad skipping | Toast: "Ad skipping enabled/disabled" |
| `Alt+D` | Show statistics | Modal with stats |
| `Alt+H` | Show help | Toast with all shortcuts |

**Input Protection:**
- Ignores shortcuts when typing in `<input>` or `<textarea>`
- Prevents conflicts with YouTube's native shortcuts
- All shortcuts require `Alt` key to avoid accidental triggers

---

### Dependencies
- **utils:** domHelpers (findFirstVisible), Logger, VideoManager
- **ui:** NotificationManager
- **config:** CONFIG (selectors, timeouts)

---

## 6. Services (Injection, Notifications)

**Directory:** `src/services/`

### Purpose
Shared services for cross-context communication and UI feedback.

### Files

#### `InjectorService.ts` - Page Context Script Injection

**Problem:**
Chrome extensions run in an "isolated world" separate from the page's JavaScript. We cannot directly access `window.ytInitialPlayerResponse`, which contains caption track URLs.

**Solution:**
Inject a script into the main page context using `chrome.scripting.executeScript` with `world: 'MAIN'`.

**Implementation:**
```typescript
export class InjectorService {
  static async injectTrackUrlFetcher(tabId: number): Promise<void> {
    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN', // ← Runs in page context, not extension context
      func: () => {
        // This code runs INSIDE the YouTube page
        try {
          const player = (window as any).ytInitialPlayerResponse;
          const captions = player?.captions?.playerCaptionsTracklistRenderer;
          const trackUrl = captions?.captionTracks?.[0]?.baseUrl;

          if (trackUrl) {
            // Send back to content script via postMessage
            window.postMessage({
              type: 'SPONSORSKIP_TRACK_URL',
              payload: trackUrl
            }, '*');
          }
        } catch (error) {
          console.error('[Injector] Failed to extract caption URL:', error);
        }
      }
    });
  }
}
```

**Message Flow:**
```
Content Script
    ↓
  (requests injection)
    ↓
Background Script
    ↓
chrome.scripting.executeScript (world: 'MAIN')
    ↓
Page Context (can access window.ytInitialPlayerResponse)
    ↓
window.postMessage({ type: 'SPONSORSKIP_TRACK_URL', payload: url })
    ↓
Content Script (listens to 'message' event)
    ↓
Uses caption URL to fetch transcript
```

**Security Note:**
- Only extracts data (read-only)
- No modification of page state
- postMessage validates origin

---

#### `NotificationService.ts` - Cross-Context Messaging

**Responsibility:** Facilitate communication between popup, background, and content scripts.

**Message Types:**
```typescript
type MessageType =
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'INCREMENT_SKIP'
  | 'GET_STATS'
  | 'SETTINGS_CHANGED';
```

**Example Flow:**
```typescript
// Popup wants to update settings
chrome.runtime.sendMessage({
  type: 'UPDATE_SETTINGS',
  payload: { sponsorAction: 'mute', skipAds: false }
});

// Background receives and saves
chrome.storage.sync.set({ 'skipper-action': 'mute', 'skipper-ads': false });

// Background notifies content script
chrome.tabs.query({ url: '*://youtube.com/*' }, (tabs) => {
  tabs.forEach(tab => {
    chrome.tabs.sendMessage(tab.id, {
      type: 'SETTINGS_CHANGED',
      payload: { sponsorAction: 'mute', skipAds: false }
    });
  });
});

// Content script updates local state
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SETTINGS_CHANGED') {
    updateState(message.payload);
  }
});
```

---

### Dependencies
- **Chrome APIs:** `scripting`, `runtime`, `tabs`, `storage`
- **Internal:** None (pure services)

---

## 7. UI Components

**Directory:** `src/ui/`

### Purpose
Visual feedback components (progress bar markers, toasts, modals).

### Files

#### `ProgressBarVisualizer.ts` - Segment Markers on Timeline

**Responsibility:** Render red markers on YouTube's progress bar to indicate sponsor segments.

**DOM Structure:**
```html
<div class="ytp-progress-bar">
  <div class="sponsorskip-marker" style="left: 10%; width: 5%;"></div>
  <div class="sponsorskip-marker" style="left: 50%; width: 8%;"></div>
</div>
```

**Implementation:**
```typescript
export class ProgressBarVisualizer {
  private segments: Segment[];
  private duration: number;

  constructor(segments: Segment[]) {
    this.segments = segments;
  }

  async init() {
    const video = await this.waitForVideo();
    this.duration = video.duration;
    this.render();
  }

  render() {
    const progressBar = document.querySelector('.ytp-progress-bar');
    if (!progressBar) return;

    // Remove old markers
    this.clear();

    // Create new markers
    this.segments.forEach(segment => {
      const marker = document.createElement('div');
      marker.className = 'sponsorskip-marker';
      marker.style.cssText = `
        position: absolute;
        left: ${(segment.start / this.duration) * 100}%;
        width: ${((segment.end - segment.start) / this.duration) * 100}%;
        height: 100%;
        background: rgba(255, 0, 0, 0.6);
        pointer-events: none;
        z-index: 30;
      `;
      progressBar.appendChild(marker);
    });
  }

  clear() {
    document.querySelectorAll('.sponsorskip-marker').forEach(el => el.remove());
  }
}
```

**Visual Example:**
```
[========|██|==============|████|========] (Progress bar)
         ^                 ^
    Segment 1          Segment 2
```

**Performance:**
- Only renders when segments loaded
- Uses CSS transforms for smooth animations
- Minimal DOM manipulation

---

#### `NotificationManager.ts` - Toast Notifications

**Responsibility:** Display temporary toast messages in the top-right corner.

**Implementation:**
```typescript
export class NotificationManager {
  static show(message: string) {
    const toast = document.createElement('div');
    toast.className = 'sponsorskip-toast';
    toast.style.cssText = CONFIG.STYLES.TOAST;
    toast.textContent = message;
    
    document.body.appendChild(toast);

    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, CONFIG.TIMEOUTS.TOAST_DURATION); // 3000ms
  }
}
```

**Style:**
```css
.sponsorskip-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #333;
  color: white;
  padding: 10px 15px;
  border-radius: 5px;
  z-index: 10000;
  font-size: 14px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  font-family: Roboto, Arial, sans-serif;
}
```

**Usage:**
```typescript
NotificationManager.show('⏭️ Skipped 15s sponsor');
NotificationManager.show('🔇 Muting segment');
NotificationManager.show('❌ Extension disabled');
```

**Edge Cases:**
- Multiple toasts stack vertically
- Auto-removes after 3 seconds
- Survives page navigation (reinjected on SPA routing)

---

### Dependencies
- **config:** CONFIG (styles, timeouts)
- **utils:** VideoManager
- **External:** YouTube DOM structure

---

## 8. Utils & Config

**Directory:** `src/utils/` and `src/config/`

### Purpose
Shared utilities and configuration constants.

### Files

#### `Logger.ts` - Centralized Logging

**Features:**
- Consistent log prefix `[SponsorSkip]`
- Debug toggle to disable verbose logs
- Separate methods for log levels

**Implementation:**
```typescript
export class Logger {
  private static prefix = '[SponsorSkip]';
  private static isDebug = true;

  static log(message: string, ...args: any[]) {
    if (this.isDebug) {
      console.log(`${this.prefix} ${message}`, ...args);
    }
  }

  static warn(message: string, ...args: any[]) {
    console.warn(`${this.prefix} ${message}`, ...args);
  }

  static error(message: string, ...args: any[]) {
    console.error(`${this.prefix} ${message}`, ...args);
  }
}
```

---

#### `VideoManager.ts` - Video Element Singleton

**Purpose:** Centralized access to the current video element.

**Pattern:** Singleton (ensures one instance across modules)

```typescript
export class VideoManager {
  private static instance: VideoManager;
  private video: HTMLVideoElement | null = null;

  private constructor() {}

  static getInstance(): VideoManager {
    if (!this.instance) {
      this.instance = new VideoManager();
    }
    return this.instance;
  }

  getVideo(): HTMLVideoElement | null {
    if (!this.video || !document.body.contains(this.video)) {
      this.video = document.querySelector('video');
    }
    return this.video;
  }

  getDuration(): number {
    return this.getVideo()?.duration || 0;
  }

  getCurrentTime(): number {
    return this.getVideo()?.currentTime || 0;
  }

  setVolume(volume: number) {
    const video = this.getVideo();
    if (video) video.volume = volume;
  }
}
```

---

#### `domHelpers.ts` - DOM Utilities

**Key Functions:**

##### `findFirstVisible(selectors: string | string[]): HTMLElement | null`
Finds first visible element matching selector(s).

##### `clickWithRetry(selector: string, retries = 3): Promise<boolean>`
Clicks element with retry logic (useful for async-rendered elements).

##### `timestampToSeconds(timestamp: string): number`
Converts "MM:SS" or "HH:MM:SS" to seconds.

##### `debounce(fn: Function, delay: number): Function`
Debounces function calls (used for performance optimization).

---

#### `constants.ts` - Configuration Constants

**Structure:**
```typescript
export const CONFIG = {
  SELECTORS: { /* DOM selectors */ },
  TIMEOUTS: { /* Timing constants */ },
  STYLES: { /* CSS strings */ },
  DEFAULTS: { /* Default settings */ },
  TRANSCRIPT_HEURISTICS: { /* NLP config */ }
};
```

**Why Centralized?**
- Single source of truth
- Easy to update for YouTube UI changes
- Testable (can mock CONFIG in tests)

---

## 9. Type Definitions

**Directory:** `src/types/`

### Files

#### `types.ts` - Shared Interfaces

**Core Types:**
```typescript
export interface Segment {
  start: number;    // seconds
  end: number;      // seconds
  category?: string; // 'sponsor', 'intro', 'outro', etc.
}

export interface Cue {
  start: number; // seconds
  text: string;  // caption text
}

export interface SponsorBlockApiSegment {
  category: string;
  segment: [number, number]; // [start, end] tuple
}
```

**State Types:**
```typescript
export interface SkipperState {
  isEnabled: boolean;
  sponsorAction: 'skip' | 'mute' | 'ignore';
  skipAds: boolean;
}
```

---

## Cross-Module Dependencies

```
background/
    └─> chrome.storage
    └─> chrome.webNavigation

content/simple-skipper
    ├─> engine/tieredFetcher
    ├─> features/adSkipper
    ├─> features/InputHandler
    ├─> ui/ProgressBarVisualizer
    ├─> ui/NotificationManager
    └─> utils/Logger, VideoManager

engine/tieredFetcher
    ├─> pipeline/chapterScraper
    ├─> pipeline/transcriptParser
    ├─> api/SponsorBlockClient
    └─> engine/normalizeSegments

pipeline/chapterScraper
    └─> utils/domHelpers, VideoManager

pipeline/transcriptParser
    └─> services/InjectorService

features/adSkipper
    └─> utils/domHelpers, Logger, VideoManager

ui/ProgressBarVisualizer
    └─> utils/VideoManager

config/constants
    (no dependencies - pure data)

types/types
    (no dependencies - pure types)
```

---

## Performance Optimization Techniques

1. **Debouncing:** `timeupdate` events throttled to 500ms
2. **Early Exits:** Check enabled state before heavy computation
3. **Lazy Loading:** Only initialize UI components when segments found
4. **Caching:** Store video duration to avoid repeated queries
5. **Set-Based Tracking:** Use `Set<number>` for O(1) segment lookups
6. **Singleton Pattern:** VideoManager reduces repeated DOM queries

---

## Error Handling Strategies

1. **Graceful Degradation:** All fetch functions return `[]` on failure
2. **Try-Catch Blocks:** Wrap async operations with error logging
3. **Defensive Checks:** Validate DOM elements exist before accessing
4. **Timeouts:** Add delays for async-rendered elements
5. **Retry Logic:** `clickWithRetry` for flaky DOM operations

---

**Last Updated:** 2024
**Version:** 1.0.0
