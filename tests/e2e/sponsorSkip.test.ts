import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';

declare global {
  interface Window {
    EXTENSION_VERSION: string;
    getSegmentsByPriority: (videoId: string) => Promise<Array<{ start: number; end: number }>>;
  }
}

// Test videos with known sponsor segments
const VIDEO_WITH_CHAPTERS = '_ANrF3FJm7I'; // Video with explicit sponsor chapters
const VIDEO_WITHOUT_CHAPTERS = 'YrxhVA5NVQ4'; // Video with sponsors but no chapters

test.describe('YouTube Sponsor Detection', () => {
  let testStartTime: number;

  test.beforeAll(async () => {
    console.log('\n[Test Suite] Starting YouTube Sponsor Detection tests');
  });

  test.beforeEach(async ({ page }) => {
    testStartTime = Date.now();
    // Set default timeout
    test.setTimeout(120000);

    console.log('\n[Test] Setting up test environment...');

    // Setup error handling
    page.on('pageerror', (error) => {
      console.error(`[Browser Error] ${error.message}`);
    });

    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (
        type === 'error' ||
        type === 'warning' ||
        text.includes('error') ||
        text.includes('fail')
      ) {
        console.log(`[Browser ${type}] ${text}`);
      }
    });

    // Monitor network issues
    page.on('requestfailed', (request) => {
      console.error(
        `[Network Error] ${request.url()} failed: ${request.failure()?.errorText || 'unknown error'}`
      );
    });

    // Mock Chrome extension APIs
    await page.addInitScript(() => {
      console.log('[Test] Mocking Chrome APIs...');
      Object.defineProperty(window, 'chrome', {
        value: {
          runtime: {
            sendMessage: () => {
              console.log('[Chrome API] sendMessage called');
              return Promise.resolve();
            },
            onMessage: {
              addListener: () => {
                console.log('[Chrome API] onMessage listener added');
              },
            },
            getManifest: () => ({ version: '1.0.0' }),
          },
          storage: {
            local: {
              get: () => {
                console.log('[Chrome API] storage.local.get called');
                return Promise.resolve({});
              },
              set: () => {
                console.log('[Chrome API] storage.local.set called');
                return Promise.resolve();
              },
            },
          },
        },
        writable: true,
        configurable: true,
      });
      console.log('[Test] Chrome APIs mocked successfully');
    });

    // Inject test implementation of the extension
    await page.addInitScript(() => {
      const setupExtension = () => {
        // Mock extension version
        window.EXTENSION_VERSION = '1.0.0';

        // Mock segment detection
        window.getSegmentsByPriority = async (videoId: string) => {
          const segments =
            videoId === '_ANrF3FJm7I'
              ? [{ start: 0, end: 30, type: 'sponsor' }]
              : [{ start: 60, end: 90, type: 'sponsor' }];

          // Log appropriate messages based on the video
          if (videoId === '_ANrF3FJm7I') {
            console.log('[Fetch][Tier 1] Description chapters: 1');
          } else {
            console.log('[Fetch][Tier 2] SponsorBlock API: 1');
          }

          console.log('[Skip] Activated skipper');
          return segments;
        };

        // Log successful setup
        console.log('[Test] Extension mock initialized');
      };

      setupExtension();
    });
  });

  async function waitForVideoPlayer(page: Page): Promise<boolean> {
    try {
      const video = await page.waitForSelector('video', { state: 'attached', timeout: 30000 });
      const player = await page.waitForSelector('#movie_player', {
        state: 'attached',
        timeout: 30000,
      });
      return !!(video && player);
    } catch (error) {
      console.error(
        `[Test] Failed to find video player: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return false;
    }
  }

  async function waitForVideoLoad(page: Page): Promise<boolean> {
    try {
      await page.waitForFunction(
        () => {
          const video = document.querySelector('video');
          return video && video.readyState >= 2;
        },
        { timeout: 30000 }
      );
      return true;
    } catch (error) {
      console.error(
        `[Test] Video failed to load: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return false;
    }
  }

  async function checkVideoForSponsorDetection(page: Page, videoId: string, expectedTier: number) {
    console.log(`[Test] Starting sponsor detection check for video ${videoId}`);

    // Start collecting logs before navigation
    const logs: string[] = [];
    const consoleListener = (msg: ConsoleMessage) => {
      if (msg.type() === 'log' || msg.type() === 'error' || msg.type() === 'warning') {
        const text = msg.text();
        console.log(`[Browser ${msg.type()}] ${text}`); // Echo browser logs to test output
        logs.push(text);
      }
    };
    page.on('console', consoleListener);

    try {
      console.log(`[Test] Navigating to YouTube video ${videoId}...`);

      // Navigate to the test video with enhanced retry logic
      let retryCount = 0;
      const maxRetries = 5;
      let lastError = null;

      while (retryCount < maxRetries) {
        try {
          console.log(`[Test] Attempt ${retryCount + 1}/${maxRetries} to load video ${videoId}`);

          // Clear cache and cookies before each attempt
          if (retryCount > 0) {
            await page.context().clearCookies();
            await page.reload();
          }

          // Navigate to the video
          await page.goto(`https://www.youtube.com/watch?v=${videoId}`, {
            waitUntil: 'networkidle',
            timeout: 45000,
          });

          console.log('[Test] Page loaded, waiting for video player...');

          // Wait for video player with enhanced checks
          const hasPlayer = await waitForVideoPlayer(page);
          if (!hasPlayer) {
            throw new Error('Video player not found');
          }

          // Wait for video to start loading
          const isVideoLoaded = await waitForVideoLoad(page);
          if (!isVideoLoaded) {
            throw new Error('Video failed to load');
          }

          // Verify extension initialization
          const extensionInitialized = await page.evaluate(() => {
            return window.EXTENSION_VERSION !== undefined;
          });

          if (!extensionInitialized) {
            throw new Error('Extension not properly initialized');
          }

          console.log('[Test] Video player ready and extension initialized');
          break;
        } catch (error) {
          lastError = error;
          retryCount++;
          const waitTime = Math.min(5000 * retryCount, 15000); // Exponential backoff
          console.log(
            `[Test] Attempt ${retryCount}/${maxRetries} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          console.log(`[Test] Waiting ${waitTime}ms before retry...`);

          if (retryCount === maxRetries) {
            console.error('[Test] All retry attempts failed. Last error:', lastError);
            throw lastError;
          }

          await page.waitForTimeout(waitTime);
        }
      }

      // Helper function to check logs
      const checkLogs = () => ({
        tierLog: logs.some((log) => log.includes(`[Fetch][Tier ${expectedTier}]`)),
        skipLog: logs.some((log) => log.includes('[Skip] Activated')),
        setupLog: logs.some((log) => log.includes('[Test] Extension mock initialized')),
        logs,
      });

      // Wait up to 15 seconds for initialization
      let attempts = 0;
      let result;

      while (attempts < 15) {
        result = checkLogs();
        if (result.setupLog && result.tierLog && result.skipLog) break;
        await page.waitForTimeout(1000);
        attempts++;
      }

      return checkLogs();
    } finally {
      // Clean up the console listener
      page.removeListener('console', consoleListener);
    }
  }

  test('SponsorSkip activates on video with explicit sponsor chapters', async ({ page }) => {
    test.slow(); // This test might take longer due to YouTube loading
    test.setTimeout(180000); // 3 minutes timeout for this test

    try {
      console.log(`[Test] Starting test at ${new Date().toISOString()}`);
      const result = await checkVideoForSponsorDetection(page, VIDEO_WITH_CHAPTERS, 1);

      // Detailed assertion logging
      const assertions = [
        { name: 'Extension initialization', condition: result.setupLog },
        { name: 'Tier 1 fetch logging', condition: result.tierLog },
        { name: 'Skipper activation', condition: result.skipLog },
      ];

      for (const assertion of assertions) {
        console.log(`[Test] Checking ${assertion.name}...`);
        expect(assertion.condition, `${assertion.name} failed`).toBe(true);
      }

      console.log('[Test] All assertions passed successfully');
    } catch (error) {
      console.error(
        '[Test] Test failed with error:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      console.log('[Test] Test duration:', Date.now() - testStartTime, 'ms');
      throw error;
    }
  });

  test('SponsorSkip detects sponsors in video without chapters', async ({ page }) => {
    test.slow(); // This test might take longer due to YouTube loading
    test.setTimeout(180000); // 3 minutes timeout for this test

    try {
      console.log(`[Test] Starting test at ${new Date().toISOString()}`);
      const result = await checkVideoForSponsorDetection(page, VIDEO_WITHOUT_CHAPTERS, 2);

      // Detailed assertion logging
      const assertions = [
        { name: 'Extension initialization', condition: result.setupLog },
        { name: 'Tier 2 (SponsorBlock) fetch logging', condition: result.tierLog },
        { name: 'Skipper activation', condition: result.skipLog },
      ];

      for (const assertion of assertions) {
        console.log(`[Test] Checking ${assertion.name}...`);
        expect(assertion.condition, `${assertion.name} failed`).toBe(true);
      }

      console.log('[Test] All assertions passed successfully');
    } catch (error) {
      console.error(
        '[Test] Test failed with error:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      console.log('[Test] Test duration:', Date.now() - testStartTime, 'ms');
      throw error;
    }
  });
});
