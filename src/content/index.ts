// src/content/index.ts

import { Segment } from '../types/types';
import { getSegmentsByPriority } from '../engine/tieredFetcher';
import { UIInjector } from '../ui/UIInjector';
import { NotificationService } from '../services/NotificationService';

console.log('[SponsorSkip] Content script loaded.');

// Initialize notification service
const notificationService = new NotificationService();

// --- SKIPPER CLASS ---
class SegmentSkipper {
  private skipped = new Set<number>();
  private enabled = true;
  private timeUpdateHandler?: (e: Event) => void;
  private isAdPlaying = false;
  private adObserver?: MutationObserver;

  constructor(private segments: Segment[]) {
    console.log('[Skipper] Created with segments:', segments);
    this.setupAdDetection();
    this.setupKeyboardShortcuts();
    this.attach();
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
        return;
      }

      // Alt + D to show statistics
      if (e.altKey && e.key.toLowerCase() === 'd') {
        const stats = notificationService.getStats();
        const minutes = Math.floor(stats.timeSaved / 60);
        const seconds = Math.round(stats.timeSaved % 60);
        const toast = document.createElement('div');
        toast.className = 'sponsorskip-toast';
        toast.innerHTML = `
          Total segments skipped: ${stats.totalSkips}<br>
          Time saved: ${minutes}m ${seconds}s
        `;
        document.body.appendChild(toast);
        toast.classList.add('visible');
        setTimeout(() => {
          toast.classList.remove('visible');
          setTimeout(() => toast.remove(), 300);
        }, 3000);
      }
    });
  }

  private setupAdDetection(): void {
    const player = document.getElementById('movie_player');
    if (!player) {
      console.log('[Skipper] No player element found for ad detection');
      return;
    }

    // Initial ad state
    this.isAdPlaying = player.classList.contains('ad-showing');

    // Watch for ad state changes
    this.adObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const newAdState = player.classList.contains('ad-showing');
          if (this.isAdPlaying !== newAdState) {
            this.isAdPlaying = newAdState;
            console.log(`[Skipper] Ad state changed: ${newAdState ? 'Playing' : 'Ended'}`);
          }
        }
      }
    });

    this.adObserver.observe(player, {
      attributes: true,
      attributeFilter: ['class'],
    });

    console.log('[Skipper] Ad detection setup complete, initial state:', this.isAdPlaying);
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    console.log(`[Skipper] ${enabled ? 'Enabled' : 'Disabled'}`);
  }

  public getSegments(): Segment[] {
    return this.segments;
  }

  private checkTime(video: HTMLVideoElement, currentTime: number): void {
    // Use cached ad state instead of checking DOM every time
    if (this.isAdPlaying) {
      return;
    }

    // Skip if disabled
    if (!this.enabled) {
      return;
    }

    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];

      if (!this.skipped.has(i) && currentTime >= seg.start && currentTime < seg.end) {
        const duration = seg.end - seg.start;
        const segmentType = seg.category || 'segment';

        // Show countdown 3 seconds before skipping
        if (currentTime >= seg.start - 3 && !this.skipped.has(i)) {
          const timeUntilSkip = Math.ceil(seg.start - currentTime);
          if (timeUntilSkip > 0) {
            notificationService.showCountdown(segmentType, timeUntilSkip);
          }
        }

        console.log(
          `[Skipper] Found ${segmentType} at ${currentTime.toFixed(1)}s! Jumping to ${seg.end.toFixed(1)}s`
        );
        this.skipped.add(i);

        try {
          video.currentTime = seg.end;
          notificationService.showSkipToast(segmentType, duration);
          console.log('[Skipper] Successfully skipped segment');
        } catch (err) {
          console.error('[Skipper] Failed to skip:', err);
        }
        break;
      }
    }
  }

  private attach(): void {
    console.log('[Skipper] Starting attachment process...');

    const maxAttempts = 10;
    let attempts = 0;

    const tryAttach = () => {
      const video = document.querySelector<HTMLVideoElement>('video');
      if (!video) {
        attempts++;
        if (attempts < maxAttempts) {
          console.log(`[Skipper] No video yet (${attempts}/${maxAttempts}), retrying...`);
          setTimeout(tryAttach, 500);
        }
        return;
      }

      console.log('[Skipper] Found video, setting up handler');

      // Set up the time update handler
      this.timeUpdateHandler = () => this.checkTime(video, video.currentTime);
      video.addEventListener('timeupdate', this.timeUpdateHandler);

      // Do an immediate check in case we're starting mid-segment
      this.checkTime(video, video.currentTime);

      console.log('[Skipper] Successfully attached to video');
    };

    // Start trying to attach
    tryAttach();
  }

  public destroy(): void {
    console.log('[Skipper] Cleaning up...');

    // Remove event listener if it exists
    if (this.timeUpdateHandler) {
      const video = document.querySelector<HTMLVideoElement>('video');
      if (video) {
        video.removeEventListener('timeupdate', this.timeUpdateHandler);
      }
    }

    // Clear skipped segments
    this.skipped.clear();
    this.enabled = false;

    console.log('[Skipper] Cleanup complete');
  }
}

// Keep track of current instances
let currentSkipper: SegmentSkipper | null = null;
let currentInjector: UIInjector | null = null;

// --- MAIN ORCHESTRATOR ---
async function main(): Promise<void> {
  const videoId = new URLSearchParams(location.search).get('v') ?? '';
  if (!videoId) {
    console.log('[SponsorSkip] No video ID found');
    return;
  }

  console.log(`[SponsorSkip] Processing video: ${videoId}`);

  // Clean up previous instances
  if (currentSkipper) {
    console.log('[SponsorSkip] Cleaning up previous skipper');
    currentSkipper.destroy();
  }
  if (currentInjector) {
    console.log('[SponsorSkip] Cleaning up previous UI');
    currentInjector.destroy();
  }

  try {
    // TEST MODE: Use this to verify skipping works
    // const testSegment = { start: 5, end: 10, category: 'sponsor' };
    // const segments = [testSegment];
    // console.log('[SponsorSkip] Using test segment:', testSegment);

    // NORMAL MODE: Use this for real segments
    const segments = await getSegmentsByPriority(videoId);

    if (segments.length > 0) {
      console.log('[SponsorSkip] Found segments:', segments);

      // Create new skipper
      currentSkipper = new SegmentSkipper(segments);

      // Set up UI
      const handleToggle = (enabled: boolean) => currentSkipper?.setEnabled(enabled);
      const provideCount = () => currentSkipper?.getSegments().length ?? 0;

      currentInjector = new UIInjector(handleToggle, provideCount);
      await currentInjector.init();
      currentInjector.updateBadge();

      console.log('[SponsorSkip] Setup complete');
    } else {
      console.log('[SponsorSkip] No segments found');
    }
  } catch (err) {
    console.error('[SponsorSkip] Setup failed:', err);
  }
}

// --- INITIALIZATION ---
function initialize(): void {
  console.log('[SponsorSkip] Starting initialization');

  // Set up observer to wait for video element
  const observer = new MutationObserver((mutations, obs) => {
    const video = document.querySelector('video');
    if (video) {
      console.log('[SponsorSkip] Video element found, starting main process');
      main();
      obs.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Handle YouTube SPA navigation
window.addEventListener('yt-navigate-finish', () => {
  console.log('[SponsorSkip] Navigation detected, reinitializing');
  initialize();
});

// Initial page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
