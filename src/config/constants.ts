// Instead of using doc.queryselector(#movie_player) which is a bad practice
// we can use this constant to get the player element
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
    URL_CHANGE_DELAY: 1000,
    VIDEO_CHECK_THROTTLE: 500,
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
