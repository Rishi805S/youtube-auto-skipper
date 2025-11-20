import { Segment } from '../types/types';
import { ProgressBarVisualizer } from '../ui/ProgressBarVisualizer';
import { getSegmentsByPriority } from '../engine/tieredFetcher';
import { startAdDetection, stopAdDetection } from '../features/adSkipper';
import { CONFIG } from '../config/constants';
import { Logger } from '../utils/Logger';
import { NotificationManager } from '../ui/NotificationManager';
import { InputHandler, SkipperState } from '../features/InputHandler';
import { VideoManager } from '../utils/VideoManager';
import { debounce } from '../utils/domHelpers';

Logger.log('Simple content script loaded');

// Get VideoManager singleton
const videoManager = VideoManager.getInstance();

// State
const state: SkipperState = {
  isEnabled: CONFIG.DEFAULTS.ENABLED,
  sponsorAction: CONFIG.DEFAULTS.ACTION,
  skipAds: CONFIG.DEFAULTS.SKIP_ADS,
};

const skippedSegments = new Set<number>();
const lastSkipTimes = new Map<number, number>();
let currentSegments: Segment[] = [];
let currentVideoId: string | null = null;
let originalVolume = 1;
let isMuted = false;
let totalSkips = 0;
let totalTimeSaved = 0;
let progressVisualizer: ProgressBarVisualizer | null = null;
let adDetectionInterval: NodeJS.Timeout | null = null;

// --- Helpers ---

function getVideoId(): string | null {
  const match = window.location.href.match(/[?&]v=([^&]+)/);
  return match ? match[1] : null;
}

function updateState(newState: Partial<SkipperState>) {
  Object.assign(state, newState);
  Logger.log('State updated:', state);

  if (newState.skipAds !== undefined) {
    if (state.skipAds) startAdDetectionLoop();
    else stopAdDetectionLoop();
  }

  // Handle mute restoration if switching away from mute action
  if (newState.sponsorAction && newState.sponsorAction !== 'mute' && isMuted) {
    videoManager.setVolume(originalVolume);
    isMuted = false;
    Logger.log('Volume restored (action changed)');
  }
}

function startAdDetectionLoop() {
  if (adDetectionInterval) stopAdDetection(adDetectionInterval);
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

// --- Core Logic ---

async function loadSegments() {
  const videoId = getVideoId();
  Logger.log('Current video ID:', videoId);

  if (videoId && videoId !== currentVideoId) {
    Logger.log('New video detected, loading segments...');
    currentVideoId = videoId;
    skippedSegments.clear();
    lastSkipTimes.clear();
    totalSkips = 0;
    totalTimeSaved = 0;

    currentSegments = await getSegmentsByPriority(videoId);
    Logger.log('Segments loaded:', currentSegments);

    if (currentSegments.length > 0) {
      try {
        progressVisualizer = new ProgressBarVisualizer(currentSegments);
        await progressVisualizer.init();
        Logger.log('Visualizer initialized');
      } catch (error) {
        Logger.warn('Visualizer init failed:', error);
      }

      // Immediate check
      setTimeout(() => {
        const video = videoManager.getVideo();
        if (video) checkForSkip(video);
      }, 100);
    }
  }
}

function checkForSkip(video: HTMLVideoElement) {
  if (!state.isEnabled || !currentSegments.length || state.sponsorAction === 'ignore') return;

  const currentTime = video.currentTime;
  if (progressVisualizer) progressVisualizer.highlightUpcomingSegment(currentTime, 10);

  // Check for ads (legacy check, mostly handled by adSkipper now)
  const player = document.querySelector(CONFIG.SELECTORS.PLAYER);
  if (player && player.classList.contains('ad-showing')) {
    return;
  }

  for (let i = 0; i < currentSegments.length; i++) {
    const segment = currentSegments[i];

    if (currentTime >= segment.start && currentTime < segment.end) {
      const lastSkipTime = lastSkipTimes.get(i) || 0;
      const now = Date.now();
      const canSkip = !skippedSegments.has(i) || now - lastSkipTime > CONFIG.TIMEOUTS.SKIP_COOLDOWN;

      if (canSkip) {
        executeSkipAction(video, segment, i);
        break;
      }
    } else {
      // Reset skip status if outside segment
      if (skippedSegments.has(i) && (currentTime < segment.start || currentTime >= segment.end)) {
        skippedSegments.delete(i);
      }
    }
  }
}

function executeSkipAction(video: HTMLVideoElement, segment: Segment, index: number) {
  const duration = segment.end - segment.start;
  const now = Date.now();

  try {
    if (state.sponsorAction === 'skip') {
      if (isMuted) {
        videoManager.setVolume(originalVolume);
        isMuted = false;
      }
      videoManager.setCurrentTime(segment.end);
      NotificationManager.show(`Skipped sponsor (${Math.round(duration)}s)`);
      Logger.log(`Skipped ${segment.start} -> ${segment.end}`);
    } else if (state.sponsorAction === 'mute') {
      if (!isMuted) originalVolume = videoManager.getVolume();
      videoManager.setVolume(0);
      isMuted = true;
      NotificationManager.show(`Muted sponsor (${Math.round(duration)}s)`);
      Logger.log(`Muted ${segment.start} -> ${segment.end}`);

      const checkUnmute = () => {
        if (videoManager.getCurrentTime() >= segment.end) {
          videoManager.setVolume(originalVolume);
          isMuted = false;
          videoManager.removeEventListener('timeupdate', checkUnmute);
          Logger.log('Unmuted');
        }
      };
      videoManager.addEventListener('timeupdate', checkUnmute);
    }

    skippedSegments.add(index);
    lastSkipTimes.set(index, now);
    totalSkips++;
    totalTimeSaved += duration;
  } catch (error) {
    Logger.error('Error executing skip action:', error);
  }
}

// --- Initialization ---

function initialize() {
  Logger.log('Initializing...');
  
  // Load settings
  chrome.storage.sync.get(['enabled', 'sponsorAction', 'skipAds'], (result) => {
    updateState({
      isEnabled: result.enabled ?? CONFIG.DEFAULTS.ENABLED,
      sponsorAction: result.sponsorAction ?? CONFIG.DEFAULTS.ACTION,
      skipAds: result.skipAds ?? CONFIG.DEFAULTS.SKIP_ADS,
    });
  });

  // Input Handler
  const inputHandler = new InputHandler(
    () => state,
    updateState,
    () => {
      const mins = Math.floor(totalTimeSaved / 60);
      const secs = Math.round(totalTimeSaved % 60);
      NotificationManager.show(`📊 Stats: ${totalSkips} skips, ${mins}m ${secs}s saved`);
    },
    () => {
      NotificationManager.show(`🧠 Segments: ${currentSegments.length} | Skipped: ${skippedSegments.size}`);
    },
    () => {
      const video = videoManager.getVideo();
      if (video) {
        const pct = ((video.currentTime / video.duration) * 100).toFixed(1);
        NotificationManager.show(`⚡ Progress: ${pct}%`);
      }
    },
    () => chrome.runtime.sendMessage({ type: 'OPEN_POPUP' })
  );
  inputHandler.init();

  // Video Observer
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of Array.from(m.addedNodes)) {
        if (node.nodeName === 'VIDEO') {
          Logger.log('Video element added');
          setupVideoListeners(node as HTMLVideoElement);
          loadSegments();
          return;
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Initial check
  const video = videoManager.getVideo();
  if (video) {
    setupVideoListeners(video);
    loadSegments();
  }

  // URL Observer with debounce
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

function setupVideoListeners(video: HTMLVideoElement) {
  let lastCheck = 0;
  videoManager.addEventListener('timeupdate', () => {
    const now = Date.now();
    if (now - lastCheck > CONFIG.TIMEOUTS.VIDEO_CHECK_THROTTLE) {
      lastCheck = now;
      checkForSkip(video);
    }
  });
  videoManager.addEventListener('seeked', () => checkForSkip(video));
}

// Message Listener
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SETTINGS_UPDATED') {
    updateState(msg.settings);
    sendResponse({ success: true, ...state });
  } else if (msg.type === 'GET_STATS') {
    sendResponse({ totalSkips, timeSaved: totalTimeSaved });
  }
  return true;
});

// Cleanup
window.addEventListener('beforeunload', () => {
  if (progressVisualizer) progressVisualizer.destroy();
  stopAdDetectionLoop();
  videoManager.destroy();
});

initialize();
