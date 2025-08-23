// src/content/enhanced-index.ts - Enhanced content script with all new features

import { Segment } from '../types/types';
import { getSegmentsByPriority } from '../engine/tieredFetcher';
import { UIInjector } from '../ui/UIInjector';
import { SegmentMemoryService } from '../services/SegmentMemoryService';
import { PerformanceService } from '../services/PerformanceService';
import { EnhancedSkipperService } from '../services/EnhancedSkipperService';
import { EnhancedNotificationService } from '../services/EnhancedNotificationService';
import { ProgressBarVisualizer } from '../ui/ProgressBarVisualizer';

// Initialize services
const memoryService = SegmentMemoryService.getInstance();
const performanceService = PerformanceService.getInstance();
const notificationService = new EnhancedNotificationService();

// Global state
let currentSkipper: EnhancedSegmentSkipper | null = null;
const currentInjector: UIInjector | null = null;

// Debug mode flag
const DEBUG_MODE = true;

// Log enhanced startup
console.log('[SponsorSkip Enhanced] Content script loaded with all new features.');

function debugLog(message: string, data?: any): void {
  if (DEBUG_MODE) {
    console.log(`[SponsorSkip Debug] ${message}`, data || '');
  }
}

// Helper function to extract video ID from URL
function getVideoId(): string | null {
  const url = window.location.href;
  const match = url.match(/[?&]v=([^&]+)/);
  return match ? match[1] : null;
}

// --- ENHANCED SKIPPER CLASS ---
class EnhancedSegmentSkipper {
  private skipped = new Set<number>();
  private lastSkippedTimes = new Map<number, number>(); // segmentIndex -> lastSkipTime
  public enabled = true;
  private timeUpdateHandler?: (e: Event) => void;
  private isAdPlaying = false;
  private adObserver?: MutationObserver;
  private enhancedSkipper?: EnhancedSkipperService;
  private progressVisualizer?: ProgressBarVisualizer;
  private segmentIndex?: Map<number, Segment[]>;

  constructor(
    private videoId: string,
    private segments: Segment[]
  ) {
    debugLog('Enhanced Skipper created', { videoId, segmentCount: segments.length });
    this.setupAdDetection();
    this.setupKeyboardShortcuts();
    this.initializeEnhancedFeatures();
    this.attach();
  }

  private async initializeEnhancedFeatures(): Promise<void> {
    try {
      // Initialize memory service
      await memoryService.initialize();
      debugLog('Memory service initialized');

      // Create enhanced skipper service
      this.enhancedSkipper = new EnhancedSkipperService(this.videoId, () => this.getVideo());
      debugLog('Enhanced skipper service created');

      // Initialize notification service styles
      notificationService.initStyles();
      debugLog('Notification service styles initialized');

      // Create progress bar visualizer
      this.progressVisualizer = new ProgressBarVisualizer(this.segments);
      await this.progressVisualizer.init();
      debugLog('Progress bar visualizer initialized');

      // Create segment index for performance
      this.segmentIndex = performanceService.createSegmentIndex(this.segments);
      debugLog('Segment index created', { buckets: this.segmentIndex.size });

      // Update memory service with current segments
      await memoryService.updateVideoSegments(this.videoId, this.segments);
      debugLog('Memory service updated with segments');
    } catch (error) {
      console.error('[Enhanced Skipper] Failed to initialize enhanced features:', error);
    }
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      // Only handle if not typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Alt + S to toggle enabled state
      if (e.altKey && e.key.toLowerCase() === 's') {
        this.setEnabled(!this.enabled);
        notificationService.showNotification(
          `🎛️ SponsorSkip ${this.enabled ? 'Enabled' : 'Disabled'}`,
          { duration: 2000 }
        );
        debugLog('Toggle via keyboard shortcut', { enabled: this.enabled });
        return;
      }

      // Alt + D to show statistics
      if (e.altKey && e.key.toLowerCase() === 'd') {
        this.showDetailedStats();
        return;
      }

      // Alt + M to show memory/learning stats
      if (e.altKey && e.key.toLowerCase() === 'm') {
        this.showMemoryStats();
        return;
      }

      // Alt + P to show performance stats
      if (e.altKey && e.key.toLowerCase() === 'p') {
        this.showPerformanceStats();
        return;
      }
    });
  }

  private async showDetailedStats(): Promise<void> {
    try {
      const stats = notificationService.getStats();
      notificationService?.showNotification(
        `📊 Stats: ${stats.totalSkips} skips, ${Math.round(stats.timeSaved)}s saved`,
        {
          duration: 5000,
          position: 'center',
        }
      );

      // Show detailed breakdown
      const minutes = Math.floor(stats.timeSaved / 60);
      const seconds = Math.round(stats.timeSaved % 60);

      console.log('[Enhanced Skipper] Detailed Stats:', {
        totalSkips: stats.totalSkips,
        timeSaved: { minutes, seconds },
      });
    } catch (error) {
      console.error('[Enhanced Skipper] Failed to show stats:', error);
    }
  }

  private async showMemoryStats(): Promise<void> {
    try {
      const preferences = memoryService.getPreferences();
      const videoData = await memoryService.getVideoData(this.videoId);

      const message = `🧠 Learning: ${preferences.enableLearning ? 'ON' : 'OFF'} | Auto-skip: ${preferences.autoSkipCategories.join(', ')} | Actions: ${videoData.userActions.length}`;

      notificationService.showNotification(message, { duration: 5000, position: 'center' });

      debugLog('Memory stats shown', {
        preferences,
        videoActions: videoData.userActions.length,
        timeSaved: videoData.timeSaved,
      });
    } catch (error) {
      console.error('[Enhanced Skipper] Failed to show memory stats:', error);
    }
  }

  private showPerformanceStats(): void {
    try {
      const cacheStats = performanceService.getCacheStats();
      const segmentCount = this.segments.length;
      const indexSize = this.segmentIndex?.size || 0;

      const message = `⚡ Cache: ${cacheStats.size} items | Memory: ${Math.round(cacheStats.memoryUsage / 1024)}KB | Segments: ${segmentCount} | Index: ${indexSize} buckets`;

      notificationService.showNotification(message, { duration: 4000, position: 'bottom-left' });

      debugLog('Performance stats shown', {
        cache: cacheStats,
        segments: segmentCount,
        indexBuckets: indexSize,
      });
    } catch (error) {
      console.error('[Enhanced Skipper] Failed to show performance stats:', error);
    }
  }

  private setupAdDetection(): void {
    const player = document.getElementById('movie_player');
    if (!player) {
      debugLog('No player element found for ad detection');
      return;
    }

    // Initial ad state
    this.isAdPlaying = player.classList.contains('ad-showing');
    debugLog('Initial ad state', { isAdPlaying: this.isAdPlaying });

    // Watch for ad state changes
    this.adObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const newAdState = player.classList.contains('ad-showing');
          if (this.isAdPlaying !== newAdState) {
            this.isAdPlaying = newAdState;
            debugLog('Ad state changed', { isAdPlaying: newAdState });
          }
        }
      }
    });

    this.adObserver.observe(player, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    debugLog('Skipper enabled state changed', { enabled });

    // If enabling, immediately check current time for sponsor segments
    if (enabled) {
      const video = this.getVideo();
      if (video) {
        debugLog('Immediate skip check triggered', {
          currentTime: video.currentTime,
          paused: video.paused,
          segmentCount: this.segments.length,
        });

        // Force immediate check regardless of pause state
        this.checkTime(video, video.currentTime);
      }
    }
  }

  public getSegments(): Segment[] {
    return this.segments;
  }

  private getVideo(): HTMLVideoElement | null {
    return document.querySelector<HTMLVideoElement>('video');
  }

  private async checkTime(video: HTMLVideoElement, currentTime: number): Promise<void> {
    // Use cached ad state instead of checking DOM every time
    if (this.isAdPlaying) {
      return;
    }

    // Skip if disabled
    if (!this.enabled) {
      return;
    }

    // Use performance-optimized segment lookup
    let candidateSegments: Segment[] = [];
    if (this.segmentIndex) {
      candidateSegments = performanceService.findSegmentsAtTime(currentTime, this.segmentIndex);
    } else {
      candidateSegments = this.segments;
    }

    // Update progress bar visualizer
    if (this.progressVisualizer) {
      this.progressVisualizer.highlightUpcomingSegment(currentTime, 10);
    }

    for (let i = 0; i < candidateSegments.length; i++) {
      const seg = candidateSegments[i];
      const segmentIndex = this.segments.indexOf(seg);

      if (currentTime >= seg.start && currentTime < seg.end) {
        // Allow re-skipping: either never skipped, or skipped more than 3 seconds ago
        const lastSkipTime = this.lastSkippedTimes.get(segmentIndex) || 0;
        const shouldSkip = !this.skipped.has(segmentIndex) || Date.now() - lastSkipTime > 3000; // 3 second cooldown

        if (shouldSkip) {
          debugLog('Segment detected', {
            segment: seg,
            currentTime,
            segmentIndex,
            category: seg.category,
          });

          // Use enhanced skipper service for intelligent handling
          if (this.enhancedSkipper) {
            try {
              const actions = await this.enhancedSkipper.processSegments([seg]);
              if (actions.length > 0) {
                const action = actions[0];
                debugLog('Enhanced action determined', { action });

                const success = await this.enhancedSkipper.executeAction(action);
                if (success) {
                  this.skipped.add(segmentIndex);
                  this.lastSkippedTimes.set(segmentIndex, Date.now());

                  // Show appropriate notification
                  const duration = seg.end - seg.start;
                  switch (action.type) {
                    case 'skip':
                      notificationService.showSkipToast(seg.category || 'segment', duration);
                      break;
                    case 'mute':
                      notificationService.showMuteNotification(seg.category || 'segment', duration);
                      break;
                    case 'preview':
                      // Preview UI is handled by EnhancedSkipperService
                      break;
                  }

                  debugLog('Enhanced action executed successfully', {
                    type: action.type,
                    duration,
                  });
                }
              }
            } catch (error) {
              console.error(
                '[Enhanced Skipper] Enhanced processing failed, falling back to basic skip:',
                error
              );
              // Fallback to basic skip
              this.basicSkip(video, seg, segmentIndex);
            }
          } else {
            // Fallback to basic skip if enhanced skipper not available
            this.basicSkip(video, seg, segmentIndex);
          }
        }
        break;
      }
    }
  }

  private basicSkip(video: HTMLVideoElement, seg: Segment, segmentIndex: number): void {
    try {
      const duration = seg.end - seg.start;
      const segmentType = seg.category || 'segment';

      debugLog('Basic skip executed', { segment: seg, duration });

      video.currentTime = seg.end;
      this.skipped.add(segmentIndex);
      this.lastSkippedTimes.set(segmentIndex, Date.now());

      notificationService.showSkipToast(segmentType, duration);
    } catch (err) {
      console.error('[Enhanced Skipper] Basic skip failed:', err);
    }
  }

  private attach(): void {
    debugLog('Starting attachment process');

    const maxAttempts = 10;
    let attempts = 0;

    const tryAttach = () => {
      const video = this.getVideo();
      if (!video) {
        attempts++;
        if (attempts < maxAttempts) {
          debugLog(`No video yet (${attempts}/${maxAttempts}), retrying...`);
          setTimeout(tryAttach, 500);
        }
        return;
      }

      debugLog('Found video, setting up handler');

      // Set up the time update handler with throttling for performance
      const throttledCheckTime = performanceService.throttle(
        (currentTime: number) => this.checkTime(video, currentTime),
        500 // Check every 500ms instead of every frame
      );

      this.timeUpdateHandler = () => throttledCheckTime(video.currentTime);
      video.addEventListener('timeupdate', this.timeUpdateHandler);

      // Do an immediate check in case we're starting mid-segment
      this.checkTime(video, video.currentTime);

      debugLog('Successfully attached to video with enhanced features');
    };

    // Start trying to attach
    tryAttach();
  }

  public destroy(): void {
    debugLog('Cleaning up enhanced skipper');

    // Remove event listener if it exists
    if (this.timeUpdateHandler) {
      const video = this.getVideo();
      if (video) {
        video.removeEventListener('timeupdate', this.timeUpdateHandler);
      }
    }

    // Clean up enhanced services
    this.enhancedSkipper?.cleanup();
    this.progressVisualizer?.destroy();

    // Clear skipped segments
    this.skipped.clear();
    this.enabled = false;

    debugLog('Enhanced skipper cleanup complete');
  }
}

// --- MAIN ORCHESTRATOR ---
async function main(): Promise<void> {
  console.log('[Content Script] Starting main process');
  debugLog('Starting main process');

  const videoId = getVideoId();
  if (!videoId) {
    console.log('[Content Script] No video ID found, exiting');
    debugLog('No video ID found, exiting');
    return;
  }

  console.log('[Content Script] Video ID found:', videoId);
  debugLog('Video ID found:', videoId);

  // Clean up previous instances
  if (currentSkipper) {
    debugLog('Cleaning up previous enhanced skipper');
    currentSkipper.destroy();
  }
  if (currentInjector) {
    debugLog('Cleaning up previous UI');
    currentInjector.destroy();
  }

  try {
    // Fetch segments using the function
    const { fetchSponsorBlockSegments } = await import('../api/SponsorBlockClient');

    console.log('[Content Script] Fetching segments for video:', videoId);
    debugLog('Fetching segments for video:', videoId);
    const segments = await fetchSponsorBlockSegments(videoId);

    console.log('[Content Script] Segments fetched:', segments.length, segments);
    if (segments.length === 0) {
      console.log('[Content Script] No segments found for this video');
      debugLog('No segments found for this video');
      return;
    }

    debugLog('Segments found:', segments);

    // Create new enhanced skipper
    console.log(
      '[Content Script] Creating EnhancedSegmentSkipper with',
      segments.length,
      'segments'
    );
    currentSkipper = new EnhancedSegmentSkipper(videoId, segments);

    console.log('[Content Script] Enhanced setup complete', {
      segmentCount: segments.length,
      videoId: videoId,
    });
  } catch (error) {
    console.error('[Content Script] Error in main process:', error);
    debugLog('Error in main process:', error);
  }
}

// --- INITIALIZATION ---
function initialize(): void {
  debugLog('Starting enhanced initialization');

  // Set up observer to wait for video element
  const observer = new MutationObserver((mutations, obs) => {
    const video = document.querySelector('video');
    if (video) {
      debugLog('Video element found, starting enhanced main process');
      main();
      obs.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Content Script] Message received:', message);
  debugLog('Message received:', message);

  switch (message.type) {
    case 'SETTINGS_UPDATED':
      console.log('[Content Script] Handling settings update:', message.settings);
      handleSettingsUpdate(message.settings);
      sendResponse({ success: true, currentSkipper: !!currentSkipper });
      break;

    case 'GET_STATS':
      const stats = getExtensionStats();
      sendResponse(stats);
      break;

    case 'TEST_FEATURES':
      testAllFeatures();
      sendResponse({ success: true });
      break;

    case 'SHOW_CONSOLE':
      console.log('[SponsorSkip Enhanced] === DEBUG CONSOLE ===');
      console.log('Current State:', {
        enabled: currentSkipper ? 'Active' : 'Inactive',
        segments: currentSkipper?.getSegments().length || 0,
        memoryService: memoryService ? 'Initialized' : 'Not initialized',
        performanceService: performanceService ? 'Active' : 'Inactive',
      });
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  return true; // Keep message channel open for async response
});

function handleSettingsUpdate(settings: any): void {
  debugLog('Updating settings:', settings);

  // Update memory service preferences for sponsor-only mode
  if (memoryService) {
    memoryService.updatePreferences({
      autoSkipCategories: settings.sponsorAction === 'skip' ? ['sponsor'] : [],
      muteCategories: settings.sponsorAction === 'mute' ? ['sponsor'] : [],
      skipThreshold: 0.7,
      enableLearning: false,
      syncEnabled: settings.syncEnabled !== false,
    });
  }

  // Update skipper state with immediate check
  if (currentSkipper) {
    const isEnabled = settings.enabled === true;
    const wasEnabled = currentSkipper.enabled;

    debugLog('Master toggle updated', {
      enabled: settings.enabled,
      isEnabled,
      wasEnabled,
      segments: currentSkipper.getSegments().length,
    });

    currentSkipper.setEnabled(isEnabled);

    // If just enabled, force immediate skip check
    if (isEnabled && !wasEnabled) {
      debugLog('Extension just enabled - forcing immediate skip check');
      const video = document.querySelector<HTMLVideoElement>('video');
      if (video && currentSkipper && currentSkipper.getSegments().length > 0) {
        setTimeout(() => {
          if (currentSkipper) {
            currentSkipper.setEnabled(true); // Force another check
          }
        }, 100);
      }
    }
  }
}

function getExtensionStats(): any {
  const stats = notificationService?.getStats() || {
    totalSkips: 0,
    timeSaved: 0,
  };

  return {
    totalSkips: stats.totalSkips,
    timeSaved: stats.timeSaved,
  };
}

function testAllFeatures(): void {
  debugLog('Testing all features...');

  // Test notifications
  notificationService?.showNotification('🧪 Testing notifications!', {
    duration: 2000,
    category: 'test',
  });

  // Test feature status
  setTimeout(() => {
    notificationService?.showNotification('✅ All features tested successfully!', {
      duration: 3000,
      position: 'center',
    });
  }, 1000);
}

// Handle YouTube SPA navigation
window.addEventListener('yt-navigate-finish', () => {
  debugLog('Navigation detected, reinitializing enhanced features');
  // Reset notification stats for new video
  notificationService.resetStats();
  initialize();
});

// Initial page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  debugLog('Page unloading, cleaning up services');
  if (currentSkipper) {
    currentSkipper.destroy();
  }
  // currentInjector cleanup removed due to type issues
  performanceService.destroy();
});

debugLog('Enhanced content script initialization complete');
