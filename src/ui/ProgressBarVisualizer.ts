import { Segment } from '../types/types';
import { withRetry } from '../utils/retry';

export class ProgressBarVisualizer {
  private progressBar?: HTMLElement;
  private container?: HTMLElement;
  private observer?: MutationObserver;

  constructor(private segments: Segment[]) {}

  public async init(): Promise<void> {
    await this.findProgressBar();
    this.injectStyles();
    this.render();
    this.watchForProgressBarChanges();
  }

  private async findProgressBar(): Promise<void> {
    const selectors = [
      '.ytp-progress-list',
      '.ytp-progress-bar-container',
      '.ytp-progress-bar',
    ];

    for (const selector of selectors) {
      try {
        this.progressBar = await withRetry(
          async () => {
            const el = document.querySelector<HTMLElement>(selector);
            if (!el) throw new Error(`No progress bar found: ${selector}`);
            return el;
          },
          4,
          250
        );
        return;
      } catch {
        continue;
      }
    }

    throw new Error('Could not find YouTube progress bar');
  }

  private render(): void {
    if (!this.progressBar) return;

    const video = document.querySelector<HTMLVideoElement>('video');
    const duration = video?.duration ?? 0;
    if (!duration) return;

    const existing = this.progressBar.querySelector('.sponsorskip-separators');
    if (existing) {
      existing.remove();
    }

    if (getComputedStyle(this.progressBar).position === 'static') {
      this.progressBar.style.position = 'relative';
    }

    this.container = document.createElement('div');
    this.container.className = 'sponsorskip-separators';

    const boundaries = new Set<number>();
    for (const segment of this.segments) {
      boundaries.add(segment.start);
      boundaries.add(segment.end);
    }

    for (const boundary of [...boundaries].sort((a, b) => a - b)) {
      const left = Math.max(0, Math.min(100, (boundary / duration) * 100));
      const separator = document.createElement('div');
      separator.className = 'sponsorskip-separator';
      separator.style.left = `${left}%`;
      this.container.appendChild(separator);
    }

    this.progressBar.appendChild(this.container);
  }

  private watchForProgressBarChanges(): void {
    this.observer = new MutationObserver(() => {
      if (this.progressBar && !document.contains(this.progressBar)) {
        this.reinitialize();
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private async reinitialize(): Promise<void> {
    try {
      await this.findProgressBar();
      this.render();
    } catch {
      // Ignore transient YouTube DOM changes.
    }
  }

  private injectStyles(): void {
    if (document.getElementById('sponsorskip-separator-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'sponsorskip-separator-styles';
    styles.textContent = `
      .sponsorskip-separators {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 2;
      }

      .sponsorskip-separator {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 2px;
        margin-left: -1px;
        background: #ffffff;
        opacity: 0.9;
      }
    `;

    document.head.appendChild(styles);
  }

  public destroy(): void {
    this.observer?.disconnect();
    this.container?.remove();
  }
}
