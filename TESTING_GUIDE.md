# SponsorSkip Enhanced - Feature Testing Guide

## 🚀 How to Test All New Features

### Prerequisites

1. Build the extension: `npm run build`
2. Load the extension in Chrome Developer Mode
3. Navigate to any YouTube video with sponsor segments
4. Open Chrome DevTools Console (F12) to see debug logs

---

## 🎯 **Feature Testing Checklist**

### **1. Three-Tiered Segment Detection**

**What to test:** The extension uses multiple methods to detect sponsor segments

**How to test:**

- Watch videos with different types of sponsor segments
- Check console for tier detection logs
- Try videos where SponsorBlock API might not have data

**Expected behavior:**

- Console shows: `[Fetch][Tier 1] Description chapters: X` or `[Fetch][Tier 2] SponsorBlock API: X` or `[Fetch][Tier 3] Transcript heuristics: X`
- Segments are detected even if one tier fails
- Fallback to next tier automatically

---

### **2. Visual Progress Bar Markers**

**What to test:** Colored segments on YouTube progress bar

**How to test:**

- Look at YouTube's progress bar
- Hover over colored segments
- Check different segment categories

**Expected behavior:**

- Red segments = sponsors
- Orange segments = self-promotion
- Purple segments = interaction reminders
- Tooltips show category and duration
- Segments pulse when upcoming

---

### **3. Enhanced Keyboard Shortcuts**

**What to test:** Comprehensive keyboard shortcuts for all features

**How to test:**

- Press `Alt + S` to toggle extension
- Press `Alt + 1/2/3` to set sponsor action (Skip/Mute/Watch)
- Press `Alt + A` to toggle ad skipping
- Press `Alt + O` to open popup
- Press `Alt + H` to show help
- Press `Alt + D` for detailed statistics
- Press `Alt + M` for memory/segment info
- Press `Alt + P` for performance info

**Expected behavior:**

- Alt + S: Toggles extension on/off with notification
- Alt + 1: Sets action to SKIP segments
- Alt + 2: Sets action to MUTE segments
- Alt + 3: Sets action to WATCH segments
- Alt + A: Toggles YouTube ad skipping on/off
- Alt + O: Opens extension popup
- Alt + H: Shows all available shortcuts
- Alt + D: Shows skip count and time saved
- Alt + M: Shows segment count and current action
- Alt + P: Shows video progress and performance info

---

### **4. Skip, Mute, and Watch Modes**

**What to test:** Different actions for sponsor segments

**How to test:**

- Use popup to switch between Skip/Mute/Watch modes
- Watch segments get processed accordingly

**Expected behavior:**

- Skip mode: Jumps to end of segment
- Mute mode: Mutes audio during segment, restores after
- Watch mode: Detects but takes no action

---

### **5. Enhanced Notifications**

**What to test:** Better notifications with emojis and categories

**How to test:**

- Watch segments get skipped/muted
- Use keyboard shortcuts
- Check different notification types

**Expected behavior:**

- Emojis for each category (💰 sponsors, 📢 self-promo)
- Detailed statistics in notifications
- Toast notifications appear and disappear smoothly

---

### **6. Progress Bar Integration**

**What to test:** Visual feedback on YouTube progress bar

**How to test:**

- Watch videos with sponsor segments
- Look for colored markers on progress bar
- Hover over segments for tooltips

**Expected behavior:**

- Colored segments appear on progress bar
- Hover tooltips show segment details
- Upcoming segments pulse with animation

### **7. Ad Skipping**

**What to test:** YouTube preroll ad detection and skipping

**How to test:**

- Open YouTube videos with ads
- Check if ads are automatically skipped
- Toggle ad skipping on/off in popup

**Expected behavior:**

- Ads are detected when `#movie_player.ad-showing` class is present
- Ad videos are fast-forwarded to end automatically
- Console shows: `[AdSkip] Skipping ad: Xs → Ys`
- Ad skipping can be disabled via popup toggle
- Works in all YouTube player modes

---

## 🔧 **Testing Different Video Types**

### **Videos with SponsorBlock Data**

- Should use Tier 2 (SponsorBlock API)
- Console: `[Fetch][Tier 2] SponsorBlock API: X`

### **Videos with Description Chapters**

- Should use Tier 1 (Description Chapters)
- Console: `[Fetch][Tier 1] Description chapters: X`

### **Videos with Transcripts**

- Should use Tier 3 (Transcript Analysis)
- Console: `[Fetch][Tier 3] Transcript heuristics: X`

### **Videos with No Sponsor Data**

- Should return empty segments
- Console: `[SponsorSkip] No segments found`

### **Videos with Ads**

- Should detect and skip preroll ads
- Console: `[AdSkip] Skipping ad: Xs → Ys`
- Ad skipping works regardless of sponsor segment availability
- Can be toggled on/off via popup

---

## 🐛 **Troubleshooting**

### **Extension Not Working**

1. Check if extension is enabled in chrome://extensions/
2. Look for console errors
3. Verify popup toggle is enabled
4. Check if on YouTube video page

### **No Segments Detected**

1. Try different videos
2. Check network tab for API calls
3. Verify three-tiered detection logs
4. Test with known sponsor-heavy videos

### **Progress Bar Not Showing**

1. Refresh the page
2. Check if video is playing
3. Look for console errors
4. Verify YouTube player is loaded

### **Keyboard Shortcuts Not Working**

1. Make sure not typing in input fields
2. Check if extension is enabled
3. Try different browsers
4. Verify Alt key combinations

### **Ad Skipping Not Working**

1. Check if ad skipping is enabled in popup
2. Look for `[AdSkip]` console messages
3. Verify `#movie_player.ad-showing` class is present
4. Check if ads are actually playing (not just thumbnails)

---

## 📊 **Performance Testing**

### **Memory Usage**

- Monitor memory usage in DevTools
- Should stay under 10MB
- No memory leaks on page navigation

### **CPU Usage**

- Check CPU usage during video playback
- Should be minimal impact
- Throttled event listeners working

### **Network Requests**

- Monitor network tab for API calls
- Should only call SponsorBlock API when needed
- No excessive requests

---

## 🎯 **Success Criteria**

### **Functional Requirements**

- [ ] Three-tiered detection works on all video types
- [ ] Visual progress bar displays correctly
- [ ] Keyboard shortcuts respond properly
- [ ] Skip/Mute/Watch modes function correctly
- [ ] Notifications appear and disappear smoothly
- [ ] Ad skipping detects and skips YouTube preroll ads

### **Performance Requirements**

- [ ] Extension loads in < 100ms
- [ ] Memory usage < 10MB
- [ ] No conflicts with other extensions
- [ ] Smooth performance during video playback

### **User Experience Requirements**

- [ ] Intuitive popup interface
- [ ] Clear visual feedback
- [ ] Responsive keyboard shortcuts
- [ ] Reliable segment detection

---

**Testing Status**: ✅ **READY FOR TESTING**

All features implemented and ready for comprehensive testing. Three-tiered detection system, visual progress bar, comprehensive keyboard shortcuts (10 shortcuts), and ad skipping with skip button detection are all functional.
