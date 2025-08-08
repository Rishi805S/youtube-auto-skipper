import { SmartDetectService, Segment, Cue } from '../services/SmartDetectService';

console.log('[SponsorSkip] Content script loaded.');

// --- MODULE 1: UI INTERACTION ---
async function openTranscriptPanel(): Promise<void> {
  // Clicks the "...more" button in the description
  document.querySelector<HTMLElement>('#expand')?.click();
  await new Promise((r) => setTimeout(r, 500));
  // Clicks the "Show transcript" button
  document
    .querySelector<HTMLButtonElement>('ytd-video-description-transcript-section-renderer button')
    ?.click();
}

// --- MODULE 2: PARSING ---
// --- MODULE 2: PARSING ---
function parseTranscriptPanel(): Cue[] {
  const panel = document.querySelector<HTMLElement>('ytd-transcript-renderer');
  if (!panel) return [];

  const segs = panel.querySelectorAll<HTMLElement>('ytd-transcript-segment-renderer');

  const cues: Cue[] = Array.from(segs).map((seg) => {
    // THE FIX: Use the correct class names you found
    const tEl = seg.querySelector<HTMLElement>('.segment-timestamp');
    const txtEl = seg.querySelector<HTMLElement>('.segment-text');
    
    const ts = tEl?.innerText.trim() || '0:00';
    const parts = ts.split(':').map((n) => Number(n));
    // Converts "1:23" into 83 seconds
    const start =
      parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] * 3600 + parts[1] * 60 + parts[2];

    return {
      start,
      text: txtEl?.innerText.trim() || '',
    };
  });

  console.log('[CS] Parsed', cues.length, 'cues from panel. First cue:', cues[0]);
  return cues;
}

// --- MODULE 3: SKIPPING ---
class SegmentSkipper {
  private segments: Segment[];
  private skipped = new Set<number>();

  constructor(segments: Segment[]) {
    this.segments = segments;
    this.attach();
  }

  private attach() {
    const video = document.querySelector<HTMLVideoElement>('video');
    if (!video) return console.error('[Skipper] No <video> found');

    video.addEventListener('timeupdate', () => {
      const t = video.currentTime;
      this.segments.forEach((seg, i) => {
        if (!this.skipped.has(i) && t >= seg.start && t < seg.end) {
          console.log(`[Skipper] Jumping from ${t.toFixed(1)}s → ${seg.end.toFixed(1)}s`);
          video.currentTime = seg.end;
          this.skipped.add(i);
        }
      });
    });
  }
}

// --- MAIN ORCHESTRATOR ---
async function main() {
  const video = document.querySelector<HTMLVideoElement>('video');
  if (!video) {
    console.error('[SponsorSkip] Video element not found.');
    return;
  }

  // Pause the video immediately
  console.log('[SponsorSkip] Pausing video for transcript scrape...');
  video.pause();

  try {
    await openTranscriptPanel();
    await new Promise((r) => setTimeout(r, 2000)); // Wait for panel

    const cues = parseTranscriptPanel();
    
    const detector = new SmartDetectService();
    const segments = detector.detectSegments(cues);

    if (segments.length) {
      new SegmentSkipper(segments);
      console.log('[SponsorSkip] Smart sponsor-skipping activated');
    } else {
      console.log('[SponsorSkip] No sponsor segments detected');
    }
  } catch (err) {
    console.error('[CS] Main process failed:', err);
  } finally {
    console.log('[SponsorSkip] Resuming video playback...');
    video.play();
  }
}

// --- NEW, ROBUST TRIGGER LOGIC ---

// This function will be called to start our process
function initialize() {
  console.log('[SponsorSkip] Initializing observer...');

  // Use a MutationObserver to wait for the video element to be available
  const observer = new MutationObserver((mutations, obs) => {
    const video = document.querySelector('video');
    if (video) {
      console.log('[SponsorSkip] Video element found. Starting main logic.');
      main(); // Call the main function
      obs.disconnect(); // Stop observing once we've found it
    }
  });

  // Start observing the body for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// This handles SPA navigations within YouTube
window.addEventListener('yt-navigate-finish', initialize);

// This handles initial page loads and hard refreshes
if (document.body) {
  initialize();
} else {
  document.addEventListener('DOMContentLoaded', initialize);
}