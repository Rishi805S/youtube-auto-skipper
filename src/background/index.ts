import { InjectorService } from '../services/InjectorService';

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

// Handle popup opening request from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'OPEN_POPUP') {
    console.log('[BG] Received request to open popup');
    // Open the popup by clicking the extension icon
    chrome.action.openPopup();
    sendResponse({ success: true });
  }
  return true;
});
