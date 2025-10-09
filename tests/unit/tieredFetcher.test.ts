import { getSegmentsByPriority } from '../../src/engine/tieredFetcher';
import * as chapterScraper from '../../src/pipeline/chapterScraper';
import * as sponsorBlock from '../../src/api/SponsorBlockClient';
import * as transcriptParser from '../../src/pipeline/transcriptParser';
import * as normalizer from '../../src/engine/normalizeSegments';

describe('getSegmentsByPriority', () => {
  const videoId = 'test123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns normalized chapters if available', async () => {
    jest.spyOn(chapterScraper, 'scrapeChapterSegments').mockResolvedValue([{ start: 0, end: 10 }]);
    jest.spyOn(normalizer, 'normalizeSegments').mockReturnValue([{ start: 0, end: 10 }]);
    const segments = await getSegmentsByPriority(videoId);
    expect(segments).toEqual([{ start: 0, end: 10 }]);
  });

  it('returns normalized SponsorBlock segments if chapters unavailable', async () => {
    jest.spyOn(chapterScraper, 'scrapeChapterSegments').mockResolvedValue([]);
    jest
      .spyOn(sponsorBlock, 'fetchSponsorBlockSegments')
      .mockResolvedValue([{ start: 10, end: 20 }]);
    jest.spyOn(normalizer, 'normalizeSegments').mockReturnValue([{ start: 10, end: 20 }]);
    const segments = await getSegmentsByPriority(videoId);
    expect(segments).toEqual([{ start: 10, end: 20 }]);
  });

  it('returns normalized transcript segments if others unavailable', async () => {
    jest.spyOn(chapterScraper, 'scrapeChapterSegments').mockResolvedValue([]);
    jest.spyOn(sponsorBlock, 'fetchSponsorBlockSegments').mockResolvedValue([]);
    jest
      .spyOn(transcriptParser, 'parseTranscriptSegments')
      .mockResolvedValue([{ start: 20, end: 30 }]);
    jest.spyOn(normalizer, 'normalizeSegments').mockReturnValue([{ start: 20, end: 30 }]);
    const segments = await getSegmentsByPriority(videoId);
    expect(segments).toEqual([{ start: 20, end: 30 }]);
  });

  it('returns empty array if all sources fail', async () => {
    jest.spyOn(chapterScraper, 'scrapeChapterSegments').mockRejectedValue(new Error('fail'));
    const segments = await getSegmentsByPriority(videoId);
    expect(segments).toEqual([]);
  });
});
