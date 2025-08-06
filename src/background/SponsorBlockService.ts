// Fetches “sponsor” segments from SponsorBlock
export interface Segment {
  start: number;
  end: number;
  category: string;
}

export class SponsorBlockService {
  private base = 'https://sponsor.ajay.app/api/skipSegments';

  async fetchSegments(videoId: string): Promise<Segment[]> {
    const url = `${this.base}?videoID=${videoId}&categories=["sponsor"]`;
    console.log('[SB] fetching SponsorBlock segments:', url);

    const resp = await fetch(url);
    if (!resp.ok) {
      console.warn('[SB] non-OK response:', resp.status);
      return [];
    }

    const data: Array<{ segment: [number, number]; category: string }> = await resp.json();

    const segments = data.map((item) => ({
      start: item.segment[0],
      end: item.segment[1],
      category: item.category,
    }));

    console.log('[SB] received segments:', segments);
    return segments;
  }
}
