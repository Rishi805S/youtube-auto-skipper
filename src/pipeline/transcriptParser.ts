import { Cue, Segment } from '../types/types';
import { clickWithRetry, waitForElement } from '../utils/domHelpers';
import { CONFIG } from '../config/constants';
import { fetchTranscript } from 'youtube-transcript';

const TRANSCRIPT_API_TIMEOUT_MS = 3000;
const transcriptApiDisabledVideos = new Set<string>();

/**
 * TIER 3: Parse transcript and detect sponsor segments using heuristics
 */

/**
 * Opens the transcript panel and minimizes description
 */
async function openTranscriptPanel(): Promise<void> {
  await clickWithRetry('#expand');
  await clickWithRetry('ytd-video-description-transcript-section-renderer button');
  
  // Try to minimize description
  try {
    await clickWithRetry('#description #less', 3, 300);
    console.log('[Tier 3] Minimized description');
  } catch {
    console.log('[Tier 3] Description already minimized');
  }
}

/**
 * Parse transcript cues from the panel
 */
function parseTranscriptPanel(): Cue[] {
  const panel = document.querySelector<HTMLElement>('ytd-transcript-renderer');
  if (!panel) return [];

  const segments = panel.querySelectorAll<HTMLElement>('ytd-transcript-segment-renderer');

  return Array.from(segments).map((segment) => {
    const timestampEl = segment.querySelector<HTMLElement>('.segment-timestamp');
    const textEl = segment.querySelector<HTMLElement>('.segment-text');
    
    const timestamp = timestampEl?.innerText.trim() ?? '0:00';
    const parts = timestamp.split(':').map(Number);
    
    const start =
      parts.length === 2
        ? parts[0] * 60 + parts[1]
        : parts[0] * 3600 + parts[1] * 60 + parts[2];

    return {
      start,
      text: textEl?.innerText.trim() ?? '',
    };
  });
}

async function getCaptions(trackUrl: string): Promise<Cue[]> {
  const xml = await fetch(trackUrl).then((res) => res.text());

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xml, 'text/xml');

  return Array.from(xmlDoc.querySelectorAll('text'))
    .map((node) => ({
      start: parseFloat(node.getAttribute('start') || '0'),
      text: (node.textContent || '').replace(/\s+/g, ' ').trim(),
    }))
    .filter((cue) => cue.text.length > 0);
}

async function getCaptionsFromTranscriptApi(videoId: string): Promise<Cue[]> {
  const transcript = await Promise.race([
    fetchTranscript(videoId),
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error('youtube-transcript timed out')), TRANSCRIPT_API_TIMEOUT_MS);
    }),
  ]);

  return transcript
    .map((entry) => ({
      start: entry.offset,
      text: entry.text.trim(),
    }))
    .filter((cue) => cue.text.length > 0);
}

function normalizeTranscriptText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findMatchingPhrase(text: string, phrases: string[]): string | null {
  return phrases.find((phrase) => text.includes(phrase)) ?? null;
}

/**
 * Detect sponsor segments using keyword heuristics
 */
function detectSponsorSegments(cues: Cue[]): Segment[] {
  const segments: Segment[] = [];
  const { SEGMENT_DURATION, GAP_THRESHOLD } =
    CONFIG.TRANSCRIPT_HEURISTICS;

  const sponsorStartKeywords = [
    'sponsor',
    'todays sponsor',
    'thank todays sponsor',
    'thanks to todays sponsor',
    'sponsored',
    'advertisement',
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
    'our sponsor',
    'this sponsor',
  ];

  const sponsorEndKeywords = [
    'link in description',
    'link in the description',
    'link below',
    'links below',
    'description below',
    'description box',
    'in the description',
    'check them out',
    'check it out',
    'use promo code',
    'use code',
    'use my code',
    'promo code',
    'discount code',
    'coupon code',
    'go to',
    'sign up at',
    'sign up and get',
    'back to the video',
    'back to our video',
    'lets get back to the video',
    "let's get back to the video",
  ];

  const normalizedStartKeywords = sponsorStartKeywords.map(normalizeTranscriptText);
  const normalizedEndKeywords = sponsorEndKeywords.map(normalizeTranscriptText);

  let currentSegment: { start: number; fallbackEnd: number } | null = null;

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    const normalizedText = normalizeTranscriptText(cue.text);

    if (currentSegment && cue.start - currentSegment.start > GAP_THRESHOLD) {
      segments.push({
        start: currentSegment.start,
        end: currentSegment.fallbackEnd,
        category: 'sponsor',
      });
      currentSegment = null;
    }

    const startMatch = findMatchingPhrase(normalizedText, normalizedStartKeywords);
    const endMatch = findMatchingPhrase(normalizedText, normalizedEndKeywords);

    if (currentSegment && endMatch && cue.start >= currentSegment.start) {
      const nextCueStart = cues[i + 1]?.start;
      segments.push({
        start: currentSegment.start,
        end: Math.max(nextCueStart ?? cue.start + 2, currentSegment.start + 1),
        category: 'sponsor',
      });
      console.log(`[Tier 3] Sponsor end match "${endMatch}" at ${cue.start}s`);
      currentSegment = null;
      continue;
    }

    if (startMatch) {
      if (!currentSegment) {
        currentSegment = {
          start: cue.start,
          fallbackEnd: cue.start + SEGMENT_DURATION,
        };
        console.log(`[Tier 3] Sponsor start match "${startMatch}" at ${cue.start}s`);
      } else {
        currentSegment.fallbackEnd = Math.max(currentSegment.fallbackEnd, cue.start + SEGMENT_DURATION);
      }
    }
  }

  if (currentSegment) {
    segments.push({
      start: currentSegment.start,
      end: currentSegment.fallbackEnd,
      category: 'sponsor',
    });
  }

  return segments.filter((segment) => segment.end > segment.start);
}

/**
 * Main Tier 3 entry point
 */

export async function parseTranscriptSegments(
  videoId: string,
  trackUrl?: string | null
): Promise<Segment[]> {
  try {
    let cues: Cue[] = [];

    if (!transcriptApiDisabledVideos.has(videoId)) {
      try {
        cues = await getCaptionsFromTranscriptApi(videoId);
        console.log(`[Tier 3] Loaded ${cues.length} transcript cues from youtube-transcript`);

        if (!cues.length) {
          transcriptApiDisabledVideos.add(videoId);
          console.log('[Tier 3] youtube-transcript returned no cues, switching to fallback');
        }
      } catch (error) {
        transcriptApiDisabledVideos.add(videoId);
        console.warn('[Tier 3] youtube-transcript fetch failed, switching to fallback:', error);
      }
    } else {
      console.log('[Tier 3] youtube-transcript already disabled for this video, using fallback');
    }

    if (!cues.length && trackUrl) {
      cues = await getCaptions(trackUrl);
      console.log(`[Tier 3] Loaded ${cues.length} transcript cues from caption track`);
    }

    if (!cues.length) {
      await openTranscriptPanel();
      await waitForElement('ytd-transcript-renderer', 3000);
      cues = parseTranscriptPanel();
      console.log(`[Tier 3] Loaded ${cues.length} transcript cues from transcript panel`);
    }

    const segments = detectSponsorSegments(cues);

    console.log('[Tier 3] Detected segments from transcript:', segments);
    return segments;
  } catch (error) {
    console.error('[Tier 3] Transcript parsing failed:', error);
    return [];
  }
}
