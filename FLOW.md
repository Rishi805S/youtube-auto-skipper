# Project Flow

This file is a quick memory refresh for how the extension works end to end.

## 1. What Starts First

The extension has 3 runtime entry points:

- [manifest.json](/c:/Users/Rishi/Documents/Project%201%20-%20Youtube%20Sponsors%20Autoskipper/youtube-auto-skipper/manifest.json)
- [src/background/index.ts](/c:/Users/Rishi/Documents/Project%201%20-%20Youtube%20Sponsors%20Autoskipper/youtube-auto-skipper/src/background/index.ts)
- [src/content/simple-skipper.ts](/c:/Users/Rishi/Documents/Project%201%20-%20Youtube%20Sponsors%20Autoskipper/youtube-auto-skipper/src/content/simple-skipper.ts)
- [src/popup/popup.ts](/c:/Users/Rishi/Documents/Project%201%20-%20Youtube%20Sponsors%20Autoskipper/youtube-auto-skipper/src/popup/popup.ts)

`manifest.json` tells Chrome:

- load `background.js` as the background worker
- load `content.js` on YouTube pages
- open `popup.html` when the extension icon is clicked

Snippet:

```json
"background": {
  "service_worker": "background.js"
},
"content_scripts": [
  {
    "matches": ["*://*.youtube.com/*"],
    "js": ["content.js"]
  }
]
```

## 2. Content Script Startup

The main runtime logic lives in [src/content/simple-skipper.ts](/c:/Users/Rishi/Documents/Project%201%20-%20Youtube%20Sponsors%20Autoskipper/youtube-auto-skipper/src/content/simple-skipper.ts).

It starts here:

```ts
initialize();
```

Inside `initialize()` it does 3 things:

1. Loads settings from `chrome.storage.sync`
2. Watches the page for `<video>` elements
3. Watches for YouTube URL changes

Important idea:
- this file is the main controller of the extension
- when it sees a video, it runs the 3-tier sponsor detection pipeline
- when it gets settings from the popup, it updates behavior
- when it gets a caption track URL from the background script, it can rerun Tier 3 with better data

## 3. Popup Flow

The popup UI is handled by:

- [src/popup/popup.html](/c:/Users/Rishi/Documents/Project%201%20-%20Youtube%20Sponsors%20Autoskipper/youtube-auto-skipper/src/popup/popup.html)
- [src/popup/popup.ts](/c:/Users/Rishi/Documents/Project%201%20-%20Youtube%20Sponsors%20Autoskipper/youtube-auto-skipper/src/popup/popup.ts)

The popup only changes 2 things:

- `enabled`
- `sponsorAction` = `skip | mute | ignore`

When the popup changes a setting, it:

1. saves it to `chrome.storage.sync`
2. sends a `SETTINGS_UPDATED` message to the content script

Snippet:

```ts
await chrome.tabs.sendMessage(tab.id, {
  type: 'SETTINGS_UPDATED',
  settings: this.state,
});
```

## 4. Background Flow

The background worker exists mainly for Tier 3.

File:
- [src/background/index.ts](/c:/Users/Rishi/Documents/Project%201%20-%20Youtube%20Sponsors%20Autoskipper/youtube-auto-skipper/src/background/index.ts)

Why it exists:
- a normal content script cannot reliably read YouTube's internal JS objects
- the caption track URL lives in `ytInitialPlayerResponse`
- so the background worker injects a script into the page's `MAIN` world

What happens:

1. background detects a YouTube watch page navigation
2. it calls `InjectorService.injectTrackUrlFetcher(tabId)`
3. it gets the caption `trackUrl`
4. it sends `TRACK_URL_FOUND` to the content script

Snippet:

```ts
const trackUrl = await InjectorService.injectTrackUrlFetcher(tabId);

await chrome.tabs.sendMessage(tabId, {
  type: 'TRACK_URL_FOUND',
  trackUrl,
  videoId,
});
```

## 5. Caption Track Injection Flow

File:
- [src/services/InjectorService.ts](/c:/Users/Rishi/Documents/Project%201%20-%20Youtube%20Sponsors%20Autoskipper/youtube-auto-skipper/src/services/InjectorService.ts)

This is the exact place where the project reads YouTube's caption track data.

It runs code in `world: 'MAIN'` and checks:

```ts
window.ytInitialPlayerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks
```

Then it chooses the best caption track in this order:

1. English auto captions
2. English captions
3. first available caption track

And returns:

```ts
bestTrack.baseUrl
```

That `baseUrl` becomes the `trackUrl` used in Tier 3.

## 6. Main Sponsor Detection Flow

The content script calls:

- [src/engine/tieredFetcher.ts](/c:/Users/Rishi/Documents/Project%201%20-%20Youtube%20Sponsors%20Autoskipper/youtube-auto-skipper/src/engine/tieredFetcher.ts)

Main function:

```ts
getSegmentsByPriority(videoId, trackUrl)
```

This is the full sponsor detection pipeline.

It tries 3 tiers in order:

1. Tier 1: description chapters
2. Tier 2: SponsorBlock API
3. Tier 3: transcript/caption heuristics

The first tier that returns useful segments wins.

## 7. Tier 1 Flow

File:
- [src/pipeline/chapterScraper.ts](/c:/Users/Rishi/Documents/Project%201%20-%20Youtube%20Sponsors%20Autoskipper/youtube-auto-skipper/src/pipeline/chapterScraper.ts)

What it does:

1. looks in the YouTube description for timestamp links
2. converts timestamps like `1:20` or `12:05` into seconds
3. reads the chapter title near each timestamp
4. checks if the title contains sponsor-like keywords
5. returns sponsor segments

Examples of keywords:
- `sponsor`
- `promotion`
- `paid promotion`
- `thanks to`

This tier is good because it is simple and very fast.

## 8. Tier 2 Flow

File:
- [src/api/SponsorBlockClient.ts](/c:/Users/Rishi/Documents/Project%201%20-%20Youtube%20Sponsors%20Autoskipper/youtube-auto-skipper/src/api/SponsorBlockClient.ts)

What it does:

1. calls SponsorBlock API with the current `videoId`
2. filters only `sponsor` category segments
3. maps them into the project `Segment` shape

Snippet:

```ts
fetch(`https://sponsor.ajay.app/api/skipSegments?videoID=${videoId}`)
```

This tier is good because the community may already know the sponsor timestamps.

## 9. Tier 3 Flow

File:
- [src/pipeline/transcriptParser.ts](/c:/Users/Rishi/Documents/Project%201%20-%20Youtube%20Sponsors%20Autoskipper/youtube-auto-skipper/src/pipeline/transcriptParser.ts)

Tier 3 is the fallback when Tier 1 and Tier 2 fail.

It has 2 internal paths:

### Path A: Caption Track URL

If `trackUrl` exists:

1. fetch caption XML from the track URL
2. parse `<text>` nodes
3. convert them into transcript cues
4. look for sponsor keywords
5. build sponsor segments

This is the preferred Tier 3 path because it uses cleaner transcript data.

### Path B: Transcript Panel Scraping

If `trackUrl` is missing or returns no useful cues:

1. open the transcript panel in the YouTube UI
2. read transcript rows from the DOM
3. convert them into cues
4. detect sponsor-like phrases
5. build sponsor segments

This is the fallback inside the fallback.

## 10. How Skipping Actually Happens

Still in [src/content/simple-skipper.ts](/c:/Users/Rishi/Documents/Project%201%20-%20Youtube%20Sponsors%20Autoskipper/youtube-auto-skipper/src/content/simple-skipper.ts):

Once segments are loaded, the script listens to video playback:

```ts
video.addEventListener('timeupdate', () => {
  checkForSkip(video);
});
```

`checkForSkip(video)`:

1. sees current playback time
2. checks whether current time is inside a sponsor segment
3. calls `executeSkipAction(...)`

`executeSkipAction(...)` then:

- jumps to `segment.end` if action is `skip`
- mutes audio until `segment.end` if action is `mute`
- does nothing if action is `ignore`

## 11. Important State Values

These are the most important runtime values in [src/content/simple-skipper.ts](/c:/Users/Rishi/Documents/Project%201%20-%20Youtube%20Sponsors%20Autoskipper/youtube-auto-skipper/src/content/simple-skipper.ts):

- `currentVideoId`
  what video we are currently processing

- `currentTrackUrl`
  caption track URL received from the background script

- `currentSegments`
  detected sponsor segments currently in use

- `state`
  popup-controlled settings like enabled/disabled and skip/mute/ignore

- `skippedSegments`
  helps avoid repeatedly re-skipping the same segment too aggressively

## 12. Short Mental Model

If you come back to this project later, remember it like this:

```txt
Popup changes settings
        |
        v
Content script watches video + URL
        |
        v
Tiered fetcher tries:
  1. Description chapters
  2. SponsorBlock
  3. Transcript/captions
        |
        v
Detected segments are used by simple-skipper
        |
        v
Video is skipped or muted during sponsor range
```

And for Tier 3 specifically:

```txt
Background script
  -> inject into YouTube page
  -> read caption track URL
  -> send TRACK_URL_FOUND
  -> transcript parser uses trackUrl
  -> if that fails, scrape transcript panel
```
