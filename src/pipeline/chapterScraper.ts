import { Segment } from '../types/types';
import { clickWithRetry, timestampToSeconds } from '../utils/domHelpers';
import { getVideo } from '../utils/VideoManager';

const TIME_RE = /(\d{1,2}(?::\d{2}){1,2})/;

const chapterKeywords = [
  'sponsor',
  'sponsored',
  'ad',
  'ads',
  'advertisement',
  'promo',
  'promotion',
  'paid promotion',
  'brand deal',
  'thanks to',
  'brought to you by',
];

function getTimestampAnchors(): HTMLAnchorElement[] {
  const allAnchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('#description a'));
  console.log('[Tier 1] Total anchors:', allAnchors.length);

  const timestampAnchors = allAnchors.filter((anchor) => TIME_RE.test(anchor.textContent || ''));
  console.log('[Tier 1] Anchors with timestamps:', timestampAnchors.length);

  return timestampAnchors;
}

// Main Tier 1 entry point
export async function scrapeChapterSegments(): Promise<Segment[]> {
  console.log('[Tier 1] Expanding description...');

  try {
    let timestampAnchors = getTimestampAnchors();
    if (!timestampAnchors.length) {
      console.log('[Tier 1] Description looks collapsed, clicking expand');
      await clickWithRetry('#expand');
      await new Promise((resolve) => setTimeout(resolve, 200));
      timestampAnchors = getTimestampAnchors();
    } else {
      console.log('[Tier 1] Description already expanded');
    }

    if (!timestampAnchors.length) {
      console.warn('[Tier 1] No timestamp anchors found');
      return [];
    }

    const duration = getVideo()?.duration || 0;

    const chapters = timestampAnchors.map((anchor, index) => {
      const text = anchor.textContent!.trim();
      const match = text.match(TIME_RE)!;
      const start = timestampToSeconds(match[1]);

      const nextAnchor = timestampAnchors[index + 1];
      const end = nextAnchor
        ? timestampToSeconds(nextAnchor.textContent!.match(TIME_RE)![1])
        : duration;

      let title = '';
      const maybeTitleAnchor = anchor.nextElementSibling as HTMLAnchorElement | null;

      if (maybeTitleAnchor && !TIME_RE.test(maybeTitleAnchor.textContent || '')) {
        title = maybeTitleAnchor.textContent!.trim();
      } else {
        const lines = text
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line && !TIME_RE.test(line));
        title = lines[0] || '';
      }

      return { start, end, title };
    });

    const normalizedChapters = chapters.map((chapter) => ({
      ...chapter,
      title: chapter.title.replace(/\s+/g, ' ').trim().toLowerCase(),
    }));

    const sponsorChapters = normalizedChapters.filter((chapter) =>
      chapterKeywords.some((keyword) => chapter.title.toLowerCase().includes(keyword))
    );
    console.log('[Tier 1] Sponsor chapters:', sponsorChapters);

    return sponsorChapters.map(({ start, end }) => ({ start, end }));
  } catch (error) {
    console.error('[Tier 1] Chapter scraping failed:', error);
    return [];
  }
}
