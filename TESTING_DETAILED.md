# Testing Guide

Comprehensive testing documentation with code examples, patterns, and best practices for youtube-auto-skipper.

## Table of Contents

1. [Testing Overview](#testing-overview)
2. [Unit Testing](#unit-testing)
3. [End-to-End Testing](#end-to-end-testing)
4. [Manual Testing](#manual-testing)
5. [Test Coverage](#test-coverage)
6. [Testing Best Practices](#testing-best-practices)
7. [Continuous Integration](#continuous-integration)

---

## Testing Overview

### Test Stack

| Type | Framework | Purpose | Speed |
|------|-----------|---------|-------|
| **Unit Tests** | Jest | Test individual functions | Fast (~2s) |
| **E2E Tests** | Playwright | Test full extension in browser | Slow (~30s) |
| **Manual Tests** | Human QA | Verify user experience | Variable |

### Test Organization

```
tests/
├── unit/                      # Unit tests (Jest)
│   ├── tieredFetcher.test.ts
│   ├── UIInjector.test.ts
│   ├── ProgressBarVisualizer.test.ts
│   ├── NotificationService.test.ts
│   └── simple-skipper.test.ts
└── e2e/                       # End-to-end tests (Playwright)
    └── sponsorSkip.test.ts
```

### Running Tests

```bash
# Run all unit tests
npm test

# Watch mode (re-run on file change)
npm run test:watch

# Run E2E tests
npm run test:e2e

# Run specific test file
npm test -- tieredFetcher.test.ts

# Run with coverage
npm test -- --coverage
```

---

## Unit Testing

### Setup

**Configuration:** `jest.config.mjs`
```javascript
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',  // Simulates browser DOM
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/types/**'
  ]
};
```

### Mocking Chrome APIs

#### Pattern 1: Mock chrome.storage

```typescript
// At top of test file
const mockChromeStorage = {
  sync: {
    get: jest.fn((keys, callback) => {
      callback({ 'skipper-enabled': true });
    }),
    set: jest.fn((data, callback) => {
      callback?.();
    })
  }
};

global.chrome = {
  storage: mockChromeStorage
} as any;
```

#### Pattern 2: Mock chrome.runtime

```typescript
global.chrome = {
  runtime: {
    sendMessage: jest.fn((message, callback) => {
      callback?.({ success: true });
      return Promise.resolve();
    }),
    onMessage: {
      addListener: jest.fn()
    }
  }
} as any;
```

### Example Test: TieredFetcher

**File:** `tests/unit/tieredFetcher.test.ts`

```typescript
import { getSegmentsByPriority } from '../../src/engine/tieredFetcher';
import * as chapterScraper from '../../src/pipeline/chapterScraper';
import * as sponsorBlock from '../../src/api/SponsorBlockClient';
import * as transcriptParser from '../../src/pipeline/transcriptParser';
import * as normalizer from '../../src/engine/normalizeSegments';

describe('getSegmentsByPriority', () => {
  const videoId = 'test123';

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original implementations
    jest.restoreAllMocks();
  });

  describe('Tier 1: Description Chapters', () => {
    it('returns normalized chapters if available', async () => {
      // Arrange: Mock chapter scraper to return segments
      const mockChapters = [{ start: 0, end: 10 }];
      jest.spyOn(chapterScraper, 'scrapeChapterSegments')
        .mockResolvedValue(mockChapters);
      
      jest.spyOn(normalizer, 'normalizeSegments')
        .mockReturnValue([{ start: 0, end: 10 }]);

      // Act: Call function
      const segments = await getSegmentsByPriority(videoId);

      // Assert: Verify result
      expect(segments).toEqual([{ start: 0, end: 10 }]);
      expect(chapterScraper.scrapeChapterSegments).toHaveBeenCalledTimes(1);
      expect(normalizer.normalizeSegments).toHaveBeenCalledWith(mockChapters);
      
      // Verify Tier 2 and 3 were NOT called (short-circuit)
      expect(sponsorBlock.fetchSponsorBlockSegments).not.toHaveBeenCalled();
    });

    it('falls through to Tier 2 when no chapters found', async () => {
      // Arrange: Tier 1 returns empty
      jest.spyOn(chapterScraper, 'scrapeChapterSegments')
        .mockResolvedValue([]);
      
      jest.spyOn(sponsorBlock, 'fetchSponsorBlockSegments')
        .mockResolvedValue([{ start: 10, end: 20 }]);
      
      jest.spyOn(normalizer, 'normalizeSegments')
        .mockReturnValue([{ start: 10, end: 20 }]);

      // Act
      const segments = await getSegmentsByPriority(videoId);

      // Assert
      expect(segments).toEqual([{ start: 10, end: 20 }]);
      expect(chapterScraper.scrapeChapterSegments).toHaveBeenCalled();
      expect(sponsorBlock.fetchSponsorBlockSegments).toHaveBeenCalledWith(videoId);
    });
  });

  describe('Tier 2: SponsorBlock API', () => {
    it('returns normalized SponsorBlock segments if chapters unavailable', async () => {
      // Arrange
      jest.spyOn(chapterScraper, 'scrapeChapterSegments')
        .mockResolvedValue([]);
      
      const mockSegments = [{ start: 10, end: 20, category: 'sponsor' }];
      jest.spyOn(sponsorBlock, 'fetchSponsorBlockSegments')
        .mockResolvedValue(mockSegments);
      
      jest.spyOn(normalizer, 'normalizeSegments')
        .mockReturnValue(mockSegments);

      // Act
      const segments = await getSegmentsByPriority(videoId);

      // Assert
      expect(segments).toEqual(mockSegments);
      expect(sponsorBlock.fetchSponsorBlockSegments).toHaveBeenCalledWith(videoId);
    });
  });

  describe('Tier 3: Transcript Analysis', () => {
    it('returns normalized transcript segments if others unavailable', async () => {
      // Arrange: Tier 1 and 2 fail
      jest.spyOn(chapterScraper, 'scrapeChapterSegments')
        .mockResolvedValue([]);
      
      jest.spyOn(sponsorBlock, 'fetchSponsorBlockSegments')
        .mockResolvedValue([]);
      
      const mockTranscript = [{ start: 20, end: 30 }];
      jest.spyOn(transcriptParser, 'parseTranscriptSegments')
        .mockResolvedValue(mockTranscript);
      
      jest.spyOn(normalizer, 'normalizeSegments')
        .mockReturnValue(mockTranscript);

      // Act
      const segments = await getSegmentsByPriority(videoId);

      // Assert
      expect(segments).toEqual(mockTranscript);
      expect(transcriptParser.parseTranscriptSegments).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('returns empty array if all sources fail', async () => {
      // Arrange: All tiers throw errors
      jest.spyOn(chapterScraper, 'scrapeChapterSegments')
        .mockRejectedValue(new Error('Chapter scraping failed'));

      // Act
      const segments = await getSegmentsByPriority(videoId);

      // Assert: Should gracefully return empty array
      expect(segments).toEqual([]);
    });

    it('logs error when fetch fails', async () => {
      // Arrange
      const consoleErrorSpy = jest.spyOn(console, 'error')
        .mockImplementation();
      
      jest.spyOn(chapterScraper, 'scrapeChapterSegments')
        .mockRejectedValue(new Error('Network error'));

      // Act
      await getSegmentsByPriority(videoId);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Fetch] Error'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
```

### Example Test: Async Functions

**Testing API calls:**

```typescript
import { fetchSponsorBlockSegments } from '../../src/api/SponsorBlockClient';

describe('SponsorBlockClient', () => {
  beforeEach(() => {
    // Reset fetch mock
    global.fetch = jest.fn();
  });

  it('fetches and filters sponsor segments', async () => {
    // Arrange: Mock successful API response
    const mockResponse = [
      { category: 'sponsor', segment: [10, 20] },
      { category: 'intro', segment: [0, 5] },     // Should be filtered out
      { category: 'sponsor', segment: [30, 40] }
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    // Act
    const segments = await fetchSponsorBlockSegments('test123');

    // Assert
    expect(segments).toHaveLength(2);
    expect(segments).toEqual([
      { start: 10, end: 20, category: 'sponsor' },
      { start: 30, end: 40, category: 'sponsor' }
    ]);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://sponsor.ajay.app/api/skipSegments?videoID=test123'
    );
  });

  it('returns empty array on 404', async () => {
    // Arrange: Mock 404 response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404
    });

    // Act
    const segments = await fetchSponsorBlockSegments('nonexistent');

    // Assert
    expect(segments).toEqual([]);
  });

  it('returns empty array on network error', async () => {
    // Arrange: Mock network failure
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    // Act
    const segments = await fetchSponsorBlockSegments('test123');

    // Assert
    expect(segments).toEqual([]);
  });
});
```

### Example Test: DOM Manipulation

**Testing UI components:**

```typescript
import { NotificationManager } from '../../src/ui/NotificationManager';

describe('NotificationManager', () => {
  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = '';
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('creates and displays toast notification', () => {
    // Act
    NotificationManager.show('Test message');

    // Assert: Toast exists in DOM
    const toasts = document.querySelectorAll('.sponsorskip-toast');
    expect(toasts).toHaveLength(1);
    expect(toasts[0].textContent).toBe('Test message');
  });

  it('removes toast after timeout', () => {
    // Act
    NotificationManager.show('Test message');

    // Assert: Toast exists initially
    expect(document.querySelectorAll('.sponsorskip-toast')).toHaveLength(1);

    // Fast-forward time
    jest.advanceTimersByTime(3000);

    // Assert: Toast removed
    expect(document.querySelectorAll('.sponsorskip-toast')).toHaveLength(0);
  });

  it('allows multiple toasts simultaneously', () => {
    // Act
    NotificationManager.show('Message 1');
    NotificationManager.show('Message 2');
    NotificationManager.show('Message 3');

    // Assert
    const toasts = document.querySelectorAll('.sponsorskip-toast');
    expect(toasts).toHaveLength(3);
  });
});
```

### Mocking Complex Dependencies

**Testing with VideoManager singleton:**

```typescript
import { VideoManager } from '../../src/utils/VideoManager';

describe('Feature using VideoManager', () => {
  let mockVideo: HTMLVideoElement;
  let videoManager: VideoManager;

  beforeEach(() => {
    // Create mock video element
    mockVideo = document.createElement('video');
    mockVideo.duration = 300; // 5 minutes
    mockVideo.currentTime = 0;
    document.body.appendChild(mockVideo);

    // Get VideoManager instance
    videoManager = VideoManager.getInstance();
  });

  afterEach(() => {
    document.body.removeChild(mockVideo);
  });

  it('gets video duration correctly', () => {
    // Act
    const duration = videoManager.getDuration();

    // Assert
    expect(duration).toBe(300);
  });

  it('skips to specified time', () => {
    // Act
    const video = videoManager.getVideo();
    if (video) video.currentTime = 90;

    // Assert
    expect(videoManager.getCurrentTime()).toBe(90);
  });
});
```

---

## End-to-End Testing

### Setup

**Configuration:** `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120000,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
```

### Example E2E Test

**File:** `tests/e2e/sponsorSkip.test.ts`

```typescript
import { test, expect, type Page } from '@playwright/test';

// Test video IDs
const VIDEO_WITH_CHAPTERS = '_ANrF3FJm7I';
const VIDEO_WITHOUT_CHAPTERS = 'YrxhVA5NVQ4';

test.describe('YouTube Sponsor Detection', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Chrome APIs
    await page.addInitScript(() => {
      Object.defineProperty(window, 'chrome', {
        value: {
          runtime: {
            sendMessage: () => Promise.resolve(),
            onMessage: { addListener: () => {} },
            getManifest: () => ({ version: '1.0.0' })
          },
          storage: {
            sync: {
              get: () => Promise.resolve({
                'skipper-enabled': true,
                'skipper-action': 'skip',
                'skipper-ads': true
              }),
              set: () => Promise.resolve()
            }
          }
        },
        writable: true,
        configurable: true
      });
    });

    // Mock extension functions
    await page.addInitScript(() => {
      (window as any).getSegmentsByPriority = async (videoId: string) => {
        return videoId === '_ANrF3FJm7I'
          ? [{ start: 0, end: 30, category: 'sponsor' }]
          : [{ start: 60, end: 90, category: 'sponsor' }];
      };
    });
  });

  test('loads YouTube page successfully', async ({ page }) => {
    // Act
    await page.goto('https://www.youtube.com');

    // Assert
    await expect(page).toHaveTitle(/YouTube/);
    await expect(page.locator('#search')).toBeVisible();
  });

  test('detects video ID from URL', async ({ page }) => {
    // Act
    await page.goto(`https://www.youtube.com/watch?v=${VIDEO_WITH_CHAPTERS}`);
    await page.waitForSelector('video', { state: 'attached' });

    // Assert
    const videoId = await page.evaluate(() => {
      const match = window.location.href.match(/[?&]v=([^&]+)/);
      return match ? match[1] : null;
    });

    expect(videoId).toBe(VIDEO_WITH_CHAPTERS);
  });

  test('extension initializes on video page', async ({ page }) => {
    // Collect console logs
    const logs: string[] = [];
    page.on('console', msg => logs.push(msg.text()));

    // Act
    await page.goto(`https://www.youtube.com/watch?v=${VIDEO_WITH_CHAPTERS}`);
    await page.waitForSelector('video', { state: 'attached' });
    await page.waitForTimeout(2000); // Wait for extension init

    // Assert
    const hasInitLog = logs.some(log => 
      log.includes('[SponsorSkip]') || log.includes('[Skip]')
    );
    expect(hasInitLog).toBeTruthy();
  });

  test('detects segments via Tier 1 (chapters)', async ({ page }) => {
    // Collect logs
    const logs: string[] = [];
    page.on('console', msg => logs.push(msg.text()));

    // Act
    await page.goto(`https://www.youtube.com/watch?v=${VIDEO_WITH_CHAPTERS}`);
    await page.waitForSelector('video', { state: 'attached' });
    await page.waitForTimeout(3000);

    // Assert
    const hasTier1Log = logs.some(log => log.includes('[Fetch][Tier 1]'));
    expect(hasTier1Log).toBeTruthy();
  });

  test('renders progress bar markers', async ({ page }) => {
    // Act
    await page.goto(`https://www.youtube.com/watch?v=${VIDEO_WITH_CHAPTERS}`);
    await page.waitForSelector('video', { state: 'attached' });
    await page.waitForTimeout(3000);

    // Assert: Check for marker elements
    const markers = await page.locator('.sponsorskip-marker').count();
    expect(markers).toBeGreaterThan(0);
  });

  test('keyboard shortcut Alt+H shows help', async ({ page }) => {
    // Setup
    await page.goto(`https://www.youtube.com/watch?v=${VIDEO_WITH_CHAPTERS}`);
    await page.waitForSelector('video', { state: 'attached' });

    // Act: Press Alt+H
    await page.keyboard.press('Alt+H');
    await page.waitForTimeout(500);

    // Assert: Toast notification appears
    const toast = await page.locator('.sponsorskip-toast').first();
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Alt+');
  });
});
```

### E2E Test Patterns

#### Pattern 1: Wait for Elements

```typescript
// Wait for video player
await page.waitForSelector('video', { 
  state: 'attached', 
  timeout: 30000 
});

// Wait for video to load
await page.waitForFunction(() => {
  const video = document.querySelector('video');
  return video && video.readyState >= 2; // HAVE_CURRENT_DATA
}, { timeout: 30000 });
```

#### Pattern 2: Collect Logs

```typescript
const logs: string[] = [];
page.on('console', msg => {
  if (msg.type() === 'log' || msg.type() === 'error') {
    logs.push(msg.text());
  }
});

// Later: Assert on logs
expect(logs).toContain('[SponsorSkip] Segments loaded: 2');
```

#### Pattern 3: Simulate User Actions

```typescript
// Click element
await page.click('.ytp-play-button');

// Type in search box
await page.fill('#search', 'test video');
await page.press('#search', 'Enter');

// Keyboard shortcuts
await page.keyboard.press('Alt+S');
```

#### Pattern 4: Take Screenshots

```typescript
test('visual test', async ({ page }) => {
  await page.goto('https://www.youtube.com/watch?v=test123');
  await page.waitForSelector('video');
  
  // Take screenshot
  await page.screenshot({ 
    path: 'screenshots/video-page.png',
    fullPage: true
  });
  
  // Compare with baseline (requires pixel-match setup)
  // expect(await page.screenshot()).toMatchSnapshot('video-page.png');
});
```

---

## Manual Testing

### Pre-Release Checklist

#### Functional Tests

```
✓ Extension Installation
  [ ] Loads without errors
  [ ] Icon appears in toolbar
  [ ] Popup opens correctly

✓ Video Detection
  [ ] Detects video ID on page load
  [ ] Detects video ID on SPA navigation
  [ ] Handles multiple rapid video changes

✓ Segment Detection
  [ ] Tier 1: Finds description chapters
  [ ] Tier 2: Fetches SponsorBlock data
  [ ] Tier 3: Analyzes transcript
  [ ] Displays correct number of segments

✓ Skip Actions
  [ ] Skip mode: Jumps to end of segment
  [ ] Mute mode: Mutes during segment
  [ ] Watch mode: Shows notification only
  [ ] Respects cooldown period (3 seconds)

✓ Ad Skipping
  [ ] Clicks "Skip Ad" button
  [ ] Fast-forwards unskippable ads
  [ ] Detects ad state correctly
  [ ] Respects ad skip toggle setting

✓ Keyboard Shortcuts
  [ ] Alt+S toggles extension
  [ ] Alt+1/2/3 changes action
  [ ] Alt+A toggles ad skipping
  [ ] Alt+H shows help
  [ ] Alt+D shows stats

✓ UI Elements
  [ ] Progress bar markers appear
  [ ] Toast notifications show/hide
  [ ] Popup displays correct state
  [ ] Icons render correctly

✓ Settings Persistence
  [ ] Settings save on change
  [ ] Settings persist across sessions
  [ ] Settings sync across devices (if chrome.storage.sync)
```

#### Edge Case Tests

```
✓ Video Types
  [ ] Standard videos
  [ ] Live streams
  [ ] Premieres
  [ ] Videos with ads
  [ ] Age-restricted videos
  [ ] Private/unlisted videos

✓ Segment Scenarios
  [ ] No segments (normal video)
  [ ] Single segment
  [ ] Multiple segments
  [ ] Overlapping segments (should merge)
  [ ] Segments at video start
  [ ] Segments at video end

✓ Navigation
  [ ] Direct URL navigation
  [ ] Search → Video
  [ ] Recommended video click
  [ ] Playlist navigation
  [ ] Browser back/forward buttons

✓ Performance
  [ ] No lag during playback
  [ ] Low CPU usage (<5%)
  [ ] Low memory usage (<50MB)
  [ ] No memory leaks over time
```

### Test Video Database

| Video ID | Scenario | Expected Behavior |
|----------|----------|-------------------|
| `dQw4w9WgXcQ` | Popular video | SponsorBlock segments |
| `_ANrF3FJm7I` | Has chapters | Tier 1 detection |
| `YrxhVA5NVQ4` | No chapters | Tier 2/3 detection |
| `jNQXAC9IVRw` | No segments | No skipping |
| (search for specific videos) | Live stream | Should not crash |
| (search for specific videos) | Age-restricted | Should work after sign-in |

### Regression Testing

After making changes, test these critical paths:

1. **Basic Skip Flow**
   - Load video with segments
   - Verify segments detected
   - Play video through segment
   - Verify skip occurs

2. **Settings Change Flow**
   - Open popup
   - Change action to "Mute"
   - Play video through segment
   - Verify mute occurs (not skip)

3. **Ad Skip Flow**
   - Find video with ads
   - Enable ad skipping
   - Play video
   - Verify ad skips immediately

4. **SPA Navigation Flow**
   - Load first video
   - Click related video
   - Verify extension re-initializes
   - Verify new segments loaded

---

## Test Coverage

### Measure Coverage

```bash
npm test -- --coverage
```

**Output:**
```
--------------------------|---------|----------|---------|---------|-------------------
File                      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
--------------------------|---------|----------|---------|---------|-------------------
All files                 |   85.2  |   78.5   |   90.1  |   84.8  |
 engine/                  |   92.3  |   85.7   |   100   |   91.9  |
  tieredFetcher.ts        |   95.0  |   87.5   |   100   |   94.7  | 30-32
  normalizeSegments.ts    |   89.5  |   83.3   |   100   |   88.9  | 18-20
 api/                     |   88.9  |   75.0   |   100   |   87.5  |
  SponsorBlockClient.ts   |   88.9  |   75.0   |   100   |   87.5  | 16-18
 features/                |   78.6  |   70.0   |   85.7  |   77.8  |
  adSkipper.ts            |   75.0  |   66.7   |   80.0  |   73.3  | 45-60
  InputHandler.ts         |   82.1  |   73.3   |   91.4  |   81.5  | 65-70
--------------------------|---------|----------|---------|---------|-------------------
```

### Coverage Goals

| Component | Current | Target | Priority |
|-----------|---------|--------|----------|
| **Engine** | 92% | 95% | High |
| **API** | 89% | 90% | Medium |
| **Features** | 79% | 85% | High |
| **UI** | 70% | 80% | Medium |
| **Utils** | 88% | 90% | Low |

### Improving Coverage

**Identify untested lines:**
```bash
npm test -- --coverage --coverageReporters=html
# Open: coverage/index.html
```

**Write tests for uncovered branches:**
```typescript
// Before: Only happy path tested
it('fetches segments', async () => {
  const segments = await fetchSponsorBlockSegments('test123');
  expect(segments).toBeDefined();
});

// After: Test error branches too
it('handles network error', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
  const segments = await fetchSponsorBlockSegments('test123');
  expect(segments).toEqual([]);
});

it('handles invalid JSON', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.reject(new Error('Invalid JSON'))
  });
  const segments = await fetchSponsorBlockSegments('test123');
  expect(segments).toEqual([]);
});
```

---

## Testing Best Practices

### 1. Arrange-Act-Assert Pattern

```typescript
it('normalizes overlapping segments', () => {
  // Arrange: Setup test data
  const segments = [
    { start: 10, end: 20 },
    { start: 18, end: 25 }
  ];

  // Act: Execute function
  const result = normalizeSegments(segments);

  // Assert: Verify outcome
  expect(result).toHaveLength(1);
  expect(result[0]).toEqual({ start: 10, end: 25 });
});
```

### 2. Test One Thing Per Test

```typescript
// ❌ Bad: Tests multiple behaviors
it('fetches and processes segments', async () => {
  const segments = await getSegmentsByPriority('test123');
  expect(segments).toBeDefined();
  expect(segments.length).toBeGreaterThan(0);
  expect(segments[0].start).toBeLessThan(segments[0].end);
});

// ✅ Good: Separate tests
it('returns array of segments', async () => {
  const segments = await getSegmentsByPriority('test123');
  expect(segments).toBeInstanceOf(Array);
});

it('returns non-empty array when segments exist', async () => {
  const segments = await getSegmentsByPriority('test123');
  expect(segments.length).toBeGreaterThan(0);
});

it('segments have valid time ranges', async () => {
  const segments = await getSegmentsByPriority('test123');
  segments.forEach(seg => {
    expect(seg.start).toBeLessThan(seg.end);
  });
});
```

### 3. Use Descriptive Test Names

```typescript
// ❌ Bad: Vague names
it('works', () => { ... });
it('test1', () => { ... });
it('should return value', () => { ... });

// ✅ Good: Descriptive names
it('returns normalized chapters when available', () => { ... });
it('falls back to Tier 2 when Tier 1 returns empty', () => { ... });
it('returns empty array when all tiers fail', () => { ... });
```

### 4. Mock External Dependencies

```typescript
// ❌ Bad: Real network calls in tests
it('fetches from SponsorBlock', async () => {
  const segments = await fetchSponsorBlockSegments('test123');
  // This makes real HTTP request (slow, unreliable)
});

// ✅ Good: Mock fetch
it('fetches from SponsorBlock', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => [{ category: 'sponsor', segment: [10, 20] }]
  });
  
  const segments = await fetchSponsorBlockSegments('test123');
  expect(segments).toHaveLength(1);
});
```

### 5. Clean Up After Tests

```typescript
describe('Feature tests', () => {
  let originalFetch: typeof fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});
```

### 6. Test Error Cases

```typescript
describe('Error handling', () => {
  it('handles network timeout', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Timeout'));
    const segments = await fetchSponsorBlockSegments('test123');
    expect(segments).toEqual([]);
  });

  it('handles invalid video ID', async () => {
    const segments = await fetchSponsorBlockSegments('');
    expect(segments).toEqual([]);
  });

  it('handles malformed API response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => null // Invalid response
    });
    const segments = await fetchSponsorBlockSegments('test123');
    expect(segments).toEqual([]);
  });
});
```

---

## Continuous Integration

### GitHub Actions Workflow

**File:** `.github/workflows/test.yml`

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run type check
        run: npm run build:ts
      
      - name: Run unit tests
        run: npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload E2E artifacts
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### Pre-Commit Hooks

**Using Husky:**

```bash
npm install --save-dev husky
npx husky init
```

**File:** `.husky/pre-commit`

```bash
#!/bin/sh
npm run lint
npm run format-check
npm test
```

---

**Last Updated:** 2024
**Version:** 1.0.0
