import { Cue, Segment } from '../types/types';
import { SmartDetectService } from '../services/SmartDetectService';

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

export async function parseTranscriptSegments(): Promise<Segment[]> {
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
