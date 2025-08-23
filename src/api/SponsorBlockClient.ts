import { Segment, SponsorBlockApiSegment } from '../types/types';

export async function fetchSponsorBlockSegments(videoId: string): Promise<Segment[]> {
  try {
    const res = await fetch(`https://sponsor.ajay.app/api/skipSegments?videoID=${videoId}`);
    if (!res.ok) return [];

    const data = (await res.json()) as SponsorBlockApiSegment[];

    return data
      .filter((seg) => seg.category === 'sponsor')
      .map((seg) => ({
        start: seg.segment[0],
        end: seg.segment[1],
        category: seg.category,
      }));
  } catch {
    return [];
  }
}
