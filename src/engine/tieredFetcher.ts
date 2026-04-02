import { Segment } from '../types/types';
import { scrapeChapterSegments } from '../pipeline/chapterScraper';
import { fetchSponsorBlockSegments } from '../api/SponsorBlockClient';
import { parseTranscriptSegments } from '../pipeline/transcriptParser';

// Main 3-tier pipeline:
// Tier 1 -> description chapters
// Tier 2 -> SponsorBlock API
// Tier 3 -> transcript/captions heuristics
export async function getSegmentsByPriority(
  videoId: string,
  trackUrl?: string | null
): Promise<Segment[]> {
  try {
    // Fastest and simplest: use creator-provided chapters if they contain sponsor labels.
    const chapters = await scrapeChapterSegments();
    if (chapters.length) {
      return chapters;
    }

    // If chapters are not useful, try crowd-sourced SponsorBlock segments.
    const sponsorBlockSegments = await fetchSponsorBlockSegments(videoId);
    if (sponsorBlockSegments.length) {
      return sponsorBlockSegments;
    }

    // Final fallback: inspect transcript/captions and detect sponsor phrases heuristically.
    return await parseTranscriptSegments(trackUrl);
  } catch (error) {
    console.error('[Fetch] Error in segment detection:', error);
    return [];
  }
}
