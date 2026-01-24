# Code Mastery: YouTube Auto Skipper

> **Objective:** This document is designed to take a new developer from "zero" to "master" of the codebase. It covers architecture, file structure, critical logic, and data flow.

---

## 1. High-Level Architecture

The extension follows a **Layered Event-Driven Architecture**. It operates within the browser's isolated environments but coordinates via message passing.

```mermaid
graph TD
    subgraph "YouTube Page (Content Script)"
        UI[UI Layer] -->|User Input| Input[Input Handler]
        Input -->|State Update| State[Local State]
        State -->|Config| Engine[Detection Engine]
        Engine -->|Segments| Visualizer[Progress Bar Visualizer]
        DOM[YouTube DOM] -->|Time Update| Engine
    end

    subgraph "Background Service Worker"
        BG[Background Script] -->|Storage API| ChromeStore[(Chrome Storage)]
        BG -->|WebNav API| Nav[Navigation Listener]
    end

    subgraph "External World"
        SB[SponsorBlock API]
        YT[YouTube Servers]
    end

    Engine -->|Fetch| SB
    Nav -->|Inject| UI
    UI <-->|Messages| BG
```

### Data Flow
1.  **Initialization:** When a video loads, the `ContentScript` initializes. It fetches settings from `Chrome Storage` via the `Background Script`.
2.  **Detection:** The `TieredFetcher` engine runs 3 strategies in parallel/sequence to find skip segments.
3.  **Execution:** The `ContentScript` listens to the video's `timeupdate` event. If the current time matches a segment, it triggers an action (Skip/Mute).
4.  **Feedback:** The `NotificationManager` shows a toast, and stats are sent to the `Background Script` for persistence.

---

## 2. Directory Map

```text
src/
├── background/          # Service Worker (runs in background)
│   └── index.ts         # Entry point: handles navigation & messaging
├── config/              # Configuration & Constants
│   └── constants.ts     # Centralized selectors, timeouts, styles
├── content/             # Content Scripts (runs on YouTube page)
│   └── simple-skipper.ts # MAIN ORCHESTRATOR: The "Brain" of the frontend
├── engine/              # Core Logic
│   ├── tieredFetcher.ts # Logic to decide WHICH source to trust
│   └── normalizeSegments.ts # Standardizes data from different sources
├── features/            # Feature Modules
│   ├── adSkipper.ts     # Logic to click "Skip Ad" buttons
│   └── InputHandler.ts  # Keyboard shortcut logic
├── pipeline/            # Data Fetching Strategies
│   ├── chapterScraper.ts # Tier 1: Scrapes description
│   └── transcriptParser.ts # Tier 3: Analyzes captions
├── services/            # Shared Services
│   └── InjectorService.ts # Injects scripts into page context
├── types/               # TypeScript Definitions
│   └── types.ts         # Shared interfaces (Segment, Cue)
├── ui/                  # User Interface
│   ├── NotificationManager.ts # Toast notifications
│   └── ProgressBarVisualizer.ts # Red markers on the timeline
└── utils/               # Utilities
    └── Logger.ts        # Centralized logging
```

---

## 3. Key File Breakdown

### `src/content/simple-skipper.ts`
**Responsibility:** The main entry point for the content script. It ties everything together.
**Connections:** Imports `TieredFetcher` to get data, `InputHandler` for controls, and `NotificationManager` for UI.
**Why it matters:** If the extension isn't working, start debugging here. It sets up the `MutationObserver` to detect video changes (SPA navigation).

### `src/engine/tieredFetcher.ts`
**Responsibility:** Decides *how* to find sponsor segments.
**Logic:**
1.  **Tier 1 (Fastest):** Checks video description for "Sponsor" chapters.
2.  **Tier 2 (Best Coverage):** Calls SponsorBlock API.
3.  **Tier 3 (Fallback):** Downloads transcript and looks for keywords.
**Why it matters:** This ensures we almost always find segments without relying on a single source.

### `src/config/constants.ts`
**Responsibility:** Holds all "magic values".
**Why it matters:** Never hardcode a CSS selector or timeout again. Change it here, and it updates everywhere.

---

## 4. Function Logic Deep Dive

### Critical Function 1: `checkForSkip(video)`
**Location:** `src/content/simple-skipper.ts`
**Purpose:** The "heartbeat" of the extension. Runs every ~500ms to decide if we should skip.

```typescript
function checkForSkip(video: HTMLVideoElement) {
  // 1. Defensive Checks: If disabled or no segments, exit immediately.
  if (!state.isEnabled || !currentSegments.length) return;

  const currentTime = video.currentTime;

  // 2. Iterate through all known segments
  for (let i = 0; i < currentSegments.length; i++) {
    const segment = currentSegments[i];

    // 3. Range Check: Is the user currently INSIDE a segment?
    if (currentTime >= segment.start && currentTime < segment.end) {
      
      // 4. Cooldown Check: Did we just skip this? (Prevents loops)
      const lastSkipTime = lastSkipTimes.get(i) || 0;
      const now = Date.now();
      // We can skip if we haven't skipped this specific segment in the last 3 seconds
      const canSkip = !skippedSegments.has(i) || now - lastSkipTime > 3000;

      if (canSkip) {
        // 5. EXECUTE: Perform the skip/mute action
        executeSkipAction(video, segment, i);
        break; // Exit loop, we handled the event
      }
    }
  }
}
```

### Critical Function 2: `getSegmentsByPriority(videoId)`
**Location:** `src/engine/tieredFetcher.ts`
**Purpose:** The strategy pattern implementation for finding data.

```typescript
export async function getSegmentsByPriority(videoId: string): Promise<Segment[]> {
  try {
    // 1. Try Tier 1 (Local Data) - Fastest, 0 network cost
    const chapters = await scrapeChapterSegments();
    if (chapters.length) return normalizeSegments(chapters);

    // 2. Try Tier 2 (Crowdsourced API) - High accuracy
    const sb = await fetchSponsorBlockSegments(videoId);
    if (sb.length) return normalizeSegments(sb);

    // 3. Try Tier 3 (Heuristics) - Fallback, can be messy
    const transcript = await parseTranscriptSegments();
    return normalizeSegments(transcript);
  } catch (error) {
    // 4. Fail Gracefully: Return empty array so video still plays
    return [];
  }
}
```

### Critical Function 3: `InjectorService.injectTrackUrlFetcher(tabId)`
**Location:** `src/services/InjectorService.ts`
**Purpose:** Breaks out of the "Isolated World" to access the page's global variables.

```typescript
static injectTrackUrlFetcher(tabId: number) {
  return chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN', // <--- CRITICAL: Runs in the PAGE context, not extension context
    func: () => {
      // This code runs inside the actual YouTube page
      // It can access 'window.ytInitialPlayerResponse' which is normally hidden from extensions
      const resp = window.ytInitialPlayerResponse;
      // ... logic to find caption URL ...
      
      // Send data back to the extension via window messaging
      window.postMessage({ type: 'SPONSORSKIP_TRACK_URL', payload: url }, '*');
    },
  });
}
```

---

## 5. "The Glue": Communication

The extension has 3 distinct parts that need to talk to each other:

1.  **Popup (UI) <-> Background:**
    *   **Method:** `chrome.runtime.sendMessage`
    *   **Use Case:** User changes settings in the popup. The popup sends `SETTINGS_UPDATED` to the background (or directly to content script if active).

2.  **Content Script <-> Background:**
    *   **Method:** `chrome.runtime.sendMessage`
    *   **Use Case:** Content script reports "I skipped a segment" (`INCREMENT_SKIP`). Background script saves this to `chrome.storage`.

3.  **Content Script <-> Page (DOM):**
    *   **Method:** `window.postMessage`
    *   **Use Case:** The `InjectorService` (in Page Context) finds the transcript URL and posts it. The Content Script listens for `message` events to receive it.

### Message Passing Flow Diagram

```mermaid
sequenceDiagram
    participant User
    participant Popup
    participant Background
    participant Content
    participant YouTube

    User->>Popup: Click "Mute Mode"
    Popup->>Background: sendMessage(SETTINGS_UPDATED)
    Background->>Chrome Storage: Save settings
    Background->>Content: sendMessage(SETTINGS_CHANGED)
    Content->>Content: Update local state
    Content->>YouTube: Apply mute action
    YouTube-->>User: Muted segment playback
```

### Example: Changing a Setting
1.  User clicks "Mute Mode" in Popup.
2.  Popup sends `{ type: 'SETTINGS_UPDATED', settings: { sponsorAction: 'mute' } }`.
3.  Content Script receives message -> Updates local `state` variable.
4.  Next `timeupdate` loop uses the new `mute` logic.

---

## 6. Architecture Diagrams

### Data Flow for Segment Detection

```
┌─────────────────────────────────────────────────────────────┐
│                      YouTube Page Loads                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Content Script Initialization                   │
│  • MutationObserver detects video element                   │
│  • Extract video ID from URL                                │
│  • Load settings from chrome.storage                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              getSegmentsByPriority(videoId)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   TIER 1    │  │   TIER 2    │  │   TIER 3    │
│  Chapters   │  │ SponsorBlock│  │ Transcript  │
│   (50ms)    │  │   (200ms)   │  │  (1000ms)   │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       │ if empty       │ if empty       │
       └────────────────┴────────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │  normalizeSegments()  │
            │  • Sort by start      │
            │  • Merge overlaps     │
            │  • Add padding        │
            └───────────┬───────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │  Initialize UI        │
            │  • Progress markers   │
            │  • Event listeners    │
            └───────────┬───────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │   Monitor Playback    │
            │  video.timeupdate     │
            └───────────┬───────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │  Inside segment?      │
            └───────────┬───────────┘
                        │
                 ┌──────┴──────┐
                 ▼             ▼
            ┌────────┐    ┌────────┐
            │  Skip  │    │  Mute  │
            └────────┘    └────────┘
```

### Segment Detection Sequence Diagram

```mermaid
sequenceDiagram
    participant Video as Video Element
    participant Content as Content Script
    participant Tier1 as Chapter Scraper
    participant Tier2 as SponsorBlock API
    participant Tier3 as Transcript Parser
    participant UI as Progress Bar

    Video->>Content: New video detected
    Content->>Content: Extract video ID
    
    Content->>Tier1: scrapeChapterSegments()
    Tier1->>Tier1: Click "Show more"
    Tier1->>Tier1: Parse description
    Tier1-->>Content: segments[] or []
    
    alt Tier 1 found segments
        Content->>UI: Render markers
    else Tier 1 empty
        Content->>Tier2: fetchSponsorBlockSegments(videoId)
        Tier2->>Tier2: HTTP GET to API
        Tier2-->>Content: segments[] or []
        
        alt Tier 2 found segments
            Content->>UI: Render markers
        else Tier 2 empty
            Content->>Tier3: parseTranscriptSegments()
            Tier3->>Tier3: Inject script
            Tier3->>Tier3: Fetch captions
            Tier3->>Tier3: Analyze keywords
            Tier3-->>Content: segments[] or []
            Content->>UI: Render markers (if any)
        end
    end
    
    Content->>Video: Add timeupdate listener
```

### Content Script Initialization Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Page Load / SPA Navigation                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
                 ┌───────────────┐
                 │ MutationObserver │
                 │  watching DOM   │
                 └───────┬─────────┘
                         │
                         ▼
                 ┌───────────────┐
                 │ Video Element │
                 │   Detected    │
                 └───────┬───────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌────────────────┐ ┌──────────────┐ ┌─────────────┐
│ Load Settings  │ │ Initialize   │ │ Setup Video │
│ from Storage   │ │ InputHandler │ │  Listeners  │
└────────┬───────┘ └──────┬───────┘ └──────┬──────┘
         │                │                │
         └────────────────┴────────────────┘
                         │
                         ▼
                 ┌───────────────┐
                 │ loadSegments()│
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │ Render UI     │
                 │ • Markers     │
                 │ • Toasts      │
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │ Start Monitoring│
                 │ • timeupdate  │
                 │ • Ad detection│
                 └───────────────┘
```

### State Machine Diagram

```
                    ┌─────────────┐
                    │  DISABLED   │◄─────────┐
                    └──────┬──────┘          │
                           │                 │
                      Alt+S pressed          │
                           │                 │
                           ▼                 │
                    ┌─────────────┐          │
              ┌────►│   ENABLED   │          │
              │     └──────┬──────┘          │
              │            │                 │
              │     Video detected           │
              │            │                 │
              │            ▼                 │
              │     ┌─────────────┐          │
              │     │  DETECTING  │          │
              │     └──────┬──────┘          │
              │            │                 │
              │    Segments found            │
              │            │                 │
              │            ▼                 │
              │     ┌─────────────┐    Alt+S pressed
              └─────┤ MONITORING  ├──────────┘
                    └──────┬──────┘
                           │
                    Inside segment?
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌─────────┐  ┌─────────┐  ┌─────────┐
        │ SKIP    │  │ MUTE    │  │ NOTIFY  │
        │ (Alt+1) │  │ (Alt+2) │  │ (Alt+3) │
        └─────────┘  └─────────┘  └─────────┘
              │            │            │
              └────────────┴────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ MONITORING  │ ◄─ (loop back)
                    └─────────────┘
```

### Component Dependency Graph

```
┌──────────────────────────────────────────────────────────────┐
│                        Extension                              │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐          ┌──────────────┐                  │
│  │  Background │◄────────►│   Popup      │                  │
│  │   Service   │          │   (UI)       │                  │
│  │   Worker    │          └──────────────┘                  │
│  └──────┬──────┘                                            │
│         │                                                    │
│         │ manages                                            │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────┐                                            │
│  │  Chrome     │                                            │
│  │  Storage    │                                            │
│  └─────────────┘                                            │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Content Script                           │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │                                                        │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │           Main Orchestrator                    │  │   │
│  │  │        (simple-skipper.ts)                     │  │   │
│  │  └─────┬───────────────────────────────────┬──────┘  │   │
│  │        │                                    │         │   │
│  │        ▼                                    ▼         │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │   │
│  │  │  Engine  │  │ Features │  │    UI    │          │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘          │   │
│  │       │             │              │                 │   │
│  │       ├─────────────┴──────────────┘                │   │
│  │       │                                              │   │
│  │       ▼                                              │   │
│  │  ┌──────────┐                                       │   │
│  │  │  Utils   │                                       │   │
│  │  └──────────┘                                       │   │
│  │                                                        │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
└──────────────────────────────────────────────────────────────┘

Legend:
  → depends on
  ◄──► bidirectional communication
```

### Timeline: Component Activation

```
Time (ms)
  0    │ ┌──────────────────────────────────────┐
       │ │     Background Service Worker        │
       │ │     (Always listening for events)    │
       │ └──────────────────────────────────────┘
       │
  50   │ ┌──────────────────────────────────────┐
       │ │     Content Script Injected          │
       │ └──────────────────────────────────────┘
       │
 100   │ ┌──────────────────────────────────────┐
       │ │     Video Element Detected           │
       │ │     (MutationObserver)               │
       │ └──────────────────────────────────────┘
       │
 150   │ ┌──────────────────────────────────────┐
       │ │     InputHandler Initialized         │
       │ │     (Keyboard shortcuts active)      │
       │ └──────────────────────────────────────┘
       │
 200   │ ┌──────────────────────────────────────┐
       │ │     Segment Detection Started        │
       │ │     (Tier 1: Chapter scraping)       │
       │ └──────────────────────────────────────┘
       │
 250   │ ┌──────────────────────────────────────┐
       │ │     Tier 1 Complete (if found)       │
       │ └──────────────────────────────────────┘
       │
 400   │ ┌──────────────────────────────────────┐
       │ │     Tier 2: SponsorBlock API Call    │
       │ │     (if Tier 1 empty)                │
       │ └──────────────────────────────────────┘
       │
 600   │ ┌──────────────────────────────────────┐
       │ │     Progress Bar Visualizer          │
       │ │     (Red markers rendered)           │
       │ └──────────────────────────────────────┘
       │
 800   │ ┌──────────────────────────────────────┐
       │ │     timeupdate Listener Active       │
       │ │     (Monitoring playback)            │
       │ └──────────────────────────────────────┘
       │
1200   │ ┌──────────────────────────────────────┐
       │ │     Tier 3: Transcript Analysis      │
       │ │     (if Tier 2 empty)                │
       │ └──────────────────────────────────────┘
       │
Ongoing│ ┌──────────────────────────────────────┐
       │ │     Ad Detection Loop                │
       │ │     (Every 1s if enabled)            │
       │ └──────────────────────────────────────┘
```
