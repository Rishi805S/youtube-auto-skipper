# SponsorSkip Enhanced - Feature Testing Guide

## 🚀 How to Test All New Features

### Prerequisites
1. Build the extension: `npm run build`
2. Load the extension in Chrome Developer Mode
3. Navigate to any YouTube video with sponsor segments
4. Open Chrome DevTools Console (F12) to see debug logs

---

## 🎯 **Feature Testing Checklist**

### **1. Segment Memory & Learning System**
**What to test:** The extension learns your preferences and remembers your actions

**How to test:**
- Press `Alt + M` to see memory stats
- Skip a few sponsor segments manually
- Reload the page - extension should remember your preferences
- Check console for: `[SponsorSkip Debug] Memory service initialized`

**Expected behavior:**
- After 5+ skips of same category, it auto-adds to skip list
- Stats show learning is ON and action count increases

---

### **2. Performance Optimizations**
**What to test:** Efficient segment processing and caching

**How to test:**
- Press `Alt + P` to see performance stats
- Watch multiple videos to see caching in action
- Check console for: `[SponsorSkip Debug] Segments optimized`

**Expected behavior:**
- Cache size increases as you watch videos
- Segment processing shows "original vs optimized" counts
- Memory usage displayed in KB

---

### **3. Mute Option Instead of Skip**
**What to test:** Some segments get muted instead of skipped

**How to test:**
- Wait for preview popup (uncertain segments)
- Click "Mute" button in preview
- Check console for: `[SponsorSkip Debug] Enhanced action determined`

**Expected behavior:**
- Audio mutes during segment
- Orange notification: "🔇 Muted [category]"
- Audio restores after segment ends

---

### **4. Skip Preview Window**
**What to test:** Preview popup before skipping uncertain segments

**How to test:**
- Watch videos with sponsor segments
- Look for preview popup in top-right corner
- Try clicking "Skip", "Mute", or "Keep" buttons

**Expected behavior:**
- Preview shows segment category and duration
- 5-second countdown with progress bar
- Auto-skips if no choice made

---

### **5. Visual Progress Bar Markers**
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

---

### **6. Enhanced Notifications**
**What to test:** Better notifications with emojis and categories

**How to test:**
- Watch segments get skipped/muted
- Press `Alt + D` for detailed stats
- Try in mini-player mode

**Expected behavior:**
- Emojis for each category (💰 sponsors, 📢 self-promo)
- Different positions and styles
- Mini-player compatible notifications

---

### **7. Keyboard Shortcuts**
**What to test:** All keyboard controls work

**Shortcuts to test:**
- `Alt + S` - Toggle on/off
- `Alt + D` - Show detailed stats
- `Alt + M` - Show memory/learning stats  
- `Alt + P` - Show performance stats

**Expected behavior:**
- Each shortcut shows appropriate notification
- Console logs confirm actions

---

### **8. Cross-Device Sync**
**What to test:** Preferences sync across browser instances

**How to test:**
- Set up preferences in one browser
- Open same Google account in another browser
- Check if preferences transferred

**Expected behavior:**
- Auto-skip categories sync
- Learning preferences sync
- User actions may not sync (stored locally)

---

## 🔍 **Debug Console Commands**

Open DevTools Console and try these:

```javascript
// Check if services are loaded
window.sponsorSkipDebug = {
  memory: SegmentMemoryService.getInstance(),
  performance: PerformanceService.getInstance()
};

// Get current preferences
console.log(await window.sponsorSkipDebug.memory.getPreferences());

// Get cache stats
console.log(window.sponsorSkipDebug.performance.getCacheStats());
```

---

## 🎬 **Test Video Recommendations**

**Good test videos with sponsor segments:**
1. Tech review videos (usually have sponsors)
2. Gaming videos (often have self-promotion)
3. Tutorial videos (interaction reminders)

**Look for these in console:**
- `[SponsorSkip Debug] Enhanced Skipper created`
- `[SponsorSkip Debug] Segments loaded`
- `[SponsorSkip Debug] Enhanced action determined`

---

## ⚠️ **Troubleshooting**

**If features don't work:**

1. **Check console for errors**
   - Look for red error messages
   - Verify all services initialized

2. **Verify extension loaded**
   - See "Auto Skip" button in YouTube controls
   - Check chrome://extensions/ shows extension active

3. **Test on different videos**
   - Some videos may not have sponsor data
   - Try popular tech/gaming channels

4. **Clear extension data**
   - Go to chrome://extensions/
   - Click "Details" → "Extension options" → Clear data

---

## 📊 **Expected Console Output**

When working correctly, you should see:

```
[SponsorSkip Enhanced] Content script loaded with all new features.
[SponsorSkip Debug] Enhanced Skipper created {videoId: "abc123", segmentCount: 3}
[SponsorSkip Debug] Memory service initialized
[SponsorSkip Debug] Enhanced skipper service created
[SponsorSkip Debug] Progress bar visualizer initialized
[SponsorSkip Debug] Enhanced setup complete
```

---

## 🎯 **Success Criteria**

✅ **All features working if you see:**
- Colored segments on progress bar
- Enhanced notifications with emojis
- Keyboard shortcuts respond
- Console shows debug messages
- Preview popups appear for uncertain segments
- Stats show learning and performance data

**Ready to test? Build and load the extension, then follow this guide step by step!**

---

## 🚀 Quick Start Guide

### Step 1: Load the Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `dist/` folder from your project
5. The SponsorSkip extension should appear with a puzzle piece icon

### Step 2: Open the Control Panel
1. Click the SponsorSkip extension icon in the toolbar
2. The popup control panel will open
3. Verify the status shows "Active" with a green dot

### Step 3: Configure Settings
1. **Master Toggle**: Ensure "Enable Auto-Skip" is ON
2. **Categories**: Set your preferences:
   - Sponsors: Skip (recommended)
   - Self Promo: Skip (recommended)  
   - Interaction: Ignore (recommended)
   - Intro/Outro: Mute (recommended)
3. **Advanced Settings**: Click to expand and adjust:
   - Skip Confidence: 70% (default)
   - Preview Duration: 3s (default)

### Step 4: Test on YouTube
1. Go to any YouTube video with sponsor segments
2. The extension will automatically detect and process segments
3. Watch for:
   - Colored markers on progress bar
   - Skip/mute notifications
   - Real-time stats updates in popup

---

## 🎛️ Popup Control Panel Guide

### Main Dashboard
- **Status Indicator**: Green = Active, Red = Disabled
- **Stats Cards**: 
  - Segments Skipped (total)
  - Time Saved (minutes/seconds)
  - Current Video (segments found)

### Feature Controls
- **Enable Auto-Skip**: Master on/off switch
- **Smart Learning**: AI learns your preferences
- **Progress Bar Markers**: Colored segment indicators
- **Enhanced Notifications**: Rich notifications with emojis

### Category Management
Each segment type has three options:
- **Skip**: Automatically jump over segment
- **Mute**: Lower volume during segment
- **Ignore**: Play segment normally

### Advanced Settings
- **Skip Confidence Threshold**: How certain the AI must be (0-100%)
- **Preview Duration**: How long to show uncertain segments (1-10s)
- **Sync Across Devices**: Save settings to Chrome account

### Action Buttons
- **Reset Stats**: Clear all statistics
- **Clear Memory**: Delete learned preferences
- **Test Features**: Verify all functionality works

### Debug Mode (🐛 icon)
- **Extension Version**: Current version info
- **Current Tab**: Active tab status
- **Segments Detected**: Number found in current video
- **Memory Entries**: Stored preferences count
- **Performance Score**: System performance rating

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Alt + S` | Toggle Skip | Enable/disable auto-skipping |
| `Alt + D` | Show Stats | Display statistics overlay |
| `Alt + M` | Memory Info | Show learned preferences |
| `Alt + P` | Performance | Display performance metrics |

---

## 🧪 Feature Testing Checklist

### 1. Basic Functionality
- [ ] Extension loads without errors
- [ ] Popup opens and displays correctly
- [ ] Status indicator shows "Active"
- [ ] Master toggle works

### 2. Segment Detection
- [ ] Progress bar shows colored markers
- [ ] Segments appear in different colors by category
- [ ] Hover over markers shows tooltips
- [ ] Markers update when video changes

### 3. Auto-Skip Features
- [ ] Sponsor segments are skipped automatically
- [ ] Skip notifications appear with emojis
- [ ] Time saved counter increases
- [ ] Skip threshold setting affects behavior

### 4. Mute Functionality
- [ ] Muted segments lower volume
- [ ] Mute notifications show 🔇 icon
- [ ] Volume restores after segment
- [ ] Mute setting persists

### 5. Smart Learning
- [ ] Manual skip/unskip actions are remembered
- [ ] Preferences sync across videos
- [ ] Learning toggle affects behavior
- [ ] Memory entries increase in debug panel

### 6. Enhanced Notifications
- [ ] Category-specific emojis display
- [ ] Notifications stack properly
- [ ] Mini-player compatibility works
- [ ] Close button functions

### 7. Progress Bar Visualization
- [ ] Colored segments appear on progress bar
- [ ] Upcoming segments pulse/highlight
- [ ] Hover previews work
- [ ] Theater/fullscreen modes supported

### 8. Performance Optimizations
- [ ] Smooth video playback
- [ ] No lag during segment processing
- [ ] Memory usage stays reasonable
- [ ] CPU usage remains low

### 9. Cross-Device Sync
- [ ] Settings save to Chrome account
- [ ] Preferences sync between devices
- [ ] Sync toggle works correctly
- [ ] Local fallback when offline

### 10. Popup Integration
- [ ] Real-time stats update
- [ ] Settings changes apply immediately
- [ ] Test Features button works
- [ ] Debug mode shows accurate info

---

## 🔧 Troubleshooting

### Common Issues

#### Extension Not Loading
1. Check if extension is enabled in `chrome://extensions/`
2. Verify you're on a YouTube video page
3. Check browser console for error messages
4. Try refreshing the page

#### No Segments Detected
1. Verify internet connection (segments fetched from SponsorBlock API)
2. Try a different, more popular video
3. Check console for API error messages
4. Remember: only sponsor segments are detected now

#### Popup Not Opening
1. Check if extension icon is visible in toolbar
2. Try right-clicking icon and selecting "Open popup"
3. Disable other extensions that might conflict
4. Restart Chrome if necessary

#### Skipping Not Working
1. Verify Master Toggle is enabled
2. Check sponsor action is set to "Skip"
3. Ensure video has sponsor segments
4. Check console for error messages

### CSS Issues
If popup styling appears broken:
1. Check browser console for CSS errors
2. Verify all CSS files are loaded correctly
3. Try disabling other extensions
4. Clear browser cache and reload

## Expected Behavior

### On Video Load
- Extension detects video ID
- Fetches segments from multiple sources
- Displays colored markers on progress bar
- Shows segment count in popup

### During Playback
- Monitors video time continuously
- Shows countdown before skipping (3s warning)
- Executes skip/mute actions based on settings
- Updates statistics in real-time
- Learns from user manual actions

### On Settings Change
- Applies changes immediately to current video
- Saves preferences to Chrome storage
- Updates UI to reflect new settings
- Syncs across devices if enabled

---

## 🎯 Success Criteria

Your extension is working correctly if you see:
- ✅ Colored segments on progress bar
- ✅ Enhanced notifications with emojis  
- ✅ Keyboard shortcuts respond
- ✅ Console shows debug messages
- ✅ Preview popups appear for uncertain segments
- ✅ Stats show learning and performance data
- ✅ Popup control panel functions fully
- ✅ Real-time synchronization between popup and content

**Extension fully functional and ready for production use!**
