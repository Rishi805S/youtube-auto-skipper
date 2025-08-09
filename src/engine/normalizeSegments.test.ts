// src/engine/normalizeSegments.test.ts

import { normalizeSegments } from './normalizeSegments';
import { Segment } from '../types/types';

describe('normalizeSegments', () => {
  it('returns empty array if no segments', () => {
    expect(normalizeSegments([])).toEqual([]);
  });

  it('leaves a single segment intact', () => {
    const segs: Segment[] = [{ start: 5, end: 10 }];
    expect(normalizeSegments(segs)).toEqual(segs);
  });

  it('sorts out-of-order segments', () => {
    const segs: Segment[] = [
      { start: 20, end: 25 },
      { start: 0, end: 5 },
    ];
    expect(normalizeSegments(segs)).toEqual([
      { start: 0, end: 5 },
      { start: 20, end: 25 },
    ]);
  });

  it('merges overlapping segments', () => {
    const segs: Segment[] = [
      { start: 0, end: 10 },
      { start: 5, end: 15 },
    ];
    expect(normalizeSegments(segs)).toEqual([{ start: 0, end: 15 }]);
  });

  it('merges adjacent segments when padding = 0', () => {
    const segs: Segment[] = [
      { start: 0, end: 10 },
      { start: 10, end: 20 },
    ];
    expect(normalizeSegments(segs)).toEqual([{ start: 0, end: 20 }]);
  });

  it('respects padding parameter', () => {
    const segs: Segment[] = [
      { start: 0, end: 10 },
      { start: 12, end: 20 },
    ];
    // Default padding = 0 → no merge
    expect(normalizeSegments(segs)).toEqual(segs);

    // With padding = 2 → merges as they touch
    expect(normalizeSegments(segs, 2)).toEqual([{ start: 0, end: 20 }]);
  });

  it('dedups exact duplicates', () => {
    const segs: Segment[] = [
      { start: 0, end: 10 },
      { start: 0, end: 10 },
    ];
    expect(normalizeSegments(segs)).toEqual([{ start: 0, end: 10 }]);
  });
});
