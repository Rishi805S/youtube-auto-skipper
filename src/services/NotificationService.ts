export interface SkipStats {
  totalSkips: number;
  timeSaved: number; // in seconds
  lastSkippedAt: number;
}

export class NotificationService {
  private toast?: HTMLElement;
  private stats: SkipStats = {
    totalSkips: 0,
    timeSaved: 0,
    lastSkippedAt: 0,
  };

  constructor() {
    this.initStyles();
  }

  private initStyles() {
    const styles = document.createElement('style');
    styles.textContent = `
      .sponsorskip-toast {
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 24px;
        border-radius: 24px;
        font-family: "YouTube Sans", "Roboto", sans-serif;
        font-size: 14px;
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.3s;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .sponsorskip-toast.visible {
        opacity: 1;
      }
      .sponsorskip-countdown {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 16px 32px;
        border-radius: 12px;
        font-family: "YouTube Sans", "Roboto", sans-serif;
        font-size: 18px;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 12px;
      }
    `;
    document.head.appendChild(styles);
  }

  public showSkipToast(segmentType: string, duration: number) {
    // Update stats
    this.stats.totalSkips++;
    this.stats.timeSaved += duration;
    this.stats.lastSkippedAt = Date.now();

    // Create or update toast
    if (!this.toast) {
      this.toast = document.createElement('div');
      this.toast.className = 'sponsorskip-toast';
      document.body.appendChild(this.toast);
    }

    // Format duration
    const durationText =
      duration >= 60
        ? `${Math.floor(duration / 60)}m ${Math.round(duration % 60)}s`
        : `${Math.round(duration)}s`;

    this.toast.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24">
        <path fill="currentColor" d="M10 8l6 4-6 4V8z"/>
      </svg>
      Skipped ${segmentType} (${durationText})
    `;

    this.toast.classList.add('visible');
    setTimeout(() => {
      this.toast?.classList.remove('visible');
    }, 3000);
  }

  public showCountdown(segmentType: string, secondsUntilSkip: number) {
    const countdownEl = document.createElement('div');
    countdownEl.className = 'sponsorskip-countdown';
    countdownEl.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24">
        <path fill="currentColor" d="M10 8l6 4-6 4V8z"/>
      </svg>
      Skipping ${segmentType} in ${secondsUntilSkip}s...
    `;
    document.body.appendChild(countdownEl);

    setTimeout(() => {
      countdownEl.remove();
    }, secondsUntilSkip * 1000);
  }

  public getStats(): SkipStats {
    return { ...this.stats };
  }
}
