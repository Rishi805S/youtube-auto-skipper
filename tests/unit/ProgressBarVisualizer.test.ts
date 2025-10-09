import { ProgressBarVisualizer } from '../../src/ui/ProgressBarVisualizer';

describe('ProgressBarVisualizer', () => {
  it('should initialize with segments', async () => {
    const segments = [
      { start: 10, end: 20 },
      { start: 30, end: 40 },
    ];
    const visualizer = new ProgressBarVisualizer(segments);
    await expect(visualizer.init()).resolves.not.toThrow();
  });

  it('should highlight upcoming segment', () => {
    const segments = [
      { start: 10, end: 20 },
      { start: 30, end: 40 },
    ];
    const visualizer = new ProgressBarVisualizer(segments);
    expect(() => visualizer.highlightUpcomingSegment(15, 10)).not.toThrow();
  });
});
