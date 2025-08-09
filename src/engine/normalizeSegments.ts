// src/engine/normalizeSegments.ts

import { Segment } from '../types/types';

/**
 * Sorts segments by start time, merges any that overlap
 * or touch (within `padding` seconds), and removes duplicates.
 *
 * @param segments  Array of raw segments
 * @param padding   Merge threshold (defaults to 0 seconds)
 */
export function normalizeSegments(segments: Segment[], padding = 0): Segment[] {
  if (segments.length === 0) {
    return [];
  }

  // 1) Sort by start
  const sorted = [...segments].sort((a, b) => a.start - b.start);

  // 2) Merge overlaps/adjacent into `result`
  const result: Segment[] = [];
  let current = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];

    // If next.start ≤ current.end + padding → extend current
    if (next.start <= current.end + padding) {
      current.end = Math.max(current.end, next.end);
    } else {
      // No overlap: push current, then start a new one
      result.push(current);
      current = { ...next };
    }
  }

  // Push the final segment
  result.push(current);

  return result;
}
