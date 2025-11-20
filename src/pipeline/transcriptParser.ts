import { Cue, Segment } from '../types/types';
import { clickWithRetry, waitForElement } from '../utils/domHelpers';
import { CONFIG } from '../config/constants';

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

/**
 * Detect sponsor segments using keyword heuristics
 */
function detectSponsorSegments(cues: Cue[]): Segment[] {
  const segments: Segment[] = [];
  const { SEGMENT_DURATION, GAP_THRESHOLD, MIN_CONFIDENCE, MAX_CONFIDENCE, CONFIDENCE_INCREMENT } =
    CONFIG.TRANSCRIPT_HEURISTICS;

  // Sponsor detection keywords
  const sponsorKeywords = [
    'sponsor',
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
  ];

  // Compile regexes for whole word/phrase matching
  const sponsorRegexes = sponsorKeywords.map(
    (keyword) => new RegExp(`\\\\b${keyword.replace(/[-/\\\\^$*+?.()|[\\]{}]/g, '\\\\$&')}\\\\b`, 'i')
  );

  let currentSegment: { start: number; end: number; confidence: number } | null = null;

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    const hasSponsorKeywords = sponsorRegexes.some((regex) => regex.test(cue.text));

    if (hasSponsorKeywords) {
      // Start or extend current segment
      if (!currentSegment) {
        currentSegment = {
          start: cue.start,
          end: cue.start + SEGMENT_DURATION,
          confidence: MIN_CONFIDENCE,
        };
      } else {
        currentSegment.end = cue.start + SEGMENT_DURATION;
        currentSegment.confidence = Math.min(
          currentSegment.confidence + CONFIDENCE_INCREMENT,
          MAX_CONFIDENCE
        );
      }
    } else if (currentSegment) {
      // End segment if gap is too large
      if (cue.start - currentSegment.end > GAP_THRESHOLD) {
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

/**
 * Main Tier 3 entry point
 */
export async function parseTranscriptSegments(): Promise<Segment[]> {
  try {
    await openTranscriptPanel();
    await waitForElement('ytd-transcript-renderer', 3000);
    
    const cues = parseTranscriptPanel();
    const segments = detectSponsorSegments(cues);
    
    console.log('[Tier 3] Detected segments from transcript:', segments);
    return segments;
  } catch (error) {
    console.error('[Tier 3] Transcript parsing failed:', error);
    return [];
  }
}
