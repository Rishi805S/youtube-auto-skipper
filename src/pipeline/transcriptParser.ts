import { Cue, Segment } from '../types/types';

// Helper functions for transcript parsing
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

  return cues;
}

// Simple sponsor detection heuristics
function detectSponsorSegments(cues: Cue[]): Segment[] {
  const segments: Segment[] = [];
  const sponsorKeywords = [
    'sponsor',
    'sponsored',
    'advertisement',
    'ad',
    'promotion',
    'promoted',
    'thanks to',
    'brought to you by',
    'this video is sponsored',
    'sponsor segment',
    'ad break',
    'commercial break',
    'sponsored content',
    'paid promotion',
  ];

  let currentSegment: { start: number; end: number; confidence: number } | null = null;

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    const text = cue.text.toLowerCase();

    // Check if this cue contains sponsor keywords
    const hasSponsorKeywords = sponsorKeywords.some((keyword) => text.includes(keyword));

    if (hasSponsorKeywords) {
      // Start or extend current segment
      if (!currentSegment) {
        currentSegment = { start: cue.start, end: cue.start + 30, confidence: 0.7 };
      } else {
        currentSegment.end = cue.start + 30;
        currentSegment.confidence = Math.min(currentSegment.confidence + 0.1, 0.9);
      }
    } else if (currentSegment) {
      // End current segment if we've moved away from sponsor content
      if (cue.start - currentSegment.end > 60) {
        // 60 second gap
        segments.push({
          start: currentSegment.start,
          end: currentSegment.end,
          category: 'sponsor',
        });
        currentSegment = null;
      }
    }
  }

  // Add final segment if exists
  if (currentSegment) {
    segments.push({
      start: currentSegment.start,
      end: currentSegment.end,
      category: 'sponsor',
    });
  }

  return segments;
}

export async function parseTranscriptSegments(): Promise<Segment[]> {
  try {
    await openTranscriptPanel();
    await waitForTranscriptPanel();
    const cues = parseTranscriptPanel();

    // Use simplified sponsor detection
    const segments = detectSponsorSegments(cues);
    console.log('[TranscriptParser] Detected segments from transcript:', segments);
    return segments;
  } catch (err) {
    console.error('[TranscriptParser] Transcript heuristics failed:', err);
    return [];
  }
}
