import { normalizeSegments } from '../normalizeSegments';

describe('normalizeSegments', () => {
  it('returns empty array if input is empty', () => {
    expect(normalizeSegments([])).toEqual([]);
  });

  it('merges overlapping segments', () => {
    const input = [
      { start: 5, end: 10 },
      { start: 8, end: 12 },
    ];
    const merged = normalizeSegments(input);
    expect(merged).toEqual([{ start: 5, end: 12 }]);
  });

  it('sorts out‐of‐order segments', () => {
    const input = [
      { start: 20, end: 25 },
      { start: 0, end: 5 },
    ];
    const normalized = normalizeSegments(input);
    expect(normalized).toEqual([
      { start: 0, end: 5 },
      { start: 20, end: 25 },
    ]);
  });

  it('applies padding correctly', () => {
    const input = [{ start: 10, end: 15 }];
    const padded = normalizeSegments(input, 2);
    expect(padded).toEqual([{ start: 8, end: 17 }]);
  });
});
