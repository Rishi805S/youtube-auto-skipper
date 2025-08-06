import { Segment } from '../types/Segment';

export function mergeSegments(list: Segment[]): Segment[] {
  if (!list.length) return [];
  const sorted = list.slice().sort((a, b) => a.start - b.start);
  const merged: Segment[] = [sorted[0]];
  for (const seg of sorted.slice(1)) {
    const last = merged[merged.length - 1];
    if (seg.start <= last.end) {
      last.end = Math.max(last.end, seg.end);
    } else {
      merged.push({ ...seg });
    }
  }
  return merged;
}
