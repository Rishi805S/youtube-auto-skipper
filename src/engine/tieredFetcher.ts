import { Segment } from '../types/types';
import { scrapeChapterSegments } from '../pipeline/chapterScraper';
import { fetchSponsorBlockSegments } from '../api/SponsorBlockClient';
import { parseTranscriptSegments } from '../pipeline/transcriptParser';

// src/engine/tieredFetcher.ts

export async function getSegmentsByPriority(
  videoId: string,
  trackUrl?: string | null
): Promise<Segment[]> {
  try {
    // Tier 1: Description Chapters
    const chapters = await scrapeChapterSegments();
    console.log(`[Fetch][Tier 1] Description chapters: ${chapters.length}`);
    if (chapters.length) {
      return chapters;
    }

    // Tier 2: SponsorBlock API
    const sb = await fetchSponsorBlockSegments(videoId);
    console.log(`[Fetch][Tier 2] SponsorBlock API: ${sb.length}`);
    if (sb.length) {
      return sb;
    }

    // Tier 3: Transcript Analysis
    const transcript = await parseTranscriptSegments(trackUrl);
    console.log(`[Fetch][Tier 3] Transcript heuristics: ${transcript.length}`);
    return transcript;
  } catch (error) {
    console.error('[Fetch] Error in segment detection:', error);
    return [];
  }
}
