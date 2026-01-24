# Troubleshooting & Debug Guide

Comprehensive guide to diagnosing and fixing common issues with youtube-auto-skipper.

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Common Issues Database](#common-issues-database)
3. [Debug Logging Guide](#debug-logging-guide)
4. [Network Debugging](#network-debugging)
5. [Performance Issues](#performance-issues)
6. [Chrome Extension Specific Issues](#chrome-extension-specific-issues)
7. [Debug Console Commands](#debug-console-commands)
8. [Collecting Logs for Bug Reports](#collecting-logs-for-bug-reports)

---

## Quick Diagnostics

### Is the Extension Working?

Run this quick checklist to verify basic functionality:

#### 1. Extension Installed and Enabled
```
✓ Go to chrome://extensions/
✓ Find "YouTube Auto Skipper"
✓ Verify toggle is ON (blue)
✓ Check for error messages
```

#### 2. Content Script Loaded
```
✓ Open YouTube video
✓ Press F12 (open DevTools)
✓ Go to Console tab
✓ Look for: [SponsorSkip] Simple content script loaded
```

#### 3. Video Detection
```
✓ Check console for: [SponsorSkip] Current video ID: <id>
✓ If missing → Content script not injecting
```

#### 4. Segment Detection
```
✓ Look for: [Fetch][Tier 1/2/3] messages
✓ Check: [SponsorSkip] Segments loaded: <number>
✓ If 0 → No segments found (expected for some videos)
```

#### 5. Keyboard Shortcuts
```
✓ Press Alt+H
✓ Should see toast notification in top-right
✓ If nothing → InputHandler not initialized
```

### Diagnostic Flow Chart

```
Extension not working?
    ↓
Is extension enabled? → NO → Enable in chrome://extensions/
    ↓ YES
Content script logs present? → NO → See "Extension doesn't load"
    ↓ YES
Video ID detected? → NO → See "Video detection fails"
    ↓ YES
Segments loaded? → NO → See "No segments detected"
    ↓ YES (>0 segments)
Skipping works? → NO → See "Segments detected but not skipped"
    ↓ YES
✓ Extension working correctly!
```

---

## Common Issues Database

### Issue 1: Extension Doesn't Load

**Symptoms:**
- No console logs on YouTube pages
- Extension icon is grayed out
- Keyboard shortcuts don't work

**Possible Causes:**

#### A. Manifest Error
**Diagnosis:**
```
1. Go to chrome://extensions/
2. Check for red error banner under extension
3. Click "Errors" button if present
```

**Common Manifest Errors:**
```
Error: "Required value 'version' is missing"
→ manifest.json is corrupted or missing

Error: "Invalid value for 'manifest_version'"
→ Browser doesn't support Manifest V3
```

**Solution:**
```bash
# Rebuild extension
npm run build

# Verify manifest.json exists in dist/
ls dist/manifest.json

# If missing, check rollup.config.js includes copy plugin
```

#### B. Build Not Completed
**Diagnosis:**
```bash
# Check if dist/ folder exists and contains files
ls -la dist/

# Expected output:
# background.js
# content.js
# popup.js
# manifest.json
```

**Solution:**
```bash
npm run build
# Wait for "Build completed" message
```

#### C. Wrong Folder Loaded
**Diagnosis:**
Check extensions page shows:
```
Manifest location: /path/to/youtube-auto-skipper/dist/manifest.json
                                                    ^^^^
                                                    Must be dist/
```

**Solution:**
```
1. Remove extension
2. Click "Load unpacked"
3. Select the dist/ folder specifically
```

---

### Issue 2: No Segments Detected

**Symptoms:**
- Console shows: `[SponsorSkip] Segments loaded: []`
- No red markers on progress bar
- No skip actions occur

**Expected Behavior:**
Not all videos have sponsor segments. This is normal for:
- Brand new videos (not in SponsorBlock database yet)
- Videos without description chapters
- Videos without sponsor content

**Diagnosis Steps:**

#### A. Check All Three Tiers
**Console should show:**
```
[Fetch][Tier 1] Description chapters: 0
[Fetch][Tier 2] SponsorBlock API: 0
[Fetch][Tier 3] Transcript heuristics: 0
```

#### B. Test with Known Video
Try this video (known to have SponsorBlock data):
```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

If still no segments → Issue with extension

#### C. Check Network Requests
```
1. Open DevTools → Network tab
2. Reload YouTube page
3. Filter: sponsor.ajay.app
4. Should see request to SponsorBlock API
```

**If request missing:**
- Tier 2 not executing
- Check for JavaScript errors in console

**If request returns 404:**
- Video has no SponsorBlock data (normal)

**If request fails (network error):**
- Check internet connection
- Check if sponsor.ajay.app is accessible
- Firewall/proxy may be blocking

---

### Issue 3: Progress Bar Not Showing

**Symptoms:**
- Segments loaded (console shows `Segments loaded: 2`)
- No red markers visible on progress bar
- Skipping still works

**Possible Causes:**

#### A. YouTube UI Changed
**Diagnosis:**
```javascript
// In console, run:
document.querySelector('.ytp-progress-bar')
// Should return: <div class="ytp-progress-bar">...</div>

// If null → YouTube changed selectors
```

**Solution:**
```
1. Open GitHub issue to report selector change
2. Workaround: Use keyboard shortcuts (Alt+1 for skip)
3. Wait for update or contribute fix
```

#### B. ProgressBarVisualizer Initialization Failed
**Check console for:**
```
[SponsorSkip] Visualizer initialized
```

**If missing, check for errors:**
```
[SponsorSkip] Visualizer init failed: <error>
```

**Solution:**
```javascript
// Manual test in console:
const video = document.querySelector('video');
console.log('Video duration:', video.duration);
// If NaN or 0 → Video not ready when visualizer ran
```

**Workaround:**
Reload page (Ctrl+R)

#### C. Z-Index Conflict
**Diagnosis:**
```javascript
// Check if markers exist but hidden
document.querySelectorAll('.sponsorskip-marker').length
// If > 0 → Markers exist but not visible
```

**Solution:**
```javascript
// Force show markers (temporary fix):
document.querySelectorAll('.sponsorskip-marker').forEach(el => {
  el.style.zIndex = '9999';
  el.style.background = 'rgba(255, 0, 0, 0.8)';
});
```

---

### Issue 4: Keyboard Shortcuts Not Responding

**Symptoms:**
- Pressing Alt+S, Alt+1, etc. does nothing
- No toast notifications
- Extension works otherwise

**Possible Causes:**

#### A. InputHandler Not Initialized
**Check console:**
```
[SponsorSkip] InputHandler initialized
```

**If missing:**
- Content script failed to load
- Check for JavaScript errors

**Solution:**
```bash
# Rebuild and reload
npm run build
# Then refresh extension in chrome://extensions/
```

#### B. Focus on Input Field
**Diagnosis:**
Shortcuts are ignored when typing in:
- YouTube search box
- Comment field
- Any `<input>` or `<textarea>`

**Expected Behavior:**
Click on video player area, then try shortcuts

#### C. Key Conflict
**Diagnosis:**
Another extension may be capturing the same shortcuts

**Test:**
```
1. Disable all other extensions
2. Try shortcuts again
3. If works → Re-enable extensions one by one to find conflict
```

**Solution:**
Modify shortcuts in `src/features/InputHandler.ts`:
```typescript
// Change Alt to Ctrl or Shift
if (!e.ctrlKey) return; // Instead of e.altKey
```

---

### Issue 5: Ad Skipping Not Working

**Symptoms:**
- Ads still play
- "Skip Ad" button not auto-clicked
- Unskippable ads not fast-forwarded

**Possible Causes:**

#### A. Feature Disabled
**Check:**
```javascript
// In console:
chrome.storage.sync.get('skipper-ads', (result) => {
  console.log('Ad skipping enabled:', result['skipper-ads']);
});
// Should return: true
```

**Solution:**
Press `Alt+A` to toggle ad skipping

#### B. Ad Detection Failed
**Check console during ad:**
```
[SponsorSkip] Fast-forwarding ad: 0.0s → 15.0s
```

**If missing:**
- Ad detection not working
- Check selector changes

**Manual test:**
```javascript
// During ad, run:
const player = document.getElementById('movie_player');
console.log('Ad showing:', player.classList.contains('ad-showing'));
// Should return: true during ads
```

#### C. YouTube Ad Updates
YouTube frequently changes ad DOM structure

**Workaround:**
Update selectors in `src/config/constants.ts`:
```typescript
AD_SKIP_BUTTON: [
  '.ytp-skip-ad-button',
  '.ytp-ad-skip-button',
  // Add new selectors discovered via DevTools
  'button[class*="skip"]' // More generic fallback
]
```

---

### Issue 6: Segments Detected But Not Skipped

**Symptoms:**
- Console shows segments loaded
- Red markers on progress bar
- Playback reaches segment but doesn't skip

**Possible Causes:**

#### A. Extension Disabled
**Check state:**
```javascript
// Console:
chrome.storage.sync.get('skipper-enabled', (result) => {
  console.log('Enabled:', result['skipper-enabled']);
});
```

**Solution:**
Press `Alt+S` to enable

#### B. Action Set to "Watch" (Notify Only)
**Check:**
```javascript
chrome.storage.sync.get('skipper-action', (result) => {
  console.log('Action:', result['skipper-action']);
  // Should be 'skip' or 'mute', not 'ignore'
});
```

**Solution:**
Press `Alt+1` for skip mode or `Alt+2` for mute mode

#### C. Video Time Not Updating
**Diagnosis:**
```javascript
const video = document.querySelector('video');
console.log('Current time:', video.currentTime);
// Then wait 5 seconds and run again
// Time should increase
```

**If frozen:**
- Video paused or buffering
- Video element not the actual player

---

### Issue 7: Performance Issues

**Symptoms:**
- YouTube page slow/laggy
- Video playback stutters
- Browser tab uses high CPU

**Diagnosis:**

#### A. Check Console for Excessive Logs
```
[SponsorSkip] ...
[SponsorSkip] ...
[SponsorSkip] ... (repeating rapidly)
```

**If flooding:**
- `timeupdate` event firing too fast
- Infinite loop in code

**Solution:**
Disable debug logging:
```typescript
// src/utils/Logger.ts
private static isDebug = false;
```

#### B. Memory Leak Check
```javascript
// Console:
performance.memory.usedJSHeapSize / 1048576
// Run this every 10 seconds
// If constantly increasing → memory leak
```

**Common causes:**
- Not clearing intervals (`startAdDetection`)
- Not removing event listeners
- Holding references to old video elements

**Solution:**
```javascript
// Check intervals are cleared on video change
console.log('Active intervals:', window.setInterval.length);
```

#### C. Profiler Analysis
```
1. Open DevTools → Performance tab
2. Click Record
3. Let run for 10 seconds
4. Stop recording
5. Look for:
   - Long tasks (yellow/red bars)
   - Frequent garbage collection (sawtooth memory pattern)
   - Excessive DOM queries
```

---

### Issue 8: Extension Works Sometimes

**Symptoms:**
- Works on some videos, not others
- Works after reload, then stops
- Intermittent failures

**Possible Causes:**

#### A. YouTube SPA Navigation
YouTube uses Single Page Application routing. Extension must detect navigation.

**Check console when changing videos:**
```
[SponsorSkip] New video detected, loading segments...
```

**If missing:**
- SPA navigation not detected
- `MutationObserver` not watching

**Solution:**
Hard reload page (Ctrl+Shift+R) on new video

#### B. Race Condition
Extension initializes before video element exists

**Check timing:**
```
[SponsorSkip] Content script loaded
[SponsorSkip] Video element found
^ Should be in this order
```

**If reversed:**
- Add retry logic
- Increase initialization delay

#### C. Service Worker Inactive (Manifest V3)
Background service workers can become inactive

**Diagnosis:**
```
chrome://extensions/ → Click "Inspect views: background page"
If link missing → Service worker inactive (expected in MV3)
```

**Solution:**
Design extension to work without persistent background script (already done)

---

## Debug Logging Guide

### Enable Verbose Logging

#### Step 1: Enable Debug Mode
```typescript
// src/utils/Logger.ts
private static isDebug = true; // ← Ensure this is true
```

#### Step 2: Rebuild
```bash
npm run build
```

#### Step 3: Reload Extension
```
chrome://extensions/ → Click refresh icon
```

#### Step 4: Open Console
```
F12 → Console tab
```

### Understanding Log Messages

#### Content Script Initialization
```
[SponsorSkip] Simple content script loaded
→ Content script injected successfully

[SponsorSkip] Current video ID: dQw4w9WgXcQ
→ Video detected and ID extracted

[SponsorSkip] New video detected, loading segments...
→ Starting segment fetch process
```

#### Segment Detection (Tier 1)
```
[Tier 1] Expanding description…
→ Attempting to open "Show more" button

[Tier 1] Total anchors: 15
→ Found links in description

[Tier 1] Anchors with timestamps: 5
→ Found potential chapters

[Tier 1] Sponsor chapters: [{start: 90, end: 120}]
→ Found chapter with "sponsor" in title
```

#### Segment Detection (Tier 2)
```
[Fetch][Tier 2] SponsorBlock API: 2
→ SponsorBlock returned 2 segments
```

#### Segment Detection (Tier 3)
```
[Fetch][Tier 3] Transcript heuristics: 1
→ Transcript analysis found 1 segment
```

#### Segment Normalization
```
[Merge][Engine] before normalize: 3
[Merge][Engine] after normalize: 2
→ Merged overlapping segments
```

#### Visualizer
```
[SponsorSkip] Segments loaded: [...]
[SponsorSkip] Visualizer initialized
→ Progress bar markers should be visible
```

#### Skip Execution
```
[SponsorSkip] Skipping segment 0: 90.0s → 120.0s
[SponsorSkip] Saved 30.0s
→ Successfully skipped segment
```

#### Ad Skipping
```
[SponsorSkip] Fast-forwarding ad: 0.5s → 15.0s
→ Jumped to end of unskippable ad

[SponsorSkip] Clicking skip button
→ Clicked "Skip Ad" button
```

### Filtering Console Output

#### Chrome DevTools Filters
```
Filter by extension name:
  [SponsorSkip]

Filter by tier:
  [Tier 1]
  [Tier 2]
  [Tier 3]

Filter by action:
  Skipping segment
  Muting segment
```

#### Hide YouTube's Logs
```
Filter: -ytInitialPlayerResponse -ytcfg -yt.config
(Use minus sign to exclude)
```

---

## Network Debugging

### Monitor SponsorBlock API Calls

#### DevTools Network Tab
```
1. F12 → Network tab
2. Filter: "sponsor.ajay.app"
3. Reload YouTube page
4. Look for request
```

#### Expected Request
```
Request URL: https://sponsor.ajay.app/api/skipSegments?videoID=dQw4w9WgXcQ
Method: GET
Status: 200 OK (if segments exist)
Status: 404 Not Found (if no segments)
```

#### Response Format (200 OK)
```json
[
  {
    "category": "sponsor",
    "segment": [10.5, 45.2],
    "UUID": "abc123...",
    "videoDuration": 300,
    "locked": 0,
    "votes": 5
  }
]
```

#### Common Network Issues

**Request Blocked (CORS)**
```
Error: Blocked by CORS policy
→ Should NOT happen (API allows all origins)
→ If happens: Check browser extensions/firewall
```

**Request Timeout**
```
Error: net::ERR_TIMED_OUT
→ Internet connection issue
→ API server down (rare)
```

**Request 404**
```
Status: 404 Not Found
→ Normal: Video has no SponsorBlock data
→ Try different video to confirm extension works
```

### Monitor Transcript Fetching

#### Find Transcript Request
```
1. DevTools → Network tab
2. Filter: "timedtext"
3. Look for: youtube.com/api/timedtext?v=...
```

#### Expected Request
```
Request URL: https://www.youtube.com/api/timedtext?v=dQw4w9WgXcQ&lang=en
Status: 200 OK (if captions exist)
Status: 404 (if no captions)
```

#### Response Format
```xml
<transcript>
  <text start="0.5" dur="2.3">Welcome to this video</text>
  <text start="2.8" dur="3.1">Today's sponsor is...</text>
</transcript>
```

---

## Performance Issues

### Measure Performance Impact

#### CPU Usage
```javascript
// Console:
console.time('extensionOverhead');
// Wait 10 seconds during video playback
console.timeEnd('extensionOverhead');
// Should be < 100ms total
```

#### Memory Usage
```javascript
// Initial:
console.log('Memory:', performance.memory.usedJSHeapSize / 1048576, 'MB');

// After 5 minutes:
console.log('Memory:', performance.memory.usedJSHeapSize / 1048576, 'MB');

// Increase should be < 5 MB
```

#### Frame Rate
```
1. DevTools → Rendering tab
2. Enable "Frame Rendering Stats"
3. Should maintain 60 FPS during video playback
```

### Optimization Tips

#### Reduce Polling Frequency
```typescript
// src/config/constants.ts
TIMEOUTS: {
  AD_CHECK_INTERVAL: 2000, // Increase from 1000ms to 2000ms
  VIDEO_CHECK_THROTTLE: 1000 // Increase from 500ms
}
```

#### Disable Features
```javascript
// Temporarily disable ad skipping for testing
chrome.storage.sync.set({ 'skipper-ads': false });
```

#### Clear Cache
```
Chrome Settings → Privacy → Clear browsing data
→ Select "Cached images and files"
→ Time range: Last hour
```

---

## Chrome Extension Specific Issues

### Manifest V3 Limitations

#### Service Worker Inactive
**Expected:** Background service worker goes inactive after 30 seconds
**Impact:** None (extension designed for this)

**Verify:**
```
chrome://extensions/ → "Inspect views" link disappears when inactive
```

#### Storage Quota
**Limit:** `chrome.storage.sync` has 100KB total limit

**Check usage:**
```javascript
chrome.storage.sync.getBytesInUse(null, (bytes) => {
  console.log('Storage used:', bytes, 'bytes');
});
// Should be < 1000 bytes for this extension
```

### Permissions Issues

#### Check Granted Permissions
```javascript
chrome.permissions.getAll((permissions) => {
  console.log('Permissions:', permissions);
});

// Expected:
// {
//   permissions: ["storage", "webNavigation"],
//   origins: ["*://www.youtube.com/*"]
// }
```

#### Missing Host Permission
**Symptom:** Extension doesn't run on YouTube

**Fix:**
Check `manifest.json`:
```json
{
  "host_permissions": [
    "*://www.youtube.com/*",
    "*://youtube.com/*"
  ]
}
```

### Content Script Injection Timing

#### Too Early
Content script runs before page ready

**Solution:**
```json
// manifest.json
"content_scripts": [{
  "run_at": "document_idle" // Wait for page ready
}]
```

#### Too Late
Page already loaded when extension installed

**Solution:**
Reload page (Ctrl+R)

---

## Debug Console Commands

### Quick Tests

#### Check Video State
```javascript
const video = document.querySelector('video');
console.log({
  currentTime: video.currentTime,
  duration: video.duration,
  paused: video.paused,
  volume: video.volume
});
```

#### Check Extension State
```javascript
chrome.storage.sync.get(null, (data) => console.log('State:', data));
```

#### Manually Skip to Time
```javascript
const video = document.querySelector('video');
video.currentTime = 90; // Skip to 1:30
```

#### Test Notification
```javascript
const toast = document.createElement('div');
toast.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #333; color: white; padding: 10px; z-index: 10000;';
toast.textContent = 'Test notification';
document.body.appendChild(toast);
setTimeout(() => toast.remove(), 3000);
```

#### Force Segment Load
```javascript
// In console (assumes extension loaded):
// This won't work directly due to module scope
// But you can check if segments are loaded:
console.log('Check console for: [SponsorSkip] Segments loaded');
```

### Advanced Debugging

#### Inspect Content Script Context
```javascript
// Check what's defined in window scope:
console.log('Extension objects:', Object.keys(window).filter(k => k.includes('sponsor')));
```

#### Monitor Time Updates
```javascript
let lastTime = 0;
document.querySelector('video').addEventListener('timeupdate', (e) => {
  const now = e.target.currentTime;
  console.log('Time:', now.toFixed(2), 'Δ:', (now - lastTime).toFixed(2));
  lastTime = now;
});
```

#### Simulate Segment Skip
```javascript
const video = document.querySelector('video');
const segment = { start: video.currentTime - 5, end: video.currentTime + 10 };
console.log('Simulating skip:', segment);
video.currentTime = segment.end;
```

---

## Collecting Logs for Bug Reports

### Step-by-Step Log Collection

#### 1. Enable Debug Mode
```typescript
// src/utils/Logger.ts
private static isDebug = true;
```

#### 2. Rebuild Extension
```bash
npm run build
```

#### 3. Reload Extension
```
chrome://extensions/ → Refresh
```

#### 4. Reproduce Issue
```
1. Open YouTube video
2. Perform action that triggers bug
3. Keep DevTools open
```

#### 5. Export Console Logs
```
1. Right-click in Console
2. Select "Save as..."
3. Save to: bug-report-console.log
```

#### 6. Capture Network Activity
```
1. DevTools → Network tab
2. Right-click on request list
3. "Save all as HAR with content"
4. Save to: bug-report-network.har
```

#### 7. Export Extension State
```javascript
// Run in console:
chrome.storage.sync.get(null, (data) => {
  console.log('=== EXTENSION STATE ===');
  console.log(JSON.stringify(data, null, 2));
});
// Copy output
```

#### 8. Collect System Info
```javascript
// Run in console:
console.log('=== SYSTEM INFO ===');
console.log('User Agent:', navigator.userAgent);
console.log('Chrome Version:', navigator.appVersion);
console.log('Extension Version:', chrome.runtime.getManifest().version);
console.log('Current URL:', window.location.href);
```

### Bug Report Template

```markdown
## Bug Description
[Describe what happened vs what you expected]

## Steps to Reproduce
1. [First step]
2. [Second step]
3. [See error]

## Environment
- Browser: Chrome [version]
- Extension Version: [version]
- OS: [Windows/Mac/Linux]
- Video URL: [if applicable]

## Console Logs
```
[Paste relevant console output]
```

## Network Requests
[Attach bug-report-network.har or describe failed requests]

## Screenshots
[Add screenshots if applicable]

## Additional Context
[Any other relevant information]
```

---

## Still Stuck?

### Escalation Path

1. **Check FAQ:** [FAQ.md](./FAQ.md)
2. **Search Issues:** [GitHub Issues](https://github.com/yourusername/youtube-auto-skipper/issues)
3. **Ask Community:** [GitHub Discussions](https://github.com/yourusername/youtube-auto-skipper/discussions)
4. **File Bug Report:** [New Issue](https://github.com/yourusername/youtube-auto-skipper/issues/new)

### Before Filing a Bug

- [ ] Checked this troubleshooting guide
- [ ] Searched existing issues
- [ ] Tested with latest version
- [ ] Disabled other extensions
- [ ] Collected debug logs
- [ ] Tested in incognito mode
- [ ] Tried on different video
- [ ] Verified internet connection

---

**Last Updated:** 2024
**Version:** 1.0.0
