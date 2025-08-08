import { Cue, Segment, SponsorBlockApiSegment } from '../types/types';
import { SmartDetectService } from '../services/SmartDetectService';

console.log('[SponsorSkip] Content script loaded.');

// A robust click-with-retry helper
async function clickWithRetry(selector: string, attempts = 5, delay = 300): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    const btn = document.querySelector<HTMLElement>(selector);
    if (btn) {
      btn.click();
      return;
    }
    await new Promise((r) => setTimeout(r, delay));
  }
  throw new Error(`Element not found after ${attempts} attempts: ${selector}`);
}

// --- TIER 1: SponsorBlock API ---

async function fetchFromSponsorBlock(videoId: string): Promise<Segment[]> {
  try {
    const res = await fetch(`https://sponsor.ajay.app/api/skipSegments?videoID=${videoId}`);
    if (!res.ok) return [];

    // Assert the JSON matches our interface
    const data = (await res.json()) as SponsorBlockApiSegment[];

    return data
      .filter((seg) => seg.category === 'sponsor')
      .map((seg) => ({
        start: seg.segment[0],
        end: seg.segment[1],
      }));
  } catch {
    return [];
  }
}

// --- TIER 2: CHAPTERS FROM DESCRIPTION ANCHORS ---

// Matches “MM:SS” or “HH:MM:SS” anywhere in the text
const TIME_RE = /(\d{1,2}(?::\d{2}){1,2})/;

// convert “M:SS” or “H:MM:SS” → seconds
function toSeconds(ts: string): number {
  const parts = ts.split(':').map(Number);
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return h * 3600 + m * 60 + s;
  }
  const [m, s] = parts;
  return m * 60 + s;
}

// Poll until the selector shows up (or timeout)
// async function waitForSelector(selector: string, timeout = 2000, interval = 50): Promise<void> {
//   const start = Date.now();
//   while (!document.querySelector(selector)) {
//     if (Date.now() - start > timeout) break;
//     await new Promise((r) => setTimeout(r, interval));
//   }
// }

// Main Tier 2 entry point
async function findChaptersFromDescriptionDom(): Promise<Segment[]> {
  console.log('[Tier 2] Expanding description…');
  await clickWithRetry('#expand');
  await new Promise((r) => setTimeout(r, 200)); // let YT render

  // grab ALL anchors under #description
  const all = Array.from(document.querySelectorAll<HTMLAnchorElement>('#description a'));
  console.log('[Tier 2] Total anchors:', all.length);

  // pick only those whose text contains a timestamp
  const tsAnchors = all.filter((a) => TIME_RE.test(a.textContent!));
  console.log('[Tier 2] Anchors with timestamps in text:', tsAnchors.length);

  if (!tsAnchors.length) {
    console.warn('[Tier 2] No timestamp‐text anchors found');
    return [];
  }

  // Map each to { start, end, title }
  const video = document.querySelector<HTMLVideoElement>('video')!;
  const duration = video.duration;
  const cues = tsAnchors.map((a, idx) => {
    // pull out the ts from the text
    const txt = a.textContent!.trim();
    const m = txt.match(TIME_RE)!;
    const start = toSeconds(m[1]);

    // next anchor’s timestamp → end
    const next = tsAnchors[idx + 1];
    const end = next ? toSeconds(next.textContent!.match(TIME_RE)![1]) : duration;

    // derive title:
    // 1) look for a sibling <a> that has NO timestamp
    let title = '';
    const maybeTitleA = a.nextElementSibling as HTMLAnchorElement | null;
    if (maybeTitleA && !TIME_RE.test(maybeTitleA.textContent!)) {
      title = maybeTitleA.textContent!.trim();
    } else {
      // 2) fallback: take the first non‐timestamp line
      const lines = txt
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !TIME_RE.test(l));
      title = lines[0] || '';
    }

    return { start, end, title };
  });

  // filter only “Sponsor”
  const sponsorCues = cues.filter((c) => /sponsor/i.test(c.title));
  console.log('[Tier 2] Sponsor cues:', sponsorCues);

  // return just start/end
  return sponsorCues.map(({ start, end }) => ({ start, end }));
}

// --- TIER 3: Transcript Heuristics ---
async function openTranscriptPanel(): Promise<void> {
  await clickWithRetry('#expand');
  await clickWithRetry('ytd-video-description-transcript-section-renderer button');
}

async function waitForTranscriptPanel(timeout = 3000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (document.querySelector('ytd-transcript-renderer')) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Transcript panel did not appear');
}

function parseTranscriptPanel(): Cue[] {
  const panel = document.querySelector<HTMLElement>('ytd-transcript-renderer');
  if (!panel) return [];

  const segs = panel.querySelectorAll<HTMLElement>('ytd-transcript-segment-renderer');

  const cues: Cue[] = Array.from(segs).map((seg) => {
    const tEl = seg.querySelector<HTMLElement>('.segment-timestamp');
    const txtEl = seg.querySelector<HTMLElement>('.segment-text');
    const ts = tEl?.innerText.trim() ?? '0:00';
    const parts = ts.split(':').map(Number);
    const start =
      parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] * 3600 + parts[1] * 60 + parts[2];
    return { start, text: txtEl?.innerText.trim() ?? '' };
  });

  console.log('[CS] Parsed', cues.length, 'cues from panel.');
  return cues;
}

async function getSegmentsViaTranscriptHeuristics(): Promise<Segment[]> {
  try {
    await openTranscriptPanel();
    await waitForTranscriptPanel();
    await new Promise((r) => setTimeout(r, 500));
    const cues = parseTranscriptPanel();
    return new SmartDetectService().detectSegments(cues);
  } catch (err) {
    console.error('[Skip] Transcript heuristics failed:', err);
    return [];
  }
}

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
    // Tier 1 (uncomment to enable):
    segments = await fetchFromSponsorBlock(videoId);

    // Tier 2: Description‐based chapters
    if (segments.length === 0) {
      console.log('[SponsorSkip] Invoking Tier 2 description parser...');
      segments = await findChaptersFromDescriptionDom();
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
      segments = await getSegmentsViaTranscriptHeuristics();
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
