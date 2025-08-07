import { InjectorService } from '../services/InjectorService';

// This file is now clean and doesn't need ts-ignore or ts-expect-error.
// The logic from previous steps was moved to other files.
// This is the clean, final version.

console.log('[SponsorSkip] Background script started.');

chrome.webNavigation.onHistoryStateUpdated.addListener(
  (details) => {
    if (details.url && details.url.includes('youtube.com')) {
      console.log(`[BG] Navigated to a video page. Injecting script into tab: ${details.tabId}`);

      InjectorService.injectTrackUrlFetcher(details.tabId);
    }
  },
  {
    url: [{ hostContains: 'youtube.com/*' }],
  }
);
