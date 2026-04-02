import { Cue, Segment } from '../types/types';
import { clickWithRetry, waitForElement } from '../utils/domHelpers';
import { CONFIG } from '../config/constants';

/**
 * TIER 3: Parse transcript and detect sponsor segments using heuristics
 */

/**
 * Opens the YouTube transcript panel.
 * If the description is expanded, it also tries to minimize it again
 * so the transcript stays visible and easier to parse.
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
 * Reads transcript rows from the YouTube transcript panel
 * and converts them into cues of the form { start, text }.
 */
function parseTranscriptPanel(): Cue[] {
  const panel = document.querySelector<HTMLElement>('ytd-transcript-renderer');
  if (!panel) {
    return [];
  }

  const segments = panel.querySelectorAll<HTMLElement>('ytd-transcript-segment-renderer');

  return Array.from(segments).map((segment) => {
    const timestampEl = segment.querySelector<HTMLElement>('.segment-timestamp');
    const textEl = segment.querySelector<HTMLElement>('.segment-text');

    const timestamp = timestampEl?.innerText.trim() ?? '0:00';
    const parts = timestamp.split(':').map(Number);

    const start =
      parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] * 3600 + parts[1] * 60 + parts[2];

    return {
      start,
      text: textEl?.innerText.trim() ?? '',
    };
  });
}

// Fetches the caption XML using the caption track URL and converts it into cues.
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

/**
 * Builds sponsor segments by grouping transcript cues that contain
 * sponsor-related keywords close to each other.
 */
function detectSponsorSegments(cues: Cue[]): Segment[] {
  const segments: Segment[] = [];
  const { SEGMENT_DURATION, GAP_THRESHOLD } = CONFIG.TRANSCRIPT_HEURISTICS;

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
    (keyword) =>
      new RegExp(`\\\\b${keyword.replace(/[-/\\\\^$*+?.()|[\\]{}]/g, '\\\\$&')}\\\\b`, 'i')
  );

  let currentSegment: { start: number; end: number } | null = null;

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    const hasSponsorKeywords = sponsorRegexes.some((regex) => regex.test(cue.text));

    if (hasSponsorKeywords) {
      // Start or extend current segment
      if (!currentSegment) {
        currentSegment = {
          start: cue.start,
          end: cue.start + SEGMENT_DURATION,
        };
      } else {
        currentSegment.end = cue.start + SEGMENT_DURATION;
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

  return segments.filter((segment) => segment.end > segment.start);
}

/**
 * Tier 3 entry point.
 * First try the injected caption track URL because it gives cleaner transcript data.
 * If that is unavailable or empty, fall back to opening and scraping the transcript panel.
 */
export async function parseTranscriptSegments(trackUrl?: string | null): Promise<Segment[]> {
  try {
    let cues: Cue[] = [];

    if (trackUrl) {
      cues = await getCaptions(trackUrl);
    }

    if (!cues.length) {
      await openTranscriptPanel();
      await waitForElement('ytd-transcript-renderer', 3000);
      cues = parseTranscriptPanel();
    }

    return detectSponsorSegments(cues);
  } catch (error) {
    console.error('[Tier 3] Transcript parsing failed:', error);
    return [];
  }
}
