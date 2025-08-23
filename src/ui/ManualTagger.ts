import { withRetry } from '../utils/retry';
import { Segment } from '../types/types';

export class ManualTagger {
  private startBtnId = 'sponsorskip-manual-start';
  private endBtnId = 'sponsorskip-manual-end';
  private clearBtnId = 'sponsorskip-manual-clear';

  private pendingStart: number | null = null;
  private manualSegments: Segment[] = [];

  constructor(
    private onSegmentsChange: (allSegments: Segment[]) => void,
    private getVideo: () => HTMLVideoElement | null
  ) {}

  public async init() {
    this.injectStyles();
    await this.injectUI();
  }

  /** Inject CSS for our buttons */
  private injectStyles() {
    const css = `
      .sponsorskip-manual-button {
        background: var(--yt-spec-brand-background-primary);
        border: 1px solid var(--yt-spec-menu-background-overlay);
        color: var(--yt-spec-text-primary);
        font-size: 12px;
        padding: 2px 6px;
        margin: 0 4px;
        border-radius: 2px;
        cursor: pointer;
        opacity: 0.8;
        transition: opacity 0.2s ease;
      }
      .sponsorskip-manual-button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .sponsorskip-manual-button:hover:not(:disabled) {
        opacity: 1;
      }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  /** Find YouTube controls container */ /** Find YouTube controls container */
  private async findContainer(): Promise<HTMLElement> {
    const selectors = [
      '.ytp-left-controls',
      '.ytp-right-controls',
      '#movie_player .ytp-left-controls',
    ];
    for (const sel of selectors) {
      try {
        return await withRetry<HTMLElement>(
          async () => {
            const el = document.querySelector<HTMLElement>(sel);
            if (!el) throw new Error(`no ${sel}`);
            return el;
          },
          // { retries: 5, delay: 300 }
          5,
          3000
        );
      } catch {
        // try next
      }
    }
    throw new Error('ManualTagger: controls container not found');
  }
  /** Remove old buttons */
  private cleanup() {
    document.getElementById(this.startBtnId)?.remove();
    document.getElementById(this.endBtnId)?.remove();
    document.getElementById(this.clearBtnId)?.remove();
  }

  /** Build “Mark Start” button */
  private createStartButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.id = this.startBtnId;
    btn.className = 'sponsorskip-manual-button';
    btn.textContent = 'Mark Start';
    btn.disabled = false;

    btn.onclick = () => {
      const video = this.getVideo();
      if (!video) return;
      this.pendingStart = video.currentTime;
      console.log(`[ManualTagger] Start marked at ${this.pendingStart.toFixed(1)}s`);
      btn.disabled = true;
      // enable End button
      document.getElementById(this.endBtnId)!.removeAttribute('disabled');
    };
    return btn;
  }

  /** Build “Mark End” button */
  private createEndButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.id = this.endBtnId;
    btn.className = 'sponsorskip-manual-button';
    btn.textContent = 'Mark End';
    btn.disabled = true; // off until Start is clicked

    btn.onclick = () => {
      const video = this.getVideo();
      if (!video || this.pendingStart === null) return;
      const endTime = video.currentTime;
      // Validate
      if (endTime <= this.pendingStart + 0.5) {
        console.warn('[ManualTagger] End must be after Start');
        return;
      }
      // Save segment
      const seg = { start: this.pendingStart, end: endTime };
      this.manualSegments.push(seg);
      console.log(`[ManualTagger] Segment added: ${seg.start.toFixed(1)} → ${seg.end.toFixed(1)}`);

      // Notify skipper of new combined segments
      this.onSegmentsChange(this.manualSegments);

      // Reset UI
      this.pendingStart = null;
      btn.disabled = true;
      document.getElementById(this.startBtnId)!.removeAttribute('disabled');
    };
    return btn;
  }

  /** Build “Clear Tags” button */
  private createClearButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.id = this.clearBtnId;
    btn.className = 'sponsorskip-manual-button';
    btn.textContent = 'Clear Tags';

    btn.onclick = () => {
      this.manualSegments = [];
      console.log('[ManualTagger] Manual tags cleared');
      this.onSegmentsChange(this.manualSegments);
    };
    return btn;
  }

  /** Inject all buttons into the controls bar */
  private async injectUI() {
    try {
      this.cleanup();
      const container = await this.findContainer();

      const startBtn = this.createStartButton();
      const endBtn = this.createEndButton();
      const clearBtn = this.createClearButton();

      container.appendChild(startBtn);
      container.appendChild(endBtn);
      container.appendChild(clearBtn);
    } catch (err) {
      console.error('[ManualTagger] injectUI failed:', err);
    }
  }
}
