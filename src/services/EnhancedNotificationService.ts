// src/services/EnhancedNotificationService.ts

export interface NotificationOptions {
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
  showInMiniPlayer?: boolean;
  category?: string;
  timeSaved?: number;
}

export interface VideoStats {
  totalSkips: number;
  timeSaved: number;
}

export class EnhancedNotificationService {
  private stats: VideoStats = {
    totalSkips: 0,
    timeSaved: 0,
  };

  private categoryEmojis = {
    sponsor: '💰',
  };

  /**
   * Show skip notification with enhanced features
   */
  public showSkipToast(
    category: string,
    duration: number,
    options: NotificationOptions = {}
  ): void {
    this.updateStats(category, duration);

    const emoji = this.categoryEmojis[category as keyof typeof this.categoryEmojis] || '⏭️';
    const message = `${emoji} Skipped ${category} (${Math.round(duration)}s)`;

    this.showNotification(message, {
      duration: 3000,
      category,
      timeSaved: duration,
      ...options,
    });
  }

  /**
   * Show countdown notification
   */
  public showCountdown(category: string, seconds: number, options: NotificationOptions = {}): void {
    const emoji = this.categoryEmojis[category as keyof typeof this.categoryEmojis] || '⏭️';
    const message = `${emoji} Skipping ${category} in ${seconds}s`;

    this.showNotification(message, {
      duration: 1000,
      category,
      ...options,
    });
  }

  /**
   * Show mute notification
   */
  public showMuteNotification(
    category: string,
    duration: number,
    options: NotificationOptions = {}
  ): void {
    const emoji = '🔇';
    const message = `${emoji} Muted ${category} (${Math.round(duration)}s)`;

    this.showNotification(message, {
      duration: 2000,
      category,
      ...options,
    });
  }

  /**
   * Show time saved summary
   */
  public showTimeSavedSummary(videoTimeSaved: number, totalTimeSaved: number): void {
    const minutes = Math.floor(videoTimeSaved / 60);
    const seconds = Math.round(videoTimeSaved % 60);
    const totalMinutes = Math.floor(totalTimeSaved / 60);

    let message = `⏰ Video: ${minutes}m ${seconds}s saved`;
    if (totalTimeSaved > 0) {
      message += ` | Total: ${totalMinutes}m saved`;
    }

    this.showNotification(message, {
      duration: 5000,
      position: 'bottom-right',
    });
  }

  /**
   * Main notification display method
   */
  public showNotification(message: string, options: NotificationOptions = {}): void {
    const {
      duration = 3000,
      position = 'top-right',
      showInMiniPlayer = true,
      category,
      timeSaved,
    } = options;

    // Check if we're in mini-player mode
    const isMiniPlayer = document.querySelector('.ytp-miniplayer-active') !== null;

    if (isMiniPlayer && !showInMiniPlayer) {
      return; // Don't show notification in mini-player if disabled
    }

    const notification = this.createNotificationElement(message, category, timeSaved, isMiniPlayer);
    this.positionNotification(notification, position, isMiniPlayer);

    document.body.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
      notification.classList.add('visible');
    });

    // Auto-remove
    setTimeout(() => {
      notification.classList.remove('visible');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, duration);
  }

  /**
   * Create notification element
   */
  private createNotificationElement(
    message: string,
    category?: string,
    timeSaved?: number,
    isMiniPlayer = false
  ): HTMLElement {
    const notification = document.createElement('div');
    notification.className = `sponsorskip-notification ${isMiniPlayer ? 'mini-player' : ''}`;

    if (category) {
      notification.classList.add(`category-${category}`);
    }

    const content = document.createElement('div');
    content.className = 'sponsorskip-notification-content';
    content.textContent = message;

    notification.appendChild(content);

    // Add progress bar for timed notifications
    if (timeSaved) {
      const progressBar = document.createElement('div');
      progressBar.className = 'sponsorskip-notification-progress';
      notification.appendChild(progressBar);
    }

    // Add close button for longer notifications
    const closeBtn = document.createElement('button');
    closeBtn.className = 'sponsorskip-notification-close';
    closeBtn.innerHTML = '×';
    closeBtn.onclick = () => {
      notification.classList.remove('visible');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    };
    notification.appendChild(closeBtn);

    return notification;
  }

  /**
   * Position notification based on options and mini-player state
   */
  private positionNotification(
    notification: HTMLElement,
    position: string,
    isMiniPlayer: boolean
  ): void {
    if (isMiniPlayer) {
      // Special positioning for mini-player
      notification.style.position = 'fixed';
      notification.style.bottom = '80px';
      notification.style.right = '20px';
      notification.style.zIndex = '10001';
      return;
    }

    // Regular positioning
    notification.style.position = 'fixed';
    notification.style.zIndex = '10000';

    switch (position) {
      case 'top-right':
        notification.style.top = '20px';
        notification.style.right = '20px';
        break;
      case 'top-left':
        notification.style.top = '20px';
        notification.style.left = '20px';
        break;
      case 'bottom-right':
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        break;
      case 'bottom-left':
        notification.style.bottom = '20px';
        notification.style.left = '20px';
        break;
      case 'center':
        notification.style.top = '50%';
        notification.style.left = '50%';
        notification.style.transform = 'translate(-50%, -50%)';
        break;
    }
  }

  /**
   * Update internal statistics
   */
  private updateStats(category: string, duration: number): void {
    this.stats.totalSkips++;
    this.stats.timeSaved += duration;
  }

  /**
   * Get current video statistics
   */
  public getStats(): VideoStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics for new video
   */
  public resetStats(): void {
    this.stats = {
      totalSkips: 0,
      timeSaved: 0,
    };
  }

  /**
   * Initialize notification styles
   */
  public initStyles(): void {
    if (document.getElementById('sponsorskip-notification-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'sponsorskip-notification-styles';
    styles.textContent = `
      .sponsorskip-notification {
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-family: "YouTube Sans", "Roboto", sans-serif;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        opacity: 0;
        transform: translateY(-20px);
        transition: all 0.3s ease;
        max-width: 300px;
        position: relative;
        overflow: hidden;
      }

      .sponsorskip-notification.visible {
        opacity: 1;
        transform: translateY(0);
      }

      .sponsorskip-notification.mini-player {
        font-size: 12px;
        padding: 8px 12px;
        max-width: 200px;
        border-radius: 6px;
      }

      .sponsorskip-notification-content {
        margin-right: 20px;
        line-height: 1.4;
      }

      .sponsorskip-notification-close {
        position: absolute;
        top: 4px;
        right: 4px;
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.7);
        font-size: 16px;
        cursor: pointer;
        padding: 4px;
        line-height: 1;
        transition: color 0.2s;
      }

      .sponsorskip-notification-close:hover {
        color: white;
      }

      .sponsorskip-notification-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: rgba(255, 255, 255, 0.3);
        width: 100%;
        animation: progressBar 3s linear;
      }

      @keyframes progressBar {
        from { width: 100%; }
        to { width: 0%; }
      }

      /* Category-specific colors */
      .sponsorskip-notification.category-sponsor {
        border-left: 4px solid #ff4444;
      }

      .sponsorskip-notification.category-selfpromo {
        border-left: 4px solid #ff9500;
      }

      .sponsorskip-notification.category-interaction {
        border-left: 4px solid #cc00ff;
      }

      .sponsorskip-notification.category-intro {
        border-left: 4px solid #00ffff;
      }

      .sponsorskip-notification.category-outro {
        border-left: 4px solid #008080;
      }

      /* Stacking notifications */
      .sponsorskip-notification:nth-of-type(2) {
        margin-top: 60px;
      }

      .sponsorskip-notification:nth-of-type(3) {
        margin-top: 120px;
      }

      /* Responsive adjustments */
      @media (max-width: 768px) {
        .sponsorskip-notification {
          max-width: 250px;
          font-size: 13px;
        }
        
        .sponsorskip-notification.mini-player {
          max-width: 180px;
          font-size: 11px;
        }
      }

      /* Theater mode adjustments */
      .ytp-big-mode .sponsorskip-notification {
        font-size: 15px;
      }

      /* Fullscreen adjustments */
      .ytp-fullscreen .sponsorskip-notification {
        font-size: 16px;
        padding: 14px 18px;
      }
    `;

    document.head.appendChild(styles);
  }
}
