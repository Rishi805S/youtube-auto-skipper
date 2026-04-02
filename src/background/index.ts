import { InjectorService } from '../services/InjectorService';

function getVideoIdFromUrl(url: string): string | null {
  try {
    return new URL(url).searchParams.get('v');
  } catch {
    return null;
  }
}

async function injectTrackUrlForNavigation(tabId: number, url?: string): Promise<void> {
  // Only process actual YouTube watch pages.
  if (!url || !url.includes('youtube.com')) {
    return;
  }

  const videoId = getVideoIdFromUrl(url);
  if (!videoId) {
    return;
  }

  const trackUrl = await InjectorService.injectTrackUrlFetcher(tabId);
  if (!trackUrl) {
    return;
  }

  try {
    // Send the caption track URL to the content script for Tier 3 transcript parsing.
    await chrome.tabs.sendMessage(tabId, {
      type: 'TRACK_URL_FOUND',
      trackUrl,
      videoId,
    });
  } catch {
    // Ignore tabs where the content script is not ready yet.
  }
}

const youtubeWatchFilter = {
  url: [{ hostContains: 'youtube.com', pathContains: '/watch' }],
};

// Runs on a normal page load.
chrome.webNavigation.onCompleted.addListener(async (details) => {
  await injectTrackUrlForNavigation(details.tabId, details.url);
}, youtubeWatchFilter);

// Runs on YouTube's in-app route changes without full page reload.
chrome.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
  await injectTrackUrlForNavigation(details.tabId, details.url);
}, youtubeWatchFilter);
