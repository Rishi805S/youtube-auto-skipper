# YouTube Auto Skipper - Professional Project Documentation
## IEEE Standard Technical Documentation

**Document Version:** 1.0  
**Date:** January 2025  
**Author:** Rishi  
**Project Duration:** 3-4 weeks (Started January 4, 2025)  
**Project Type:** Individual Development  
**Status:** MVP Complete

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2025 | Rishi | Initial comprehensive documentation |

---

## Table of Contents

1. [Project Overview](#a-project-overview)
2. [Key Features](#b-key-features)
3. [System Architecture](#c-system-architecture)
4. [Requirements](#d-requirements)
5. [Database Design](#e-database-design)
6. [API Design](#f-api-design)
7. [System Workflows](#g-system-workflows)
8. [UI/UX Documentation](#h-uiux-documentation)
9. [Project Implementation Details](#i-project-implementation-details)
10. [Testing Documentation](#j-testing-documentation)
11. [Deployment Documentation](#k-deployment-documentation)
12. [Security Considerations](#l-security-considerations)
13. [Challenges Faced](#m-challenges-faced)
14. [Future Enhancements](#n-future-enhancements)
15. [Interview Preparation](#interview-preparation-section)

---

# A. PROJECT OVERVIEW

## A.1 Project Name
**YouTube Auto Skipper** (Internal identifier: SponsorSkip)

## A.2 Problem Statement

### Current Scenario
YouTube viewers face significant challenges with in-video sponsored content:

1. **Manual Intervention Required** - Users must manually identify and skip sponsored segments by scrubbing through the video timeline
2. **Time Wastage** - Average users spend 15-30 seconds per video identifying and skipping sponsored content
3. **Inconsistent Marking** - Not all content creators clearly mark sponsored segments in descriptions or chapters
4. **User Experience Disruption** - Sponsored segments interrupt content flow and reduce viewing satisfaction
5. **Lack of Automation** - Existing solutions (SponsorBlock) require manual community contributions with limited coverage

### Market Gap
There is no fully automated, client-side solution that combines multiple detection methods (chapters, API, and transcript analysis) to provide comprehensive sponsor segment detection without requiring backend infrastructure.

## A.3 Purpose of the Project

The YouTube Auto Skipper extension serves to:

1. **Automate Sponsor Detection** - Eliminate manual effort in identifying sponsored segments
2. **Enhance User Experience** - Provide uninterrupted video consumption
3. **Save User Time** - Automatically skip or mute unwanted content
4. **Provide Visual Feedback** - Display segment markers on the progress bar for user awareness
5. **Maintain User Control** - Allow users to enable/disable functionality per preference

## A.4 Why This Project is Needed

### Business Justification

**For End Users:**
- **Time Efficiency**: Users save 15-30 seconds per video (estimated 10+ minutes daily for frequent viewers)
- **Enhanced Experience**: Seamless content consumption without interruptions
- **Control**: User maintains full control over skip behavior

**For the Ecosystem:**
- **First-to-Market**: First solution combining three detection tiers
- **Privacy-Focused**: Client-side processing, no user data collection
- **Extensible**: Foundation for future community-driven features

### Technical Justification
- Demonstrates advanced browser extension development capabilities
- Showcases DOM manipulation in dynamic SPA environments
- Implements sophisticated multi-tier fallback algorithms
- Handles complex race conditions and isolated worlds architecture

## A.5 Target Users

### Primary User Persona
**Name:** Tech-Savvy YouTube Consumer  
**Age:** 18-45  
**Characteristics:**
- Watches 1-3 hours of YouTube content daily
- Values time efficiency
- Tech-comfortable (can install browser extensions)
- Prefers ad-free, uninterrupted content

**Domains:**
- **Education**: Students watching tutorial videos, online courses
- **Entertainment**: Content consumers watching reviews, vlogs, gaming
- **Productivity**: Professionals watching tech talks, documentaries

### Secondary User Persona
**Name:** Content Creator / Power User  
**Characteristics:**
- Creates or analyzes YouTube content
- Needs to review videos without sponsored interruptions
- Early adopter of productivity tools

---

# B. KEY FEATURES

## B.1 Core Features (MVP)

### B.1.1 Three-Tiered Sponsor Segment Detection

**Feature Description:**  
Automated detection of sponsored content using a hierarchical, fallback-based approach.

**Implementation:**

**Tier 1: Description Chapter Scraping**
- Parses video description for timestamp-based chapters
- Identifies chapters labeled with sponsor-related keywords
- **Advantages:**
  - Fastest detection method
  - Uses creator-provided data
  - Zero network requests
- **Limitations:**
  - Depends on creator marking sponsors
  - Coverage ~20-30% of videos

**Tier 2: SponsorBlock API Integration**
- Queries community-driven SponsorBlock database
- Retrieves crowd-sourced segment timestamps
- **Advantages:**
  - High accuracy (community verified)
  - Large database coverage
  - Coverage ~60-70% of popular videos
- **Limitations:**
  - Requires network request
  - Depends on community contributions

**Tier 3: Transcript Heuristic Analysis** 
- Downloads video transcript from YouTube
- Applies NLP heuristics to detect sponsor mentions
- **Advantages:**
  - Works on any video with transcripts
  - Fallback when other methods fail
  - Coverage ~90%+ of videos
- **Limitations:**
  - May have false positives
  - Requires transcript availability

**Fallback Logic:**
```
Try Tier 1 (Chapters)
  ├─ Success → Return segments
  └─ Fail → Try Tier 2 (API)
       ├─ Success → Return segments
       └─ Fail → Try Tier 3 (Transcript)
            └─ Return segments (or empty array)
```

### B.1.2 Automatic Sponsored Segment Skipping

**Feature Description:**  
Real-time playback manipulation to skip detected segments.

**Skip Actions:**
1. **Skip Mode** (Default)
   - Jumps video timeline to segment end
   - Updates statistics (time saved, skip count)
   - Shows notification to user

2. **Mute Mode**
   - Mutes audio during segment
   - Visual indicator of muted state
   - Auto-unmutes after segment

3. **Notify Only**
   - Displays notification without action
   - Allows manual skipping

**Technical Implementation:**
- Uses `video.timeupdate` event listener
- Checks current time against segment boundaries
- Sub-100ms latency for skip execution

### B.1.3 YouTube Ad Auto-Skip

**Feature Description:**  
Automatically clicks "Skip Ad" button and advances through unskippable ads.

**Components:**
1. **Skip Button Detection**
   - Monitors DOM for `.ytp-ad-skip-button` element
   - Uses `requestAnimationFrame` loop for 60fps detection
   - Simulates user click when button appears

2. **Unskippable Ad Acceleration**
   - Detects ad playing state
   - Advances video timeline during ads
   - Restores normal playback after ad

**Performance:**
- <50ms detection latency
- Works on pre-roll, mid-roll, and outro ads

### B.1.4 Progress Bar Visualization

**Feature Description:**  
Visual overlay on YouTube progress bar showing segment locations.

**Visual Design:**
- Red semi-transparent markers for sponsor segments
- Positioned absolutely over YouTube's native progress bar
- Hover tooltips showing segment time ranges

**Implementation:**
- Calculates segment positions as percentage of video duration
- CSS transforms for smooth rendering
- Updates dynamically when segments change

### B.1.5 User Interface Controls

**Components:**

1. **Toggle Button**
   - Located in YouTube player controls
   - Enables/disables auto-skip functionality
   - Visual state indicator (opacity change)
   - Keyboard accessible (ARIA compliant)

2. **Popup Panel**
   - Extension icon click reveals settings
   - Configure skip action (skip/mute/notify)
   - View statistics (total skips, time saved)
   - Enable/disable individual features

3. **Notifications**
   - Toast-style messages
   - Shows skip confirmations
   - Auto-dismiss after 3 seconds
   - Non-intrusive positioning

### B.1.6 Statistics Tracking

**Metrics Collected:**
- Total number of segments skipped (lifetime)
- Total time saved in seconds (lifetime)
- Per-video skip count (session)

**Storage:**
- Persisted in Chrome Local Storage
- Syncs across popup and content script

### B.1.7 SPA Navigation Handling

**Feature Description:**  
Detects and handles YouTube's Single Page Application navigation.

**Implementation:**
- Listens for yt-navigate-finish events
- MutationObserver for URL changes
- Re-initializes extension on video change
- Prevents duplicate UI injection

**Technical Challenge:**
YouTube doesn't reload the page when navigating between videos, requiring special handling to reset state and reload segments.

## B.2 Additional Features (Planned/Future)

### B.2.1 User-Contributed Segment Timestamps

**Description:**  
Allow users to manually mark and submit sponsor segments for specific videos.

**Workflow:**
1. User watches video and identifies sponsor segment
2. User selects segment start/end times via UI controls OR types timestamps
3. Extension stores segment data with video ID
4. On revisit, extension skips the user-marked segment
5. (Future) Option to share segments with community

**Technical Implementation:**
- Add UI for segment selection (drag on progress bar)
- Manual timestamp input fields (MM:SS format)
- Store in Chrome Storage with video ID as key
- Future: Backend database (Firebase/MongoDB) for cross-device sync

**Data Schema (Proposed):**
`json
{
  "videoId": "dQw4w9WgXcQ",
  "userSegments": [
    {
      "start": 120.5,
      "end": 145.2,
      "category": "sponsor",
      "createdAt": "2025-01-15T10:30:00Z",
      "userId": "local_user_123"
    }
  ]
}
`

### B.2.2 Category-Based Skipping

**Description:**  
Skip other segment categories beyond sponsors.

**Categories:**
- Intro sequences
- Outro/credits
- Self-promotion
- Interaction reminders (like/subscribe)
- Non-music portions (music videos)

**Implementation:**
- SponsorBlock API already returns categories
- Add category filter settings in popup
- Update UI to show different colors per category

### B.2.3 Whitelist/Blacklist Management

**Description:**  
Allow users to never skip certain channels or always skip others.

**Features:**
- Channel whitelist (never skip)
- Channel blacklist (always skip)
- Per-channel settings override

### B.2.4 Keyboard Shortcuts

**Proposed Shortcuts:**
- Ctrl+Shift+S - Toggle skip functionality
- Ctrl+Shift+N - Skip to next segment
- Ctrl+Shift+P - Skip to previous segment

### B.2.5 Cross-Browser Support

**Browsers to Support:**
- Mozilla Firefox (using WebExtensions API)
- Microsoft Edge (Chromium-based, minimal changes needed)
- Safari (requires significant adaptation)

## B.3 Admin Features

Not applicable - This is a client-side extension with no admin interface or backend management.


# C. SYSTEM ARCHITECTURE

## C.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     YouTube Page (SPA)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Video Player + Progress Bar + Controls           │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ DOM Injection
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│          Content Script (simple-skipper.ts)                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  • Video event listeners (timeupdate, play, pause)       │  │
│  │  • SPA navigation detection (MutationObserver)           │  │
│  │  • Skip execution logic (skip/mute/notify)               │  │
│  │  • State management (segments, settings, stats)          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │                 │                 │
         │                 │                │
    ┌────▼────┐      ┌────▼────┐      ┌────▼─────┐
    │  Tiered │      │   UI    │      │ Progress │
    │ Fetcher │      │Injector │      │   Bar    │
    │ Engine  │      │         │      │Visualizer│
    └────┬────┘      └─────────┘      └──────────┘
         │
    ┌────▼──────────────────────────────────┐
    │   Detection Pipeline                  │
    │  ┌──────────────────────────────────┐ │
    │  │ Tier 1: Chapter Scraper          │ │
    │  │  (Parses video description)      │ │
    │  └──────────────────────────────────┘ │
    │  ┌──────────────────────────────────┐ │
    │  │ Tier 2: SponsorBlock API Client  │──┐
    │  │  (External API call)             │  │
    │  └──────────────────────────────────┘  │
    │  ┌──────────────────────────────────┐  │
    │  │ Tier 3: Transcript Parser        │  │
    │  │  (NLP heuristics)                │  │
    │  └──────────────────────────────────┘  │
    └───────────────────────────────────────┘
                     │                        │
                     ▼                        │
         ┌───────────────────────┐            │
         │ Segment Normalizer    │            │
         │ (Merge, sort, dedupe) │            │
         └───────────────────────┘            │
                     │                        │
                     ▼                        │
         ┌───────────────────────┐            │
         │  Segments Array       │            │
         │  [{start, end}, ...]  │            │
         └───────────────────────┘            │
                     │                        │
         ┌───────────▼───────────────┐        │
         │                           │        │
    ┌────▼────┐              ┌──────▼──────┐ │
    │ Content │    Messages  │  Background │ │
    │ Script  │◄────────────►│   Worker    │ │
    └────┬────┘              └──────┬──────┘ │
         │                          │        │
         ▼                          ▼        │
 ┌───────────────┐          ┌──────────────┐│
 │ Video Element │          │Chrome Storage││
 │  (Skip/Mute)  │          │   API        ││
 └───────────────┘          └──────────────┘│
                                    ▲        │
                                    │        │
                            ┌───────┴──────┐ │
                            │ Popup Panel  │ │
                            │  (Settings)  │ │
                            └──────────────┘ │
                                             │
                                             ▼
                              ┌──────────────────────┐
                              │  External Services   │
                              │  • SponsorBlock API  │
                              │    sponsor.ajay.app  │
                              └──────────────────────┘
```

**Architecture Pattern:** Layered Architecture + Event-Driven Architecture

## C.2 Component Diagram

```
┌────────────── PRESENTATION LAYER ──────────────────┐
│                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐│
│  │ Toggle Button│  │Progress Bar  │  │ Popup UI ││
│  │              │  │  Visualizer  │  │          ││
│  └──────────────┘  └──────────────┘  └──────────┘│
│  ┌──────────────────────────────────────────────┐ │
│  │      Notification Service                    │ │
│  └──────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
                      │
┌────────────── BUSINESS LOGIC LAYER ────────────────┐
│                     │                              │
│  ┌──────────────────▼─────────────────┐            │
│  │   Content Script Orchestrator      │            │
│  │  • Initialize                      │            │
│  │  • loadSegments()                  │            │
│  │  • checkForSkip()                  │            │
│  │  • setupVideo EventListeners()     │            │
│  └──────────────────┬─────────────────┘            │
│                     │                              │
│  ┌──────────────────▼─────────────────┐            │
│  │     Tiered Fetcher Engine          │            │
│  │  getSegmentsByPriority()           │            │
│  └──────────────────┬─────────────────┘            │
│                     │                              │
│       ┌─────────────┼─────────────┐                │
│       │             │             │                │
│  ┌────▼────┐   ┌───▼────┐   ┌───▼────┐            │
│  │ Chapter │   │Sponsor │   │Transcript│           │
│  │ Scraper │   │Block   │   │ Parser  │            │
│  │         │   │API     │   │         │            │
│  └─────────┘   └────────┘   └─────────┘            │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │      Segment Normalizer                      │ │
│  │  normalizeSegments()                         │ │
│  └──────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
                      │
┌────────────── SERVICE LAYER ───────────────────────┐
│                     │                              │
│  ┌──────────────────▼─────────────────┐            │
│  │   Background Service Worker        │            │
│  │  • Message handling                │            │
│  │  • Settings synchronization        │            │
│  └────────────────────────────────────┘            │
└────────────────────────────────────────────────────┘
                      │
┌────────────── DATA LAYER ──────────────────────────┐
│                     │                              │
│  ┌──────────────────▼─────────────────┐            │
│  │      Chrome Storage API            │            │
│  │  • chrome.storage.local            │            │
│  │  • Settings persistence            │            │
│  │  • Statistics storage              │            │
│  └────────────────────────────────────┘            │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │      External API                            │ │
│  │  • sponsor.ajay.app (SponsorBlock)           │ │
│  └──────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

## C.3 Technology Stack with Justification

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Core Language** | TypeScript | • Type safety reduces bugs<br>• Better IDE support<br>• Easier refactoring<br>• Industry standard for extensions |
| **Runtime** | Chrome Extension API (Manifest V3) | • Latest standard<br>• Better security model<br>• Service worker architecture |
| **Build Tool** | Rollup | • Optimized for libraries<br>• Tree-shaking for smaller bundles<br>• Fast build times |
| **Module Bundler** | Rollup plugins | • TypeScript compilation<br>• CommonJS/ESM interop<br>• Minification (Terser) |
| **Testing** | Jest + Playwright | • Jest: Unit test standard<br>• Playwright: E2E with real browser |
| **Code Quality** | ESLint + Prettier | • Enforces code standards<br>• Auto-formatting<br>• TypeScript-aware linting |
| **Storage** | Chrome Storage API | • Native to extensions<br>• No external dependencies<br>• Automatic sync capability |
| **External APIs** | SponsorBlock REST API | • Largest community database<br>• Free and open<br>• Well-documented |

## C.4 Data Flow Diagram

```
[User Opens YouTube Video]
         │
         ▼
[Extract Video ID: "dQw4w9WgXcQ"]
         │
         ▼
[Load Settings from Chrome Storage]
         │
         ├──► enabled: true
         ├──► sponsorAction: "skip"
         └──► skipAds: true
         │
         ▼
[Initialize Content Script]
         │
         ├──► Inject UI Components
         ├──► Attach Video Listeners
         └──► Start Ad Detection Loop
         │
         ▼
[Trigger Segment Detection]
         │
         ▼
┌────────────────────────────────┐
│  Tiered Fetcher Algorithm:    │
│                                │
│  Try Tier 1 (Chapters)         │
│    ├─ Success? Return segments │
│    └─ Fail → Try Tier 2        │
│                                │
│  Try Tier 2 (SponsorBlock API) │
│    ├─ HTTP GET Request         │
│    ├─ Parse JSON Response      │
│    ├─ Success? Return segments │
│    └─ Fail → Try Tier 3        │
│                                │
│  Try Tier 3 (Transcript)       │
│    ├─ Open transcript panel    │
│    ├─ Parse text segments      │
│    ├─ Apply NLP heuristics     │
│    └─ Return segments          │
└────────────────────────────────┘
         │
         ▼
[Normalize Segments]
  ├─ Remove duplicates
  ├─ Merge overlapping
  ├─ Sort by start time
  └─ Validate boundaries
         │
         ▼
[Store Segments in Memory]
segments = [
  {start: 45.2, end: 67.8},
  {start: 320.1, end: 345.5}
]
         │
         ▼
[Draw Progress Bar Markers]
         │
         ▼
[Video Plays - timeupdate Event Loop]
         │
         ▼
┌────────────────────────────────┐
│  For each frame:               │
│                                │
│  currentTime = video.currentTime│
│  For each segment:             │
│    If currentTime in segment:  │
│      ├─ Action = "skip"?       │
│      │  └─ video.currentTime   │
│      │     = segment.end       │
│      ├─ Action = "mute"?       │
│      │  └─ video.muted = true  │
│      └─ Show notification      │
│                                │
│  Update statistics             │
│  Save to Chrome Storage        │
└────────────────────────────────┘
         │
         ▼
[User Clicks Popup Icon]
         │
         ▼
[Popup Requests Stats]
  ├─ chrome.runtime.sendMessage
  └─ type: "GET_STATS"
         │
         ▼
[Content Script Responds]
  ├─ totalSkips: 47
  ├─ timeSaved: 1847 seconds
  └─ Return to popup
         │
         ▼
[Display Stats in Popup UI]
```

---

# D. REQUIREMENTS

## D.1 Functional Requirements

### FR-1: Sponsor Segment Detection
**Description:** System must detect sponsored segments using three-tiered approach

**Sub-requirements:**
- FR-1.1: Parse video description chapters for sponsor keywords
- FR-1.2: Query SponsorBlock API for crowd-sourced segments
- FR-1.3: Analyze video transcript using NLP heuristics
- FR-1.4: Implement fallback mechanism (Tier 1 → 2 → 3)

**Priority:** HIGH  
**

## D.2 Non-Functional Requirements

- **Performance:** Skip detection and execution latency < 100 ms per segment.
- **Scalability:** Works on any YouTube video regardless of length; memory usage < 5 MB.
- **Reliability:** Handles YouTube SPA navigation and network failures gracefully.
- **Usability:** UI controls follow Material Design guidelines; accessible via keyboard.
- **Maintainability:** TypeScript codebase with strict linting; modular architecture.
- **Portability:** Chrome Manifest V3; can be adapted to other Chromium‑based browsers.

## E. Database Design (Chrome Storage Schema)

The extension uses Chrome's `storage.local` to persist user settings and statistics.

```json
{
  "settings": {
    "enabled": true,
    "skipMode": "skip", // options: skip, mute, notify
    "autoAdSkip": true,
    "showProgressMarkers": true,
    "categoryFilters": ["sponsor", "intro", "outro"]
  },
  "statistics": {
    "totalSkips": 0,
    "totalTimeSaved": 0,
    "perVideo": {
      "<videoId>": {
        "skips": 0,
        "timeSaved": 0
      }
    }
  },
  "userContributedSegments": {
    "<videoId>": [
      { "start": 120.5, "end": 145.2, "category": "sponsor", "createdAt": "2025-01-15T10:30:00Z" }
    ]
  }
}
```

## F. API Design (Internal Messaging)

The extension communicates between the content script and background service worker via Chrome runtime messages.

| Message Type | Direction | Payload | Purpose |
|--------------|-----------|---------|---------|
| `GET_SETTINGS` | Popup → Background | – | Retrieve current configuration. |
| `SET_SETTINGS` | Popup → Background | `{settings}` | Persist user preferences. |
| `GET_STATS` | Popup → Background | – | Fetch usage statistics. |
| `INCREMENT_SKIP` | Content → Background | `{videoId, duration}` | Update skip counters. |
| `SEGMENT_DETECTED` | Content → Background | `{segments}` | Store user‑contributed segments (future). |

## G. System Workflows

### G.1 Normal Skipping Workflow
1. User opens a YouTube video.
2. Content script extracts video ID and loads settings from Chrome storage.
3. Tiered fetcher runs detection (chapters → SponsorBlock → transcript).
4. Detected segments are normalized and stored in memory.
5. UI injector adds progress‑bar markers and toggle button.
6. `timeupdate` listener checks current playback time.
7. When playback enters a segment, the configured action (skip/mute/notify) is executed.
8. Statistics are updated via a message to the background worker.

### G.2 Ad Auto‑Skip Workflow
1. Content script monitors DOM for `.ytp-ad-skip-button`.
2. When the button appears, it is programmatically clicked.
3. For unskippable ads, the script accelerates playback until the ad ends.

### G.3 User‑Contributed Segment Workflow (Planned)
1. User enables “Segment Selection Mode” in the popup.
2. Drag‑select on the progress bar or enter timestamps manually.
3. Segment data is saved to `userContributedSegments` in Chrome storage.
4. On subsequent video loads, the fetcher checks this local store before external sources.

## H. UI/UX Documentation

- **Toggle Button:** Integrated into YouTube player controls, uses SVG icon, ARIA label `Toggle auto‑skip`. State reflected by opacity change.
- **Popup Panel:** Chrome extension popup with tabs for Settings, Statistics, and Segment Editor. Styled with a dark theme, Google Fonts `Inter`.
- **Progress Bar Markers:** Semi‑transparent red overlays; hover tooltip shows start‑end timestamps.
- **Notifications:** Toast messages appear at the top‑right, fade out after 3 s.

## I. Project Implementation Details

- **Entry Points:** `manifest.json` defines `background.service_worker` (`background/index.ts`) and `content_scripts` (`src/content/simple-skipper.ts`).
- **Build Process:** Rollup bundles TypeScript sources into a single `content.js` and `background.js`. `npm run build` creates the `dist/` folder.
- **Modular Structure:**
  - `engine/tieredFetcher.ts` – detection orchestration.
  - `pipeline/*` – individual tier implementations.
  - `ui/*` – UI injection and visualization.
  - `types/types.ts` – shared interfaces (`Segment`, `Cue`).
- **Testing:** Jest unit tests for utility functions; Playwright end‑to‑end tests simulate video playback and verify skip actions.
- **Linting/Formatting:** ESLint with TypeScript plugin; Prettier enforces consistent style.

## J. Testing Documentation

| Test Type | Scope | Tools | Example Test |
|-----------|-------|-------|--------------|
| Unit | `segmentNormalizer`, `chapterScraper` | Jest | Verify that duplicate segments are merged correctly. |
| Integration | Tiered fetcher fallback logic | Jest + mock fetch | Ensure Tier 2 is called only when Tier 1 returns empty. |
| E2E | Full extension behavior on a real YouTube page | Playwright | Load a video, assert that sponsor segments are skipped within 150 ms. |
| UI | Popup interaction | Playwright | Toggle button changes state and persists to storage. |

## K. Deployment Documentation

1. Run `npm run build` to generate the `dist/` bundle.
2. Load the unpacked extension in Chrome:
   - Open `chrome://extensions/`.
   - Enable **Developer mode**.
   - Click **Load unpacked** and select the `dist/` folder.
3. (Optional) Publish to Chrome Web Store:
   - Create a developer account.
   - Upload the packaged `.zip` of the `dist/` folder.
   - Fill store listing metadata and submit for review.

## L. Security Considerations

- **Content Security Policy:** Manifest V3 enforces a strict CSP; no remote code execution.
- **Least‑Privilege Permissions:** Only `storage`, `scripting`, `webNavigation`, and host permissions for `youtube.com` and `sponsor.ajay.app` are requested.
- **Data Privacy:** No personal data is transmitted; all processing occurs client‑side.
- **Input Validation:** All timestamps from external APIs are validated against video duration before use.

## M. Challenges Faced

- **YouTube SPA Navigation:** Implemented `yt-navigate-finish` listener and URL mutation observer to re‑initialize the extension on video change.
- **Isolated Worlds:** Required careful use of `chrome.scripting.executeScript` to inject code into the page context.
- **CSP Restrictions:** Worked around script injection limits by using `manifest.json` CSP directives.
- **Race Conditions:** Ensured segment detection runs after the video element is ready using `requestAnimationFrame` loops.

## N. Future Enhancements

- **Cross‑Browser Support:** Adapt manifest and APIs for Firefox and Edge.
- **Backend Sync:** Optional cloud database to sync user‑contributed segments across devices.
- **Machine‑Learning Transcript Analysis:** Replace heuristic NLP with a lightweight ML model for higher accuracy.
- **Customizable Themes:** Light/dark mode and user‑defined color palettes for UI.
- **Community Marketplace:** Allow users to share custom segment packs.

---

# Interview Preparation Section

## Talking Points

- **1‑minute pitch:** "YouTube Auto Skipper is a Chrome extension that automatically detects and skips sponsored segments using a three‑tiered approach—description chapters, SponsorBlock API, and transcript analysis—providing a seamless viewing experience without any backend infrastructure."
- **3‑minute deep dive:** Explain the architecture layers, tiered detection fallback, UI injection, and how Chrome storage is used for settings and statistics. Highlight challenges like SPA navigation and CSP.
- **5‑minute technical walkthrough:** Walk through the content script lifecycle, tiered fetcher implementation, message passing with the background worker, and testing strategy (Jest + Playwright).

## HR‑Style Explanation

- **Role:** Full‑stack developer (frontend‑focused) responsible for end‑to‑end design, implementation, and testing of a browser extension.
- **Challenges:** Dealing with YouTube’s dynamic SPA, ensuring compliance with Manifest V3 security model, and achieving low‑latency skip actions.
- **Learnings:** Mastered Chrome extension APIs, asynchronous message handling, and performance optimisation in a client‑side‑only environment.

## Technical Interview Questions & Answers

1. **Q:** Why choose a three‑tiered detection strategy?
   **A:** It maximises coverage while minimizing network calls—local chapters are fastest, SponsorBlock provides crowd‑sourced data, and transcript analysis works as a fallback.
2. **Q:** How does the extension handle YouTube’s SPA navigation?
   **A:** Listens for `yt-navigate-finish` events and uses a `MutationObserver` on the URL to re‑initialise scripts when the video changes.
3. **Q:** What are the security implications of Manifest V3?
   **A:** V3 enforces a strict CSP, disallows remote code execution, and runs background scripts as service workers, reducing attack surface.
4. **Q:** How is state shared between the content script and background worker?
   **A:** Via `chrome.runtime.sendMessage` and `chrome.runtime.onMessage` APIs, passing JSON payloads for settings and statistics.
5. **Q:** Explain how you ensure low latency when skipping segments.
   **A:** The `timeupdate` listener checks playback time every frame (using `requestAnimationFrame`), and segment boundaries are pre‑computed, allowing sub‑100 ms reaction.
6. **Q:** What testing framework did you use for unit tests?
   **A:** Jest, with TypeScript support via `ts-jest`.
7. **Q:** How do you test the extension in a real browser?
   **A:** Playwright scripts launch Chrome, load the unpacked extension, navigate to a YouTube video, and assert that sponsor segments are skipped.
8. **Q:** Describe the storage schema for user statistics.
   **A:** A JSON object stored in `chrome.storage.local` with `settings`, `statistics`, and `userContributedSegments` keys, using video IDs as nested keys.
9. **Q:** How would you add support for Firefox?
   **A:** Convert the manifest to WebExtension format, replace `chrome.*` APIs with the `browser.*` namespace, and adjust CSP accordingly.
10. **Q:** What is the purpose of the background service worker?
    **A:** Handles persistent tasks like storing settings, aggregating statistics, and responding to messages from the content script.
11. **Q:** How do you avoid duplicate UI injection?
    **A:** Before injecting, the script checks for existing DOM elements with a unique ID; if present, it skips injection.
12. **Q:** Why use Rollup instead of Webpack?
    **A:** Rollup produces smaller bundles for library‑style code and has faster tree‑shaking for TypeScript projects.
13. **Q:** Explain the role of `chrome.scripting.executeScript`.
    **A:** It injects the content script into the page’s isolated world, allowing interaction with the YouTube DOM.
14. **Q:** How do you handle network failures when calling SponsorBlock?
    **A:** The fetcher catches errors, logs them, and proceeds to the next tier without disrupting the user experience.
15. **Q:** What accessibility considerations were made?
    **A:** All UI controls have ARIA labels, are keyboard navigable, and use sufficient contrast ratios.
16. **Q:** How is the progress‑bar visualization implemented?
    **A:** By calculating segment start/end percentages of video duration and rendering absolutely positioned `<div>` elements over the native bar.
17. **Q:** Describe how you would implement user‑contributed segment sharing.
    **A:** Store segments locally, then sync them to a backend (e.g., Firebase) with authentication‑less anonymous IDs, and expose an API for other users to fetch.
18. **Q:** What metrics would you monitor in production?
    **A:** Number of skips, total time saved, error rates on API calls, and user engagement with the popup.
19. **Q:** How do you ensure the extension does not violate YouTube’s terms of service?
    **A:** It only manipulates playback locally without modifying YouTube’s content or extracting protected data.
20. **Q:** What future improvements could you make with machine learning?
    **A:** Replace heuristic transcript parsing with a lightweight model that classifies sponsor sentences, improving accuracy and reducing false positives.

---