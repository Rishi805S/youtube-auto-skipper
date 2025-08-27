// Simple working content script for sponsor skipping
import { Segment } from '../types/types';
import { ProgressBarVisualizer } from '../ui/ProgressBarVisualizer';
import { getSegmentsByPriority } from '../engine/tieredFetcher';

console.log('[SponsorSkip] Simple content script loaded');

// Current state
let currentSegments: Segment[] = [];
let isEnabled = true;
let sponsorAction: 'skip' | 'mute' | 'ignore' = 'skip';
const skippedSegments = new Set<number>();
const lastSkipTimes = new Map<number, number>(); // Track when each segment was last skipped
let currentVideoId: string | null = null;
let originalVolume = 1; // Track original volume for mute restoration
let isMuted = false; // Track if currently muted
let totalSkips = 0; // Track total skips for stats
let totalTimeSaved = 0; // Track total time saved for stats
let progressVisualizer: ProgressBarVisualizer | null = null; // Progress bar visualizer

// Get video ID from URL
function getVideoId(): string | null {
  const url = window.location.href;
  const match = url.match(/[?&]v=([^&]+)/);
  return match ? match[1] : null;
}

// Fetch segments using three-tiered approach
async function fetchSegments(videoId: string): Promise<Segment[]> {
  try {
    console.log('[SponsorSkip] Fetching segments using three-tiered approach for:', videoId);
    const segments = await getSegmentsByPriority(videoId);
    console.log('[SponsorSkip] Found segments:', segments);
    return segments;
  } catch (error) {
    console.error('[SponsorSkip] Error fetching segments:', error);
    return [];
  }
}

// Load segments when video changes
async function loadSegments() {
  const videoId = getVideoId();
  console.log('[SponsorSkip] Current video ID:', videoId);
  if (videoId && videoId !== currentVideoId) {
    console.log('[SponsorSkip] New video detected, loading segments...');
    currentVideoId = videoId;
    skippedSegments.clear();
    lastSkipTimes.clear();
    // Reset stats for new video
    totalSkips = 0;
    totalTimeSaved = 0;
    currentSegments = await fetchSegments(videoId);

    // Initialize progress bar visualizer
    if (currentSegments.length > 0) {
      try {
        progressVisualizer = new ProgressBarVisualizer(currentSegments);
        await progressVisualizer.init();
        console.log('[SponsorSkip] Progress bar visualizer initialized');
      } catch (error) {
        console.warn('[SponsorSkip] Failed to initialize progress bar visualizer:', error);
      }
    }

    // Immediate check after loading segments
    if (currentSegments.length > 0) {
      console.log('[SponsorSkip] Segments loaded, doing immediate check');
      setTimeout(() => {
        const currentVideo = document.querySelector('video') as HTMLVideoElement;
        if (currentVideo) {
          checkForSkip(currentVideo);
        }
      }, 100);
    }
  } else if (!videoId) {
    console.log('[SponsorSkip] No video ID found in URL');
  } else {
    console.log('[SponsorSkip] Same video, not reloading segments');
  }
}

// Check if current time is in a sponsor segment
function checkForSkip(video: HTMLVideoElement) {
  if (!isEnabled || !currentSegments.length || sponsorAction === 'ignore') {
    return;
  }

  const currentTime = video.currentTime;

  // Update progress bar visualizer
  if (progressVisualizer) {
    progressVisualizer.highlightUpcomingSegment(currentTime, 10);
  }

  // Check if we're in an ad (don't skip during ads)
  const player = document.getElementById('movie_player');
  if (player && player.classList.contains('ad-showing')) {
    return;
  }

  for (let i = 0; i < currentSegments.length; i++) {
    const segment = currentSegments[i];

    if (currentTime >= segment.start && currentTime < segment.end) {
      // Allow re-skipping if enough time has passed (3 seconds cooldown)
      const lastSkipTime = lastSkipTimes.get(i) || 0;
      const now = Date.now();
      const canSkip = !skippedSegments.has(i) || now - lastSkipTime > 3000;

      if (canSkip) {
        console.log('[SponsorSkip] Segment detected:', segment, 'Action:', sponsorAction);

        try {
          const segmentDuration = segment.end - segment.start;

          if (sponsorAction === 'skip') {
            // Restore volume if it was muted before
            if (isMuted) {
              video.volume = originalVolume;
              isMuted = false;
              console.log('[SponsorSkip] Volume restored when switching to skip mode');
            }

            video.currentTime = segment.end;
            skippedSegments.add(i);
            lastSkipTimes.set(i, now);
            totalSkips++;
            totalTimeSaved += segmentDuration;
            showNotification(`Skipped sponsor segment (${Math.round(segmentDuration)}s)`);
            console.log(
              `[SponsorSkip] Successfully skipped from ${segment.start}s to ${segment.end}s`
            );
          } else if (sponsorAction === 'mute') {
            // Store original volume if not already muted
            if (!isMuted) {
              originalVolume = video.volume;
            }
            video.volume = 0;
            isMuted = true;
            skippedSegments.add(i);
            lastSkipTimes.set(i, now);
            totalSkips++;
            totalTimeSaved += segmentDuration;
            showNotification(`Muted sponsor segment (${Math.round(segmentDuration)}s)`);
            console.log(`[SponsorSkip] Muted segment from ${segment.start}s to ${segment.end}s`);

            // Restore volume when segment ends
            const checkUnmute = () => {
              if (video.currentTime >= segment.end) {
                video.volume = originalVolume;
                isMuted = false;
                video.removeEventListener('timeupdate', checkUnmute);
                console.log('[SponsorSkip] Volume restored after mute segment');
              }
            };
            video.addEventListener('timeupdate', checkUnmute);
          }
        } catch (error) {
          console.error('[SponsorSkip] Error during action:', error);
        }
        break;
      }
    } else {
      // Clear skipped status when user is outside the segment
      if (skippedSegments.has(i) && (currentTime < segment.start || currentTime >= segment.end)) {
        skippedSegments.delete(i);
        console.log(`[SponsorSkip] Cleared skip status for segment ${i} (user outside segment)`);
      }
    }
  }
}

// Simple notification
function showNotification(message: string) {
  console.log('[SponsorSkip] ' + message);

  // Create simple toast notification
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #333;
    color: white;
    padding: 10px 15px;
    border-radius: 5px;
    z-index: 10000;
    font-size: 14px;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    document.body.removeChild(toast);
  }, 3000);
}

// Initialize when video is found
let videoObserver: MutationObserver | null = null;

function initialize() {
  console.log('[SponsorSkip] Attempting to find video element...');
  const video = document.querySelector('video');
  if (video) {
    console.log('[SponsorSkip] Video found, initializing event listeners');
    setupVideoEventListeners(video);
    if (videoObserver) {
      videoObserver.disconnect();
      videoObserver = null;
    }
  } else {
    console.log('[SponsorSkip] Video not found, setting up MutationObserver');
    if (!videoObserver) {
      videoObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.addedNodes) {
            for (const node of Array.from(mutation.addedNodes)) {
              if (node.nodeName === 'VIDEO') {
                console.log('[SponsorSkip] Video element added to DOM, re-initializing');
                initialize();
                return;
              }
            }
          }
        }
      });
      videoObserver.observe(document.body, { childList: true, subtree: true });
    }
  }

  // Load segments initially
  console.log('[SponsorSkip] Loading segments for current video...');
  loadSegments();

  // Listen for URL changes (YouTube SPA navigation)
  let lastUrl = location.href;
  console.log('[SponsorSkip] Setting up URL change listener for:', lastUrl);
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      console.log('[SponsorSkip] URL changed from', lastUrl, 'to', url);
      lastUrl = url;
      setTimeout(() => {
        console.log('[SponsorSkip] Loading segments after URL change...');
        loadSegments();
      }, 1000);
    }
  }).observe(document, { subtree: true, childList: true });
}

function setupVideoEventListeners(video: HTMLVideoElement) {
  // Set up time update listener with throttling to prevent excessive calls
  let lastCheckTime = 0;
  video.addEventListener('timeupdate', () => {
    const now = Date.now();
    if (now - lastCheckTime > 500) {
      // Check at most every 500ms
      lastCheckTime = now;
      checkForSkip(video);
    }
  });

  // Also check on seeking
  video.addEventListener('seeked', () => {
    console.log('[SponsorSkip] Video seeked, checking for segments');
    checkForSkip(video);
  });

  // Enhanced keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Only handle if not typing in an input field
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    // Alt + S to toggle enabled state
    if (e.altKey && e.key.toLowerCase() === 's') {
      isEnabled = !isEnabled;
      console.log(`[SponsorSkip] ${isEnabled ? 'Enabled' : 'Disabled'} via keyboard shortcut`);
      showNotification(`🎛️ SponsorSkip ${isEnabled ? 'Enabled' : 'Disabled'}`);
      return;
    }

    // Alt + D to show detailed statistics
    if (e.altKey && e.key.toLowerCase() === 'd') {
      const minutes = Math.floor(totalTimeSaved / 60);
      const seconds = Math.round(totalTimeSaved % 60);
      showNotification(`📊 Stats: ${totalSkips} skips, ${minutes}m ${seconds}s saved`);
      console.log('[SponsorSkip] Detailed Stats:', {
        totalSkips,
        timeSaved: { minutes, seconds },
      });
      return;
    }

    // Alt + M to show memory/learning info
    if (e.altKey && e.key.toLowerCase() === 'm') {
      showNotification(
        `🧠 Segments: ${currentSegments.length} | Skipped: ${skippedSegments.size} | Action: ${sponsorAction}`
      );
      console.log('[SponsorSkip] Memory Info:', {
        segments: currentSegments.length,
        skipped: skippedSegments.size,
        action: sponsorAction,
        enabled: isEnabled,
      });
      return;
    }

    // Alt + P to show performance info
    if (e.altKey && e.key.toLowerCase() === 'p') {
      const videoDuration = video.duration || 0;
      const currentTime = video.currentTime;
      const progressPercent = videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0;
      showNotification(
        `⚡ Progress: ${progressPercent.toFixed(1)}% | Duration: ${Math.round(videoDuration)}s | Segments: ${currentSegments.length}`
      );
      console.log('[SponsorSkip] Performance Info:', {
        progress: progressPercent.toFixed(1) + '%',
        duration: Math.round(videoDuration),
        segments: currentSegments.length,
        currentTime: Math.round(currentTime),
      });
      return;
    }
  });
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[SponsorSkip] Message received:', message);

  switch (message.type) {
    case 'SETTINGS_UPDATED':
      const settings = message.settings;
      const previousAction = sponsorAction;
      isEnabled = settings.enabled;
      sponsorAction = settings.sponsorAction || 'skip';
      console.log('[SponsorSkip] Settings updated:', settings);
      console.log('[SponsorSkip] Enabled state:', isEnabled, 'Action:', sponsorAction);

      // Restore volume when switching away from mute mode
      if (previousAction === 'mute' && sponsorAction !== 'mute' && isMuted) {
        const video = document.querySelector('video') as HTMLVideoElement;
        if (video) {
          video.volume = originalVolume;
          isMuted = false;
          console.log('[SponsorSkip] Volume restored when switching away from mute mode');
        }
      }

      // If just enabled and in sponsor segment, take action immediately
      if (isEnabled && sponsorAction !== 'ignore') {
        const video = document.querySelector('video') as HTMLVideoElement;
        if (video) {
          console.log('[SponsorSkip] Extension enabled - checking for immediate action');
          checkForSkip(video);
        }
      }

      sendResponse({ success: true, enabled: isEnabled, action: sponsorAction });
      break;

    case 'GET_STATS':
      const stats = {
        totalSkips: totalSkips,
        timeSaved: totalTimeSaved,
      };
      console.log('[SponsorSkip] Sending stats:', stats);
      sendResponse(stats);
      break;

    default:
      console.log('[SponsorSkip] Unknown message type:', message.type);
      sendResponse({ success: false });
  }

  return true;
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  console.log('[SponsorSkip] Page unloading, cleaning up');
  if (progressVisualizer) {
    progressVisualizer.destroy();
  }
});

// Start initialization
initialize();

// Load segments initially
console.log('[SponsorSkip] Loading segments for current video...');
loadSegments();

// Listen for URL changes (YouTube SPA navigation)
let lastUrl = location.href;
console.log('[SponsorSkip] Setting up URL change listener for:', lastUrl);
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    console.log('[SponsorSkip] URL changed from', lastUrl, 'to', url);
    lastUrl = url;
    setTimeout(() => {
      console.log('[SponsorSkip] Loading segments after URL change...');
      loadSegments();
    }, 1000);
  }
}).observe(document, { subtree: true, childList: true });

console.log('[SponsorSkip] Simple skipper ready');
