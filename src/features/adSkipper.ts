// src/features/adSkipper.ts

/**
 * Detects YouTube preroll ads and skips them by fast-forwarding the ad video.
 * Only runs when #movie_player has the 'ad-showing' class.
 */
export function trySkipAd(): void {
  const player = document.getElementById('movie_player');
  if (!player?.classList.contains('ad-showing')) return;

  const adVideo = player.querySelector('video');
  if (adVideo && adVideo.duration > 0 && adVideo.currentTime < adVideo.duration - 0.5) {
    console.log(
      `[AdSkip] Skipping ad: ${adVideo.currentTime.toFixed(1)}s → ${adVideo.duration.toFixed(1)}s`
    );
    adVideo.currentTime = adVideo.duration;
  }

  // Also try to click the skip ad button if it exists
  clickSkipAdButton();
}

/**
 * Clicks the YouTube skip ad button to completely skip the ad
 */
function clickSkipAdButton(): void {
  // First, try the exact structure from your screenshot
  const skipAdContainer = document.querySelector('.ytp-skip-ad');
  if (skipAdContainer) {
    const skipButton = skipAdContainer.querySelector('.ytp-skip-ad-button') as HTMLElement;
    if (skipButton && skipButton.offsetParent !== null) {
      console.log('[AdSkip] Found skip button using exact structure, clicking it');
      skipButton.click();
      return;
    }
  }

  // Multiple selectors for skip ad button (YouTube changes these frequently)
  const skipButtonSelectors = [
    '.ytp-skip-ad-button', // Primary class from your screenshot
    '.ytp-skip-ad-button__text', // Text element
    '.ytp-skip-ad-button__icon', // Icon element
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modest',
    '.ytp-ad-skip-button-container button',
    'button[aria-label*="Skip"]',
    'button[aria-label*="skip"]',
    '.ytp-ad-skip-button-slot button',
    '[data-tooltip-target-id="ytp-ad-skip-button"]',
  ];

  for (const selector of skipButtonSelectors) {
    const skipButton = document.querySelector(selector) as HTMLElement;
    if (skipButton && skipButton.offsetParent !== null) {
      // Check if visible
      console.log('[AdSkip] Found skip button, clicking it');
      skipButton.click();
      return;
    }
  }

  // Alternative: Look for any button with skip-related text or ID
  const allButtons = document.querySelectorAll('button');
  Array.from(allButtons).forEach((button) => {
    const text = button.textContent?.toLowerCase() || '';
    const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
    const id = button.id?.toLowerCase() || '';

    if (
      (text.includes('skip') || ariaLabel.includes('skip') || id.includes('skip')) &&
      button.offsetParent !== null &&
      button.style.display !== 'none'
    ) {
      console.log('[AdSkip] Found skip button by text/ID, clicking it');
      button.click();
      return;
    }
  });

  // Also try to find buttons with the specific ID pattern from your screenshot
  const skipButtonById = document.querySelector('button[id*="skip-button"]') as HTMLElement;
  if (skipButtonById && skipButtonById.offsetParent !== null) {
    console.log('[AdSkip] Found skip button by ID pattern, clicking it');
    skipButtonById.click();
    return;
  }
}

/**
 * Starts the ad detection loop
 */
export function startAdDetection(): NodeJS.Timeout {
  return setInterval(() => {
    trySkipAd();
  }, 500);
}

/**
 * Stops the ad detection loop
 */
export function stopAdDetection(intervalId: NodeJS.Timeout): void {
  clearInterval(intervalId);
}
