import { CONFIG } from '../config/constants';
import { findFirstVisible } from '../utils/domHelpers';
import { Logger } from '../utils/Logger';
import { VideoManager } from '../utils/VideoManager';

/**
 * Ad Skipping Feature
 * Detects and skips YouTube ads automatically
 */

/**
 * Attempts to skip the current ad
 */
export function trySkipAd(): void {
  const player = document.getElementById('movie_player');
  if (!player?.classList.contains('ad-showing')) return;

  const videoManager = VideoManager.getInstance();
  const adVideo = player.querySelector('video') as HTMLVideoElement;

  // Fast-forward unskippable ads
  if (adVideo && adVideo.duration > 0 && adVideo.currentTime < adVideo.duration - 0.5) {
    Logger.log(`Skipping ad: ${adVideo.currentTime.toFixed(1)}s → ${adVideo.duration.toFixed(1)}s`);
    adVideo.currentTime = adVideo.duration;
  }

  // Click skip button if available
  clickSkipAdButton();
}

/**
 * Finds and clicks the skip ad button
 */
function clickSkipAdButton(): void {
  const skipButton = findFirstVisible<HTMLElement>(CONFIG.SELECTORS.AD_SKIP_BUTTON);

  if (skipButton) {
    Logger.log('Found skip button, clicking it');
    skipButton.click();
    return;
  }

  // Fallback: search all buttons for skip-related text
  const allButtons = document.querySelectorAll('button');
  for (const button of Array.from(allButtons)) {
    const text = button.textContent?.toLowerCase() || '';
    const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
    const id = button.id?.toLowerCase() || '';

    if (
      (text.includes('skip') || ariaLabel.includes('skip') || id.includes('skip')) &&
      button.offsetParent !== null &&
      button.style.display !== 'none'
    ) {
      Logger.log('Found skip button by text/ID, clicking it');
      button.click();
      return;
    }
  }
}

/**
 * Starts the ad detection loop
 */
export function startAdDetection(): NodeJS.Timeout {
  return setInterval(() => {
    trySkipAd();
  }, CONFIG.TIMEOUTS.AD_CHECK_INTERVAL);
}

/**
 * Stops the ad detection loop
 */
export function stopAdDetection(intervalId: NodeJS.Timeout): void {
  clearInterval(intervalId);
}
