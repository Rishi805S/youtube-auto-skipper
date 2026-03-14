import { InjectorService } from '../services/InjectorService';

console.log('[SponsorSkip] Background script started.');

function getVideoIdFromUrl(url: string): string | null {
  try {
    return new URL(url).searchParams.get('v');
  } catch {
    return null;
  }
}

async function injectTrackUrlForNavigation(tabId: number, url?: string): Promise<void> {
  if (!url || !url.includes('youtube.com')) {
    return;
  }

  const videoId = getVideoIdFromUrl(url);
  if (!videoId) {
    return;
  }

  console.log(`[BG] Processing YouTube watch page in tab ${tabId} for video ${videoId}`);

  const trackUrl = await InjectorService.injectTrackUrlFetcher(tabId);
  if (trackUrl) {
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'TRACK_URL_FOUND',
        trackUrl,
        videoId,
      });
    } catch (error) {
      console.warn('[BG] Could not deliver track URL to content script:', error);
    }
  }
}

const youtubeWatchFilter = {
  url: [{ hostContains: 'youtube.com', pathContains: '/watch' }],
};

chrome.webNavigation.onCompleted.addListener(
  async (details) => {
    await injectTrackUrlForNavigation(details.tabId, details.url);
  },
  youtubeWatchFilter
);

chrome.webNavigation.onHistoryStateUpdated.addListener(
  async (details) => {
    await injectTrackUrlForNavigation(details.tabId, details.url);
  },
  youtubeWatchFilter
);
