export const CONFIG = {
  SELECTORS: {
    VIDEO: 'video',
    PLAYER: '#movie_player',
    AD_SKIP_BUTTON: [
      '.ytp-skip-ad-button',
      '.ytp-skip-ad-button__text',
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-modest',
      '.ytp-ad-skip-button-container button',
      'button[aria-label*="Skip"]',
      'button[aria-label*="skip"]',
      '.ytp-ad-skip-button-slot button',
      '[data-tooltip-target-id="ytp-ad-skip-button"]',
      'button[id*="skip-button"]',
    ],
  },
  TIMEOUTS: {
    AD_CHECK_INTERVAL: 1000,
    SKIP_COOLDOWN: 3000,
    TOAST_DURATION: 3000,
    URL_CHANGE_DELAY: 1000,
    VIDEO_CHECK_THROTTLE: 500,
  },
  STYLES: {
    TOAST: `
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
    `,
  },
  DEFAULTS: {
    ENABLED: true,
    ACTION: 'skip' as const,
    SKIP_ADS: true,
  },
  TRANSCRIPT_HEURISTICS: {
    SEGMENT_DURATION: 30, // Default segment duration in seconds
    GAP_THRESHOLD: 60, // Gap between segments to consider them separate
    MIN_CONFIDENCE: 0.7, // Minimum confidence score
    MAX_CONFIDENCE: 0.9, // Maximum confidence score
    CONFIDENCE_INCREMENT: 0.1, // Confidence increase per keyword match
  },
};
