import { Logger } from './Logger';

/**
 * Manages video element references with caching to reduce DOM queries
 */
export class VideoManager {
  private static instance: VideoManager;
  private cachedVideo: HTMLVideoElement | null = null;
  private observers: Set<MutationObserver> = new Set();

  private constructor() {
    this.setupVideoObserver();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): VideoManager {
    if (!VideoManager.instance) {
      VideoManager.instance = new VideoManager();
    }
    return VideoManager.instance;
  }

  /**
   * Get the current video element (cached)
   */
  public getVideo(): HTMLVideoElement | null {
    // Return cached video if it still exists in DOM
    if (this.cachedVideo && document.contains(this.cachedVideo)) {
      return this.cachedVideo;
    }

    // Find and cache new video element
    this.cachedVideo = document.querySelector<HTMLVideoElement>('video');
    if (this.cachedVideo) {
      Logger.log('Video element cached');
    }
    return this.cachedVideo;
  }

  /**
   * Force refresh of cached video element
   */
  public refresh(): HTMLVideoElement | null {
    this.cachedVideo = null;
    return this.getVideo();
  }

  /**
   * Setup observer to detect video element changes
   */
  private setupVideoObserver(): void {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // Check if video element was removed
        if (mutation.removedNodes.length > 0) {
          for (const node of Array.from(mutation.removedNodes)) {
            if (node === this.cachedVideo) {
              Logger.log('Video element removed, clearing cache');
              this.cachedVideo = null;
              return;
            }
          }
        }

        // Check if new video element was added
        if (mutation.addedNodes.length > 0) {
          for (const node of Array.from(mutation.addedNodes)) {
            if (node.nodeName === 'VIDEO') {
              Logger.log('New video element detected');
              this.cachedVideo = node as HTMLVideoElement;
              return;
            }
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    this.observers.add(observer);
  }

  /**
   * Get video duration
   */
  public getDuration(): number {
    const video = this.getVideo();
    return video?.duration || 0;
  }

  /**
   * Get current playback time
   */
  public getCurrentTime(): number {
    const video = this.getVideo();
    return video?.currentTime || 0;
  }

  /**
   * Set current playback time
   */
  public setCurrentTime(time: number): void {
    const video = this.getVideo();
    if (video) {
      video.currentTime = time;
    }
  }

  /**
   * Get/Set volume
   */
  public getVolume(): number {
    const video = this.getVideo();
    return video?.volume || 1;
  }

  public setVolume(volume: number): void {
    const video = this.getVideo();
    if (video) {
      video.volume = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Add event listener to video element
   */
  public addEventListener(
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ): void {
    const video = this.getVideo();
    if (video) {
      video.addEventListener(event, handler, options);
    }
  }

  /**
   * Remove event listener from video element
   */
  public removeEventListener(
    event: string,
    handler: EventListener,
    options?: EventListenerOptions
  ): void {
    const video = this.getVideo();
    if (video) {
      video.removeEventListener(event, handler, options);
    }
  }

  /**
   * Clean up observers
   */
  public destroy(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers.clear();
    this.cachedVideo = null;
  }
}
