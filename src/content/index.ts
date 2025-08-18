// src/content/index.ts

import { Segment } from '../types/types';
import { getSegmentsByPriority } from '../engine/tieredFetcher';
import { UIInjector } from '../ui/UIInjector';

console.log('[SponsorSkip] Content script loaded.');

// --- SKIPPER CLASS ---
class SegmentSkipper {
  private skipped = new Set<number>();
  private enabled = true;

  constructor(private segments: Segment[]) {
    this.attach();
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    console.log(`[Skipper] ${enabled ? 'Enabled' : 'Disabled'}`);
  }

  public getSegments(): Segment[] {
    return this.segments;
  }

  private attach(): void {
    const video = document.querySelector<HTMLVideoElement>('video');
    if (!video) {
      console.error('[Skipper] No <video> found');
      return;
    }

    video.addEventListener('timeupdate', () => {
      if (!this.enabled) return;

      const t = video.currentTime;
      for (let i = 0; i < this.segments.length; i++) {
        const seg = this.segments[i];
        if (!this.skipped.has(i) && t >= seg.start && t < seg.end) {
          console.log(`[Skipper] Jumping from ${t.toFixed(1)}s → ${seg.end.toFixed(1)}s`);
          this.skipped.add(i);
          video.currentTime = seg.end;
          break;
        }
      }
    });
  }

  public destroy(): void {
    const video = document.querySelector<HTMLVideoElement>('video');
    if (video) {
      // Remove all timeupdate listeners by cloning the element
      const newVideo = video.cloneNode(true) as HTMLVideoElement;
      video.parentNode?.replaceChild(newVideo, video);
    }
  }
}

// Keep track of current instances
let currentSkipper: SegmentSkipper | null = null;
let currentInjector: UIInjector | null = null;

// --- MAIN ORCHESTRATOR ---
async function main(): Promise<void> {
  const videoId = new URLSearchParams(location.search).get('v') ?? '';
  if (!videoId) return;

  // Clean up any previous skipper/UI
  currentSkipper?.destroy();
  currentInjector?.destroy();

  const video = document.querySelector<HTMLVideoElement>('video');
  video?.pause();

  try {
    // 1) Fetch the highest-priority segments
    const segments = await getSegmentsByPriority(videoId);
    // DEBUG STUB: force one segment from 5 → 10s
    // const segments = [{ start: 5, end: 10 }];
    // console.log('[SponsorSkip] DEBUG: stubbing segments', segments);

    console.log('[SponsorSkip] Fetched segments:', segments);

    if (segments.length > 0) {
      // 2) Activate skipper
      currentSkipper = new SegmentSkipper(segments);
      console.log('[SponsorSkip] Skipper activated.');

      // 3) Initialize UI
      const handleToggle = (enabled: boolean) => currentSkipper?.setEnabled(enabled);
      const provideCount = () => currentSkipper?.getSegments().length ?? 0;

      currentInjector = new UIInjector(handleToggle, provideCount);
      await currentInjector.init();

      // 4) Update badge immediately
      currentInjector.updateBadge();
    } else {
      console.log('[SponsorSkip] No sponsor segments detected.');
    }
  } catch (err) {
    console.error('[SponsorSkip] Error in main():', err);
  } finally {
    video?.play();
  }
}

// --- INIT & SPA NAVIGATION HANDLING ---
function initialize(): void {
  console.log('[SponsorSkip] Initializing...');
  const observer = new MutationObserver((_, obs) => {
    if (document.querySelector('video')) {
      console.log('[SponsorSkip] Video found, running main().');
      main();
      obs.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// YouTube SPA navigation fires this event
window.addEventListener('yt-navigate-finish', initialize as EventListener);

// Initial load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
