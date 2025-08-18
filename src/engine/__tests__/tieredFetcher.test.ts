import { getSegmentsByPriority } from '../tieredFetcher';
import * as desc from '../../pipeline/chapterScraper';
import * as sb from '../../api/SponsorBlockClient';
import * as tx from '../../pipeline/transcriptParser';

jest.mock('../../pipeline/chapterScraper');
jest.mock('../../api/SponsorBlockClient');
jest.mock('../../pipeline/transcriptParser');

describe('getSegmentsByPriority', () => {
  const videoId = 'abc123';

  afterEach(() => jest.resetAllMocks());

  it('returns description chapters when available', async () => {
    (desc.scrapeChapterSegments as jest.Mock).mockResolvedValue([{ start: 0, end: 5 }]);
    (sb.fetchSponsorBlockSegments as jest.Mock).mockResolvedValue([]);
    (tx.parseTranscriptSegments as jest.Mock).mockResolvedValue([]);

    const result = await getSegmentsByPriority(videoId);
    expect(result).toEqual([{ start: 0, end: 5 }]);
    expect(desc.scrapeChapterSegments).toHaveBeenCalled();
    expect(sb.fetchSponsorBlockSegments).not.toHaveBeenCalled();
  });

  it('falls back to SponsorBlock when no description chapters', async () => {
    (desc.scrapeChapterSegments as jest.Mock).mockResolvedValue([]);
    (sb.fetchSponsorBlockSegments as jest.Mock).mockResolvedValue([{ start: 10, end: 20 }]);
    (tx.parseTranscriptSegments as jest.Mock).mockResolvedValue([]);

    const result = await getSegmentsByPriority(videoId);
    expect(result).toEqual([{ start: 10, end: 20 }]);
    expect(sb.fetchSponsorBlockSegments).toHaveBeenCalledWith(videoId);
  });

  it('uses transcript heuristics as last resort', async () => {
    (desc.scrapeChapterSegments as jest.Mock).mockResolvedValue([]);
    (sb.fetchSponsorBlockSegments as jest.Mock).mockResolvedValue([]);
    (tx.parseTranscriptSegments as jest.Mock).mockResolvedValue([{ start: 30, end: 40 }]);

    const result = await getSegmentsByPriority(videoId);
    expect(result).toEqual([{ start: 30, end: 40 }]);
    expect(tx.parseTranscriptSegments).toHaveBeenCalled();
  });
});
