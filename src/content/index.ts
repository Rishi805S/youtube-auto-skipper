import { Segment } from '../types/types';
import { getSegmentsByPriority } from '../engine/tieredFetcher';

console.log('[SponsorSkip] Content script loaded.');

// --- SKIPPER CLASS ---
class SegmentSkipper {
  private skipped = new Set<number>();

  constructor(private segments: Segment[]) {
    this.attach();
  }

  private attach(): void {
    const video = document.querySelector<HTMLVideoElement>('video');
    if (!video) {
      console.error('[Skipper] No <video> found');
      return;
    }

    video.addEventListener('timeupdate', () => {
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
}

// --- MAIN ORCHESTRATOR ---
async function main(): Promise<void> {
  const videoId = new URLSearchParams(location.search).get('v') ?? '';
  if (!videoId) return;

  const video = document.querySelector<HTMLVideoElement>('video');
  video?.pause();

  try {
    const segments = await getSegmentsByPriority(videoId);
    if (segments.length) {
      new SegmentSkipper(segments);
      console.log('[Skip] Activated skipper with segments:', segments);
    } else {
      console.log('[Skip] No sponsor segments detected.');
    }
  } catch (err) {
    console.error('[Skip] Unexpected error in main():', err);
  } finally {
    video?.play();
  }
}

// --- INITIALIZATION & SPA HANDLING ---
function initialize(): void {
  console.log('[SponsorSkip] Initializing...');
  const observer = new MutationObserver((_, obs) => {
    if (document.querySelector('video')) {
      console.log('[SponsorSkip] Video element found. Starting main logic.');
      main();
      obs.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// SPA navigation event on YouTube
window.addEventListener('yt-navigate-finish', initialize as EventListener);

// Initial page load or hard refresh
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
