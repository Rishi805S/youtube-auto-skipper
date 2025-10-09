import type { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './tests/e2e',
  timeout: 180000,
  retries: 3,
  use: {
    headless: false, // Changed to non-headless to avoid YouTube's anti-bot detection
    viewport: { width: 1280, height: 720 },
    video: 'retain-on-failure',
    trace: 'on',
    actionTimeout: 60000,
    navigationTimeout: 60000,
    contextOptions: {
      ignoreHTTPSErrors: true,
    },
    // Add user agent to appear more like a regular browser
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
    launchOptions: {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--enable-automation',
        '--allow-running-insecure-content',
        '--autoplay-policy=no-user-gesture-required',
        '--window-size=1280,720',
        '--mute-audio',
      ],
      firefoxUserPrefs: {
        'media.autoplay.default': 0,
        'media.autoplay.enabled': true,
      },
    },
    // Add permissions to allow video autoplay
    permissions: ['autoplay'],
  },
  expect: {
    timeout: 10000,
  },
  workers: 1, // Run tests sequentially
  projects: [
    {
      name: 'Chrome',
      use: {
        channel: 'chrome',
        permissions: ['clipboard-read', 'clipboard-write'],
      },
    },
  ],
  reporter: [['list'], ['html']],
  fullyParallel: false,
};

export default config;
