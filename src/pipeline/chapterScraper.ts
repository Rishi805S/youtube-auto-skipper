import { Segment } from '../types/types';

// --- TIER 2: CHAPTERS FROM DESCRIPTION ANCHORS ---
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

// Main Tier 2 entry point
export async function scrapeChapterSegments(): Promise<Segment[]> {
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
