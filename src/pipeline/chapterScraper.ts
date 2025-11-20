import { Segment } from '../types/types';
import { clickWithRetry, timestampToSeconds } from '../utils/domHelpers';
import { VideoManager } from '../utils/VideoManager';

/**
 * TIER 1: Extract sponsor segments from YouTube description chapters
 */

// Matches "MM:SS" or "HH:MM:SS" anywhere in the text
const TIME_RE = /(\\d{1,2}(?::\\d{2}){1,2})/;

/**
 * Main Tier 1 entry point
 */
export async function scrapeChapterSegments(): Promise<Segment[]> {
  console.log('[Tier 1] Expanding description…');
  
  try {
    await clickWithRetry('#expand');
    await new Promise((resolve) => setTimeout(resolve, 200)); // Let YouTube render

    // Grab all anchors under #description
    const allAnchors = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('#description a')
    );
    console.log('[Tier 1] Total anchors:', allAnchors.length);

    // Filter anchors that contain timestamps
    const timestampAnchors = allAnchors.filter((anchor) =>
      TIME_RE.test(anchor.textContent || '')
    );
    console.log('[Tier 1] Anchors with timestamps:', timestampAnchors.length);

    if (!timestampAnchors.length) {
      console.warn('[Tier 1] No timestamp anchors found');
      return [];
    }

    // Map each anchor to { start, end, title }
    const videoManager = VideoManager.getInstance();
    const duration = videoManager.getDuration();
    
    const chapters = timestampAnchors.map((anchor, index) => {
      // Extract timestamp from text
      const text = anchor.textContent!.trim();
      const match = text.match(TIME_RE)!;
      const start = timestampToSeconds(match[1]);

      // Next anchor's timestamp becomes this chapter's end
      const nextAnchor = timestampAnchors[index + 1];
      const end = nextAnchor
        ? timestampToSeconds(nextAnchor.textContent!.match(TIME_RE)![1])
        : duration;

      // Derive chapter title
      let title = '';
      const maybeTitleAnchor = anchor.nextElementSibling as HTMLAnchorElement | null;
      
      if (maybeTitleAnchor && !TIME_RE.test(maybeTitleAnchor.textContent || '')) {
        title = maybeTitleAnchor.textContent!.trim();
      } else {
        // Fallback: take first non-timestamp line
        const lines = text
          .split('\\n')
          .map((line) => line.trim())
          .filter((line) => line && !TIME_RE.test(line));
        title = lines[0] || '';
      }

      return { start, end, title };
    });

    // Filter only chapters with "sponsor" in title
    const sponsorChapters = chapters.filter((chapter) =>
      /sponsor/i.test(chapter.title)
    );
    console.log('[Tier 1] Sponsor chapters:', sponsorChapters);

    // Return segments (start/end only)
    return sponsorChapters.map(({ start, end }) => ({ start, end }));
  } catch (error) {
    console.error('[Tier 1] Chapter scraping failed:', error);
    return [];
  }
}
