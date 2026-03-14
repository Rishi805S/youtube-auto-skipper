import { Segment } from '../types/types';
import { ProgressBarVisualizer } from '../ui/ProgressBarVisualizer';
import { getSegmentsByPriority } from '../engine/tieredFetcher';
import { startAdDetection, stopAdDetection } from '../features/adSkipper';
import { CONFIG } from '../config/constants';
import { Logger } from '../utils/Logger';
import { getVideo } from '../utils/VideoManager';
import { debounce } from '../utils/domHelpers';

interface SkipperState {
  isEnabled: boolean;
  sponsorAction: 'skip' | 'mute' | 'ignore';
  skipAds: boolean;
}

Logger.log('Simple content script loaded');

const state: SkipperState = {
  isEnabled: CONFIG.DEFAULTS.ENABLED,
  sponsorAction: CONFIG.DEFAULTS.ACTION,
  skipAds: CONFIG.DEFAULTS.SKIP_ADS,
};

const skippedSegments = new Set<number>();
const lastSkipTimes = new Map<number, number>();
const initializedVideos = new WeakSet<HTMLVideoElement>();

let currentSegments: Segment[] = [];
let currentVideoId: string | null = null;
let currentTrackUrl: string | null = null;
let originalVolume = 1;
let isMuted = false;
let totalSkips = 0;
let totalTimeSaved = 0;
let progressVisualizer: ProgressBarVisualizer | null = null;
let adDetectionInterval: NodeJS.Timeout | null = null;

function getVideoId(): string | null {
  const match = window.location.href.match(/[?&]v=([^&]+)/);
  return match ? match[1] : null;
}

function updateState(newState: Partial<SkipperState>) {
  Object.assign(state, newState);
  Logger.log('State updated:', state);

  if (newState.skipAds !== undefined) {
    if (state.skipAds) {
      startAdDetectionLoop();
    } else {
      stopAdDetectionLoop();
    }
  }

  if (newState.sponsorAction && newState.sponsorAction !== 'mute' && isMuted) {
    const video = getVideo();
    if (video) {
      video.volume = originalVolume;
    }
    isMuted = false;
    Logger.log('Volume restored (action changed)');
  }
}

function startAdDetectionLoop() {
  if (adDetectionInterval) {
    stopAdDetection(adDetectionInterval);
  }
  adDetectionInterval = startAdDetection();
  Logger.log('Ad detection started');
}

function stopAdDetectionLoop() {
  if (adDetectionInterval) {
    stopAdDetection(adDetectionInterval);
    adDetectionInterval = null;
    Logger.log('Ad detection stopped');
  }
}

async function loadSegments() {
  const videoId = getVideoId();
  Logger.log('Current video ID:', videoId);

  if (videoId && (videoId !== currentVideoId || (!currentSegments.length && currentTrackUrl))) {
    Logger.log('New video detected, loading segments...');
    if (videoId !== currentVideoId) {
      currentVideoId = videoId;
      currentTrackUrl = null;
      skippedSegments.clear();
      lastSkipTimes.clear();
      totalSkips = 0;
      totalTimeSaved = 0;

      if (progressVisualizer) {
        progressVisualizer.destroy();
        progressVisualizer = null;
      }
    }

    currentSegments = await getSegmentsByPriority(videoId, currentTrackUrl);
    Logger.log('Segments loaded:', currentSegments);

    if (currentSegments.length > 0) {
      try {
        progressVisualizer = new ProgressBarVisualizer(currentSegments);
        await progressVisualizer.init();
      } catch (error) {
        Logger.warn('Visualizer init failed:', error);
      }

      setTimeout(() => {
        const video = getVideo();
        if (video) {
          checkForSkip(video);
        }
      }, 100);
    }
  }
}

/**
 * Periodically checks if the user is currently inside a sponsor segment.
 * If so, performs the configured skip action (skip, mute, or ignore).
 * @param {HTMLVideoElement} video The video element to analyze
 */
function checkForSkip(video: HTMLVideoElement) {
  if (!state.isEnabled || !currentSegments.length || state.sponsorAction === 'ignore') {
    // If the extension is disabled, or no segments are found, or the sponsor action is set to ignore, exit immediately
    return;
  }

  const currentTime = video.currentTime;

  const player = document.querySelector(CONFIG.SELECTORS.PLAYER);
  if (player && player.classList.contains('ad-showing')) {
    // If the video is currently showing an ad, exit immediately
    return;
  }

  // Iterate through all known segments
  for (let i = 0; i < currentSegments.length; i++) {
    const segment = currentSegments[i];

    if (currentTime >= segment.start && currentTime < segment.end) {
      // If the user is currently inside a segment
      const lastSkipTime = lastSkipTimes.get(i) || 0;
      const now = Date.now();
      const canSkip = !skippedSegments.has(i) || now - lastSkipTime > CONFIG.TIMEOUTS.SKIP_COOLDOWN;

      if (canSkip) {
        // If the user has not skipped this segment before, or the cooldown has expired, execute the skip action
        executeSkipAction(video, segment, i);
        break;
      }
    } else if (
      skippedSegments.has(i) &&
      (currentTime < segment.start || currentTime >= segment.end)
    ) {
      // If the user has skipped this segment before and is no longer inside it, remove it from the skipped segments set
      skippedSegments.delete(i);
    }
  }
}

function executeSkipAction(video: HTMLVideoElement, segment: Segment, index: number) {
  const duration = segment.end - segment.start;
  const now = Date.now();

  try {
    if (state.sponsorAction === 'skip') {
      if (isMuted) {
        video.volume = originalVolume;
        isMuted = false;
      }

      video.currentTime = segment.end;
      Logger.log(`Skipped ${segment.start} -> ${segment.end}`);
    } else if (state.sponsorAction === 'mute') {
      if (!isMuted) {
        originalVolume = video.volume;
      }

      video.volume = 0;
      isMuted = true;
      Logger.log(`Muted ${segment.start} -> ${segment.end}`);

      const checkUnmute = () => {
        if (video.currentTime >= segment.end) {
          video.volume = originalVolume;
          isMuted = false;
          video.removeEventListener('timeupdate', checkUnmute);
          Logger.log('Unmuted');
        }
      };

      video.addEventListener('timeupdate', checkUnmute);
    }

    skippedSegments.add(index);
    lastSkipTimes.set(index, now);
    totalSkips++;
    totalTimeSaved += duration;
  } catch (error) {
    Logger.error('Error executing skip action:', error);
  }
}

function initialize() {
  Logger.log('Initializing...');

  chrome.storage.sync.get(['enabled', 'sponsorAction', 'skipAds'], (result) => {
    updateState({
      isEnabled: result.enabled ?? CONFIG.DEFAULTS.ENABLED,
      sponsorAction: result.sponsorAction ?? CONFIG.DEFAULTS.ACTION,
      skipAds: result.skipAds ?? CONFIG.DEFAULTS.SKIP_ADS,
    });
  });

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        const video = findVideoNode(node);
        if (video) {
          Logger.log('Video element added');
          setupVideoListeners(video);
          loadSegments();
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
    loadSegments();
  }

  let lastUrl = location.href;
  const debouncedLoadSegments = debounce(loadSegments, CONFIG.TIMEOUTS.URL_CHANGE_DELAY);

  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      Logger.log('URL changed');
      debouncedLoadSegments();
    }
  }).observe(document, { subtree: true, childList: true });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SETTINGS_UPDATED') {
    updateState(msg.settings);
    sendResponse({ success: true, ...state });
  } else if (msg.type === 'GET_STATS') {
    sendResponse({ totalSkips, timeSaved: totalTimeSaved });
  } else if (msg.type === 'TRACK_URL_FOUND') {
    if (msg.videoId === getVideoId()) {
      currentTrackUrl = msg.trackUrl;
      Logger.log('Track URL received:', currentTrackUrl);

      if (!currentSegments.length) {
        void loadSegments();
      }

      sendResponse({ success: true });
    } else {
      Logger.log('Ignoring stale track URL for previous video');
      sendResponse({ success: false, reason: 'stale_video' });
    }
  }
  return true;
});

function setupVideoListeners(video: HTMLVideoElement) {
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

function findVideoNode(node: Node): HTMLVideoElement | null {
  if (node instanceof HTMLVideoElement) {
    return node;
  }

  if (node instanceof Element) {
    return node.querySelector<HTMLVideoElement>('video');
  }

  return null;
}

window.addEventListener('beforeunload', () => {
  progressVisualizer?.destroy();
  stopAdDetectionLoop();
});

initialize();
