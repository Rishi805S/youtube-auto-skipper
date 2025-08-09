import { scrapeChapterSegments } from '../pipeline/chapterScraper';
import { fetchSponsorBlockSegments } from '../api/SponsorBlockClient';
import { parseTranscriptSegments } from '../pipeline/transcriptParser';
import { Segment } from '../types/types';

export async function getSegmentsByPriority(videoId: string): Promise<Segment[]> {
  // Tier 1
  const chapters = await scrapeChapterSegments();
  console.log('[Fetch][Tier 1] Chapters:', chapters.length);
  if (chapters.length > 0) {
    return chapters;
  }

  // Tier 2
  const sb = await fetchSponsorBlockSegments(videoId);
  console.log('[Fetch][Tier 2] SponsorBlock:', sb.length);
  if (sb.length > 0) {
    return sb;
  }

  // Tier 3
  const tx = await parseTranscriptSegments();
  console.log('[Fetch][Tier 3] Transcript:', tx.length);
  return tx;
}
