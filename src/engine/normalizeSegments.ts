// src/engine/normalizeSegments.ts

import { Segment } from '../types/types';

/**
 * Sorts segments by start time, merges any that overlap
 * or touch (within `padding` seconds), and removes duplicates.
 *
 * @param segments  Array of raw segments
 * @param padding   Merge threshold (defaults to 0 seconds)
 */
// src/engine/normalizeSegments.ts

export function normalizeSegments(segments: Segment[], padding = 0): Segment[] {
  console.log('[Merge][Engine] before normalize:', segments.length);

  if (!segments.length) {
    console.log('[Merge][Engine] nothing to normalize');
    return [];
  }

  // First apply padding to each segment
  const padded = segments.map((seg) => ({
    start: Math.max(0, seg.start - padding),
    end: seg.end + padding,
  }));

  // Then sort and merge
  const sorted = [...padded].sort((a, b) => a.start - b.start);
  const result: Segment[] = [];
  let current = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    if (next.start <= current.end) {
      current.end = Math.max(current.end, next.end);
    } else {
      result.push(current);
      current = { ...next };
    }
  }
  result.push(current);

  console.log('[Merge][Engine] after normalize:', result.length);
  return result;
}
