import { CONFIG } from '../config/constants';
import { getSegmentsByPriority } from '../engine/tieredFetcher';
import { debounce } from '../utils/domHelpers';
import { getVideo } from '../utils/VideoManager';
import { Segment } from '../types/types';

interface SkipperState {
  isEnabled: boolean;
  sponsorAction: 'skip' | 'mute' | 'ignore';
}

const state: SkipperState = {
  isEnabled: CONFIG.DEFAULTS.ENABLED,
  sponsorAction: CONFIG.DEFAULTS.ACTION,
};

const skippedSegments = new Set<number>();
const lastSkipTimes = new Map<number, number>();
const initializedVideos = new WeakSet<HTMLVideoElement>();

let currentSegments: Segment[] = [];
let currentVideoId: string | null = null;
let currentTrackUrl: string | null = null;
let originalVolume = 1;
let isMuted = false;

function getVideoId(): string | null {
  const match = window.location.href.match(/[?&]v=([^&]+)/);
  return match ? match[1] : null;
}

function updateState(newState: Partial<SkipperState>): void {
  Object.assign(state, newState);

  if (newState.sponsorAction && newState.sponsorAction !== 'mute' && isMuted) {
    const video = getVideo();
    if (video) {
      video.volume = originalVolume;
    }
    isMuted = false;
  }
}

// Clears sponsor-related state whenever we move to a different video.
function resetVideoState(videoId: string): void {
  currentVideoId = videoId;
  currentSegments = [];
  currentTrackUrl = null;
  skippedSegments.clear();
  lastSkipTimes.clear();
  isMuted = false;
}

// Runs the 3-tier segment detection pipeline for the current video.
// forceReload is used when the background script later sends us a caption track URL.
async function loadSegments(forceReload = false): Promise<void> {
  const videoId = getVideoId();
  if (!videoId) {
    return;
  }

  const isNewVideo = videoId !== currentVideoId;
  if (isNewVideo) {
    resetVideoState(videoId);
  }

  if (!isNewVideo && !forceReload) {
    return;
  }

  currentSegments = await getSegmentsByPriority(videoId, currentTrackUrl);

  const video = getVideo();
  if (video) {
    checkForSkip(video);
  }
}

// Checks whether the current playback time is inside any detected sponsor segment.
function checkForSkip(video: HTMLVideoElement): void {
  if (!state.isEnabled || !currentSegments.length || state.sponsorAction === 'ignore') {
    return;
  }

  const player = document.querySelector(CONFIG.SELECTORS.PLAYER);
  if (player?.classList.contains('ad-showing')) {
    return;
  }

  const currentTime = video.currentTime;

  for (let index = 0; index < currentSegments.length; index++) {
    const segment = currentSegments[index];

    if (currentTime >= segment.start && currentTime < segment.end) {
      const lastSkipTime = lastSkipTimes.get(index) || 0;
      const now = Date.now();

      if (!skippedSegments.has(index) || now - lastSkipTime > CONFIG.TIMEOUTS.SKIP_COOLDOWN) {
        executeSkipAction(video, segment, index);
        break;
      }
    } else if (
      skippedSegments.has(index) &&
      (currentTime < segment.start || currentTime >= segment.end)
    ) {
      skippedSegments.delete(index);
    }
  }
}

// Executes the user-selected action once the video enters a sponsor segment.
function executeSkipAction(video: HTMLVideoElement, segment: Segment, index: number): void {
  const now = Date.now();

  try {
    if (state.sponsorAction === 'skip') {
      if (isMuted) {
        video.volume = originalVolume;
        isMuted = false;
      }

      video.currentTime = segment.end;
    } else if (state.sponsorAction === 'mute') {
      if (!isMuted) {
        originalVolume = video.volume;
      }

      video.volume = 0;
      isMuted = true;

      const restoreVolume = () => {
        if (video.currentTime >= segment.end) {
          video.volume = originalVolume;
          isMuted = false;
          video.removeEventListener('timeupdate', restoreVolume);
        }
      };

      video.addEventListener('timeupdate', restoreVolume);
    }

    skippedSegments.add(index);
    lastSkipTimes.set(index, now);
  } catch (error) {
    console.error('[SponsorSkip] Failed to handle segment:', error);
  }
}

// Registers playback listeners once per video element.
function setupVideoListeners(video: HTMLVideoElement): void {
  if (initializedVideos.has(video)) {
    return;
  }

  initializedVideos.add(video);

  let lastCheck = 0;
  video.addEventListener('timeupdate', () => {
    const now = Date.now();
    if (now - lastCheck > CONFIG.TIMEOUTS.VIDEO_CHECK_THROTTLE) {
      lastCheck = now;
      checkForSkip(video);
    }
  });

  video.addEventListener('seeked', () => checkForSkip(video));
}

// Helps the DOM observer recognize when a newly added node contains a <video>.
function findVideoNode(node: Node): HTMLVideoElement | null {
  if (node instanceof HTMLVideoElement) {
    return node;
  }

  if (node instanceof Element) {
    return node.querySelector<HTMLVideoElement>('video');
  }

  return null;
}

// Bootstraps the content script:
// 1. load popup settings
// 2. watch for video elements
// 3. watch for YouTube URL changes
function initialize(): void {
  chrome.storage.sync.get(['enabled', 'sponsorAction'], (result) => {
    updateState({
      isEnabled: result.enabled ?? CONFIG.DEFAULTS.ENABLED,
      sponsorAction: result.sponsorAction ?? CONFIG.DEFAULTS.ACTION,
    });
  });

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        const video = findVideoNode(node);
        if (video) {
          setupVideoListeners(video);
          void loadSegments();
          return;
        }
      }
    }
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  const video = getVideo();
  if (video) {
    setupVideoListeners(video);
    void loadSegments();
  }

  let lastUrl = location.href;
  const debouncedLoadSegments = debounce(() => {
    void loadSegments();
  }, CONFIG.TIMEOUTS.URL_CHANGE_DELAY);

  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      currentVideoId = null;
      currentTrackUrl = null;
      currentSegments = [];
      debouncedLoadSegments();
    }
  }).observe(document, { subtree: true, childList: true });
}

// Receives messages from:
// - the popup when settings change
// - the background script when a caption track URL is found
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SETTINGS_UPDATED') {
    updateState(message.settings);
    sendResponse({ success: true });
  } else if (message.type === 'TRACK_URL_FOUND') {
    if (message.videoId === getVideoId()) {
      currentTrackUrl = message.trackUrl;
      void loadSegments(true);

      sendResponse({ success: true });
    } else {
      sendResponse({ success: false });
    }
  }

  return true;
});

initialize();
