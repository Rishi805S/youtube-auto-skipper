import { Segment } from '../types/types';
import { scrapeChapterSegments } from '../pipeline/chapterScraper';
import { fetchSponsorBlockSegments } from '../api/SponsorBlockClient';
import { parseTranscriptSegments } from '../pipeline/transcriptParser';
import { normalizeSegments } from './normalizeSegments';

// src/engine/tieredFetcher.ts

export async function getSegmentsByPriority(videoId: string): Promise<Segment[]> {
  try {
    // Tier 1: Description Chapters
    const chapters = await scrapeChapterSegments();
    console.log(`[Fetch][Tier 1] Description chapters: ${chapters.length}`);
    if (chapters.length) {
      return normalizeSegments(chapters);
    }

    // Tier 2: SponsorBlock API
    const sb = await fetchSponsorBlockSegments(videoId);
    console.log(`[Fetch][Tier 2] SponsorBlock API: ${sb.length}`);
    if (sb.length) {
      return normalizeSegments(sb);
    }

    // Tier 3: Transcript Analysis
    const transcript = await parseTranscriptSegments();
    console.log(`[Fetch][Tier 3] Transcript heuristics: ${transcript.length}`);
    return normalizeSegments(transcript);
  } catch (error) {
    console.error('[Fetch] Error in segment detection:', error);
    return [];
  }
}
