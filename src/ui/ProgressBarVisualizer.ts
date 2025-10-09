// src/ui/ProgressBarVisualizer.ts

import { Segment } from '../types/types';
import { withRetry } from '../utils/retry';

export interface SegmentMarker {
  segment: Segment;
  color: string;
  opacity: number;
}

export class ProgressBarVisualizer {
  private progressBar?: HTMLElement;
  private segmentContainer?: HTMLElement;
  private markers: SegmentMarker[] = [];
  private observer?: MutationObserver;
  private videoDuration = 0;

  // Category color mapping (all green for visual appeal)
  private categoryColors = {
    sponsor: '#00ff00', // green
    selfpromo: '#ffffffff',
    interaction: '#ffffffff',
    intro: '#ffffffff',
    outro: '#ffffffff',
    preview: '#ffffffff',
    music_offtopic: '#ffffffff',
    filler: '#ffffffff',
    default: '#ffffffff',
  };

  constructor(private segments: Segment[]) {
    this.createMarkers();
  }

  /**
   * Initialize the visualizer
   */
  public async init(): Promise<void> {
    await this.findProgressBar();
    this.injectStyles();
    this.createSegmentContainer();
    this.renderMarkers();
    this.setupVideoObserver();
    this.watchForProgressBarChanges();
  }

  /**
   * Find YouTube's progress bar
   */
  private async findProgressBar(): Promise<void> {
    const selectors = [
      '.ytp-progress-bar-container',
      '.ytp-progress-bar',
      '#movie_player .ytp-progress-bar-container',
      '.html5-progress-bar-container',
    ];

    for (const selector of selectors) {
      try {
        this.progressBar = await withRetry(
          async () => {
            const el = document.querySelector<HTMLElement>(selector);
            if (!el) throw new Error(`No progress bar found: ${selector}`);
            return el;
          },
          5,
          500
        );
        console.log('[ProgressBarVisualizer] Found progress bar:', selector);
        return;
      } catch {
        continue;
      }
    }

    throw new Error('[ProgressBarVisualizer] Could not find progress bar');
  }

  /**
   * Create markers from segments
   */
  private createMarkers(): void {
    this.markers = this.segments.map((segment) => ({
      segment,
      color:
        this.categoryColors[segment.category as keyof typeof this.categoryColors] ||
        this.categoryColors.default,
      opacity: 0.8,
    }));
  }

  /**
   * Create container for segment markers
   */
  private createSegmentContainer(): void {
    if (!this.progressBar) return;

    // Remove existing container
    const existing = this.progressBar.querySelector('.sponsorskip-segments');
    if (existing) {
      existing.remove();
    }

    this.segmentContainer = document.createElement('div');
    this.segmentContainer.className = 'sponsorskip-segments';
    this.progressBar.appendChild(this.segmentContainer);
  }

  /**
   * Render segment markers on progress bar
   */
  private renderMarkers(): void {
    if (!this.segmentContainer || this.videoDuration === 0) return;

    // Clear existing markers
    this.segmentContainer.innerHTML = '';

    for (const marker of this.markers) {
      const markerEl = document.createElement('div');
      markerEl.className = 'sponsorskip-segment-marker';

      const startPercent = (marker.segment.start / this.videoDuration) * 100;
      const widthPercent = ((marker.segment.end - marker.segment.start) / this.videoDuration) * 100;

      markerEl.style.left = `${startPercent}%`;
      markerEl.style.width = `${widthPercent}%`;
      markerEl.style.backgroundColor = marker.color;
      markerEl.style.opacity = marker.opacity.toString();

      // Add tooltip
      const duration = Math.round(marker.segment.end - marker.segment.start);
      const category = marker.segment.category || 'segment';
      markerEl.title = `${category} (${duration}s)`;

      // Add category class for additional styling
      if (marker.segment.category) {
        markerEl.classList.add(`sponsorskip-${marker.segment.category}`);
      }

      this.segmentContainer.appendChild(markerEl);
    }
  }

  /**
   * Setup video duration observer
   */
  private setupVideoObserver(): void {
    const video = document.querySelector<HTMLVideoElement>('video');
    if (!video) return;

    const updateDuration = () => {
      if (video.duration && video.duration !== this.videoDuration) {
        this.videoDuration = video.duration;
        this.renderMarkers();
      }
    };

    // Initial check
    updateDuration();

    // Listen for duration changes
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('durationchange', updateDuration);
  }

  /**
   * Watch for progress bar changes (YouTube SPA navigation)
   */
  private watchForProgressBarChanges(): void {
    this.observer = new MutationObserver(() => {
      // Re-initialize if progress bar is missing
      if (this.progressBar && !document.contains(this.progressBar)) {
        this.reinitialize();
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Re-initialize after navigation
   */
  private async reinitialize(): Promise<void> {
    try {
      await this.findProgressBar();
      this.createSegmentContainer();
      this.renderMarkers();
      this.setupVideoObserver();
    } catch (error) {
      console.warn('[ProgressBarVisualizer] Reinitialize failed:', error);
    }
  }

  /**
   * Update segments and re-render
   */
  public updateSegments(segments: Segment[]): void {
    this.segments = segments;
    this.createMarkers();
    this.renderMarkers();
  }

  /**
   * Highlight upcoming segment
   */
  public highlightUpcomingSegment(currentTime: number, lookahead: number = 10): void {
    if (!this.segmentContainer) return;

    const upcomingSegment = this.segments.find(
      (segment) => segment.start > currentTime && segment.start <= currentTime + lookahead
    );

    // Remove existing highlights
    this.segmentContainer.querySelectorAll('.sponsorskip-upcoming').forEach((el) => {
      el.classList.remove('sponsorskip-upcoming');
    });

    if (upcomingSegment) {
      const markerIndex = this.segments.indexOf(upcomingSegment);
      const markerEl = this.segmentContainer.children[markerIndex] as HTMLElement;
      if (markerEl) {
        markerEl.classList.add('sponsorskip-upcoming');
      }
    }
  }

  /**
   * Show segment preview on hover
   */
  private setupHoverPreview(): void {
    if (!this.segmentContainer) return;

    this.segmentContainer.addEventListener(
      'mouseenter',
      (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('sponsorskip-segment-marker')) {
          this.showSegmentPreview(target);
        }
      },
      true
    );

    this.segmentContainer.addEventListener(
      'mouseleave',
      (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('sponsorskip-segment-marker')) {
          this.hideSegmentPreview();
        }
      },
      true
    );
  }

  /**
   * Show segment preview tooltip
   */
  private showSegmentPreview(markerEl: HTMLElement): void {
    const preview = document.createElement('div');
    preview.className = 'sponsorskip-segment-preview';
    preview.innerHTML = `
      <div class="sponsorskip-preview-content">
        ${markerEl.title}
        <div class="sponsorskip-preview-actions">
          <button class="sponsorskip-preview-skip">Skip</button>
          <button class="sponsorskip-preview-mute">Mute</button>
        </div>
      </div>
    `;

    const rect = markerEl.getBoundingClientRect();
    preview.style.left = `${rect.left}px`;
    preview.style.top = `${rect.top - 60}px`;

    document.body.appendChild(preview);
  }

  /**
   * Hide segment preview tooltip
   */
  private hideSegmentPreview(): void {
    const preview = document.querySelector('.sponsorskip-segment-preview');
    if (preview) {
      preview.remove();
    }
  }

  /**
   * Inject CSS styles
   */
  private injectStyles(): void {
    if (document.getElementById('sponsorskip-progressbar-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'sponsorskip-progressbar-styles';
    styles.textContent = `
      .sponsorskip-segments {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 1;
      }

      .sponsorskip-segment-marker {
        position: absolute;
        top: 0;
        bottom: 0;
        border-radius: 2px;
        transition: all 0.2s ease;
        pointer-events: auto;
        cursor: pointer;
      }

      .sponsorskip-segment-marker:hover {
        opacity: 1 !important;
        transform: scaleY(1.2);
        z-index: 2;
      }

      .sponsorskip-segment-marker.sponsorskip-upcoming {
        animation: pulse 1s infinite;
        z-index: 3;
      }

      @keyframes pulse {
        0%, 100% { opacity: 0.8; }
        50% { opacity: 1; }
      }

      /* Category-specific styles */
      .sponsorskip-sponsor {
        border-top: 2px solid #ff6666;
      }

      .sponsorskip-selfpromo {
        border-top: 2px solid #ffb366;
      }

      .sponsorskip-interaction {
        border-top: 2px solid #e066ff;
      }

      .sponsorskip-intro {
        border-top: 2px solid #66ffff;
      }

      .sponsorskip-outro {
        border-top: 2px solid #66b3b3;
      }

      .sponsorskip-segment-preview {
        position: fixed;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 10000;
        pointer-events: none;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }

      .sponsorskip-preview-content {
        text-align: center;
      }

      .sponsorskip-preview-actions {
        margin-top: 8px;
        display: flex;
        gap: 4px;
      }

      .sponsorskip-preview-skip,
      .sponsorskip-preview-mute {
        padding: 4px 8px;
        border: none;
        border-radius: 2px;
        font-size: 10px;
        cursor: pointer;
        pointer-events: auto;
      }

      .sponsorskip-preview-skip {
        background: #ff4444;
        color: white;
      }

      .sponsorskip-preview-mute {
        background: #ff9500;
        color: white;
      }

      /* Mini-player compatibility */
      .ytp-miniplayer-active .sponsorskip-segments {
        display: none;
      }

      /* Theater mode adjustments */
      .ytp-big-mode .sponsorskip-segment-marker {
        border-radius: 3px;
      }

      /* Fullscreen adjustments */
      .ytp-fullscreen .sponsorskip-segment-marker {
        border-radius: 4px;
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Clean up
   */
  public destroy(): void {
    this.observer?.disconnect();
    this.segmentContainer?.remove();

    const preview = document.querySelector('.sponsorskip-segment-preview');
    if (preview) {
      preview.remove();
    }
  }
}
