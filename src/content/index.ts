import { Segment } from '../types/types';
import { fetchSponsorBlockSegments } from '../api/SponsorBlockClient';
import { scrapeChapterSegments } from '../pipeline/chapterScraper';
import { parseTranscriptSegments } from '../pipeline/transcriptParser';

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

  let segments: Segment[] = [];

  try {
    // Tier 1
    segments = await fetchSponsorBlockSegments(videoId);

    // Tier 2: Description‐based chapters
    if (segments.length === 0) {
      console.log('[SponsorSkip] Invoking Tier 2 description parser...');
      segments = await scrapeChapterSegments();
      console.log('[SponsorSkip] Tier 2 returned segments:', segments);

      if (segments.length) {
        console.log('[SponsorSkip] Found sponsor chapters via description 🎉');
      } else {
        console.log('[SponsorSkip] No chapters in description. Will try transcript.');
      }
    }

    // Tier 3: Transcript heuristics (only if Tier 2 gave nothing)
    if (segments.length === 0) {
      console.log('[SponsorSkip] Falling back to transcript heuristics');
      segments = await parseTranscriptSegments();
      console.log('[SponsorSkip] Tier 3 returned segments:', segments);
    }

    // Activate skipper if any segments found
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
