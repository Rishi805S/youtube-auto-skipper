console.log('[SponsorSkip] Content script loaded.');

// --- TYPE DEFINITIONS ---
interface Cue {
  start: number; // seconds
  text:  string;
}
interface Segment { 
  start: number; 
  end: number; 
}

// --- MODULE 1: UI INTERACTION ---
async function openTranscriptPanel(): Promise<void> {
  // Clicks the "...more" button in the description
  document.querySelector<HTMLElement>('#expand')?.click();
  await new Promise(r => setTimeout(r, 500));
  // Clicks the "Show transcript" button
  document.querySelector<HTMLButtonElement>(
    'ytd-video-description-transcript-section-renderer button'
  )?.click();
}

// --- MODULE 2: PARSING ---
function parseTranscriptPanel(): Cue[] {
  const panel = document.querySelector<HTMLElement>('ytd-transcript-renderer');
  if (!panel) return [];

  const segs = panel.querySelectorAll<HTMLElement>(
    'ytd-transcript-segment-renderer'
  );

  const cues: Cue[] = Array.from(segs).map((seg) => {
    // Use the correct class names you found to select the elements
    const tEl = seg.querySelector<HTMLElement>('.segment-timestamp');
    const txtEl = seg.querySelector<HTMLElement>('.segment-text');
    
    const ts = tEl?.innerText.trim() || '0:00';
    const parts = ts.split(':').map(n => Number(n));
    // Converts "1:23" into 83 seconds
    const start = parts.length === 2
      ? parts[0] * 60 + parts[1]
      : parts[0] * 3600 + parts[1] * 60 + parts[2];

    return {
      start,
      text: txtEl?.innerText.trim() || ''
    };
  });

  console.log('[CS] Parsed', cues.length, 'cues from panel. First cue:', cues[0]);
  return cues;
}

// --- MODULE 3: DETECTION ---
function detectSponsorSegments(cues: Cue[]): Segment[] {
  const keywords = /\bsponsor|ad|promo|thanks to\b/i;
  const flagged = cues.map(c => keywords.test(c.text));
  const segments: Segment[] = [];
  let segStart: number | null = null;

  for (let i = 0; i < cues.length; i++) {
    if (flagged[i] && segStart === null) {
      segStart = cues[i].start - 2; // 2s padding
    }
    if ((!flagged[i] || i === cues.length - 1) && segStart !== null) {
      const endTime = (i < cues.length - 1 ? cues[i + 1].start : cues[i].start) + 2;
      segments.push({
        start: Math.max(segStart, 0),
        end: endTime
      });
      segStart = null;
    }
  }
  console.log('[CS] Detected', segments.length, 'sponsor segments:', segments);
  return segments;
}

// --- MODULE 4: SKIPPING ---
class SegmentSkipper {
  private segments: Segment[];
  private skipped = new Set<number>(); // indices of segments already skipped

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
  try {
    console.log('[CS] Starting transcript UI scrape...');
    await openTranscriptPanel();
    // Wait for the panel to be populated
    await new Promise(r => setTimeout(r, 2000));
    
    const cues = parseTranscriptPanel();
    const segments = detectSponsorSegments(cues);

    if (segments.length) {
      new SegmentSkipper(segments);
      console.log('[SponsorSkip] Sponsor-skipping activated.');
    } else {
      console.log('[SponsorSkip] No sponsor segments found to skip.');
    }
  } catch(err) {
    console.error('[CS] Main process failed:', err);
  }
}

window.addEventListener('yt-navigate-finish', () => {
  // A delay is needed to ensure the page buttons are in the DOM
  setTimeout(main, 2000);
});