// src/services/EnhancedSkipperService.ts

import { Segment } from '../types/types';
import { SegmentMemoryService, UserAction } from './SegmentMemoryService';
import { PerformanceService } from './PerformanceService';

export interface SkipAction {
  type: 'skip' | 'mute' | 'preview';
  segment: Segment;
  confidence: number;
}

export interface SkipPreview {
  segment: Segment;
  thumbnailUrl?: string;
  previewText: string;
  timeUntilSkip: number;
}

export class EnhancedSkipperService {
  private memoryService = SegmentMemoryService.getInstance();
  private performanceService = PerformanceService.getInstance();
  private mutedSegments = new Set<string>();
  private originalVolume = 1;
  private isPreviewMode = false;

  constructor(
    private videoId: string,
    private getVideo: () => HTMLVideoElement | null
  ) {}

  /**
   * Process segments and determine skip actions
   */
  public async processSegments(segments: Segment[]): Promise<SkipAction[]> {
    const optimizedSegments = this.performanceService.optimizeSegments(segments);
    const preferences = this.memoryService.getPreferences();
    const actions: SkipAction[] = [];

    for (const segment of optimizedSegments) {
      let confidence = 0.8; // Base confidence

      // Adjust confidence based on user history
      const videoData = await this.memoryService.getVideoData(this.videoId);
      const segmentActions = videoData.userActions.filter(
        (a) => Math.abs(a.segmentStart - segment.start) < 2
      );

      if (segmentActions.length > 0) {
        const skipCount = segmentActions.filter((a) => a.action === 'skip').length;
        const unskipCount = segmentActions.filter((a) => a.action === 'unskip').length;

        if (unskipCount > skipCount) {
          confidence = 0.2; // User doesn't want this skipped
        } else if (skipCount > 0) {
          confidence = 0.95; // User has skipped this before
        }
      }

      // Check user preferences for this category
      const category = segment.category || 'unknown';

      // Skip if category is set to ignore
      if (
        !preferences.autoSkipCategories.includes(category) &&
        !preferences.muteCategories.includes(category)
      ) {
        continue; // User wants to ignore this category
      }

      // Determine action type based on user preferences
      let actionType: 'skip' | 'mute' | 'preview' = 'skip';

      if (preferences.muteCategories.includes(category)) {
        actionType = 'mute';
      } else if (preferences.autoSkipCategories.includes(category)) {
        if (confidence < preferences.skipThreshold) {
          continue; // Confidence too low
        }
        actionType = 'skip';
      } else if (confidence < 0.9 && preferences.enableLearning) {
        actionType = 'preview'; // Show preview for uncertain segments
      }

      actions.push({
        type: actionType,
        segment,
        confidence,
      });
    }

    return actions;
  }

  /**
   * Execute skip action (skip, mute, or preview)
   */
  public async executeAction(action: SkipAction): Promise<boolean> {
    const video = this.getVideo();
    if (!video) return false;

    const segmentId = `${action.segment.start}-${action.segment.end}`;

    switch (action.type) {
      case 'skip':
        return this.skipSegment(action.segment, video);

      case 'mute':
        return this.muteSegment(action.segment, video, segmentId);

      case 'preview':
        return this.showPreview(action.segment, video);

      default:
        return false;
    }
  }

  /**
   * Skip segment (traditional behavior)
   */
  private async skipSegment(segment: Segment, video: HTMLVideoElement): Promise<boolean> {
    try {
      const oldTime = video.currentTime;
      video.currentTime = segment.end;

      // Record the action
      await this.recordAction({
        videoId: this.videoId,
        segmentId: `${segment.start}-${segment.end}`,
        action: 'skip',
        timestamp: Date.now(),
        segmentStart: segment.start,
        segmentEnd: segment.end,
        category: segment.category,
      });

      console.log(
        `[EnhancedSkipper] Skipped segment: ${oldTime.toFixed(1)}s → ${segment.end.toFixed(1)}s`
      );
      return true;
    } catch (error) {
      console.error('[EnhancedSkipper] Skip failed:', error);
      return false;
    }
  }

  /**
   * Mute segment instead of skipping
   */
  private async muteSegment(
    segment: Segment,
    video: HTMLVideoElement,
    segmentId: string
  ): Promise<boolean> {
    try {
      if (!this.mutedSegments.has(segmentId)) {
        this.originalVolume = video.volume;
        video.volume = 0;
        this.mutedSegments.add(segmentId);

        // Set up unmute when segment ends
        const checkUnmute = () => {
          if (video.currentTime >= segment.end) {
            video.volume = this.originalVolume;
            this.mutedSegments.delete(segmentId);
            video.removeEventListener('timeupdate', checkUnmute);
          }
        };
        video.addEventListener('timeupdate', checkUnmute);

        // Record the action
        await this.recordAction({
          videoId: this.videoId,
          segmentId,
          action: 'mute',
          timestamp: Date.now(),
          segmentStart: segment.start,
          segmentEnd: segment.end,
          category: segment.category,
        });

        console.log(
          `[EnhancedSkipper] Muted segment: ${segment.start.toFixed(1)}s - ${segment.end.toFixed(1)}s`
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('[EnhancedSkipper] Mute failed:', error);
      return false;
    }
  }

  /**
   * Show preview before skipping
   */
  private async showPreview(segment: Segment, video: HTMLVideoElement): Promise<boolean> {
    if (this.isPreviewMode) return false;

    this.isPreviewMode = true;
    const preview = await this.createPreview(segment, video);

    // Show preview UI
    this.displayPreviewUI(preview, async (userChoice: 'skip' | 'keep' | 'mute') => {
      this.isPreviewMode = false;

      switch (userChoice) {
        case 'skip':
          await this.skipSegment(segment, video);
          break;
        case 'mute':
          await this.muteSegment(segment, video, `${segment.start}-${segment.end}`);
          break;
        case 'keep':
          await this.recordAction({
            videoId: this.videoId,
            segmentId: `${segment.start}-${segment.end}`,
            action: 'unskip',
            timestamp: Date.now(),
            segmentStart: segment.start,
            segmentEnd: segment.end,
            category: segment.category,
          });
          break;
      }
    });

    return true;
  }

  /**
   * Create preview data for segment
   */
  private async createPreview(segment: Segment, video: HTMLVideoElement): Promise<SkipPreview> {
    const timeUntilSkip = Math.max(0, segment.start - video.currentTime);

    // Generate thumbnail URL (YouTube's thumbnail API)
    const thumbnailUrl = `https://img.youtube.com/vi/${this.videoId}/maxresdefault.jpg`;

    let previewText = `${segment.category || 'Segment'} detected`;
    if (segment.category === 'sponsor') {
      previewText = 'Sponsor segment detected';
    } else if (segment.category === 'selfpromo') {
      previewText = 'Self-promotion detected';
    } else if (segment.category === 'interaction') {
      previewText = 'Interaction reminder detected';
    }

    return {
      segment,
      thumbnailUrl,
      previewText,
      timeUntilSkip,
    };
  }

  /**
   * Display preview UI
   */
  private displayPreviewUI(
    preview: SkipPreview,
    onChoice: (choice: 'skip' | 'keep' | 'mute') => void
  ): void {
    try {
      // Remove any existing preview
      const existingPreview = document.getElementById('sponsorskip-preview');
      if (existingPreview) {
        existingPreview.remove();
      }

      const previewEl = document.createElement('div');
      previewEl.id = 'sponsorskip-preview';
      previewEl.className = 'sponsorskip-preview-container';

      previewEl.innerHTML = `
      <div class="sponsorskip-preview-content">
        <div class="sponsorskip-preview-header">
          <span class="sponsorskip-preview-title">${preview.previewText}</span>
          <span class="sponsorskip-preview-time">${Math.round(preview.segment.end - preview.segment.start)}s</span>
        </div>
        <div class="sponsorskip-preview-actions">
          <button class="sponsorskip-preview-btn skip" data-action="skip">Skip</button>
          <button class="sponsorskip-preview-btn mute" data-action="mute">Mute</button>
          <button class="sponsorskip-preview-btn keep" data-action="keep">Keep</button>
        </div>
        <div class="sponsorskip-preview-countdown">
          <div class="sponsorskip-preview-progress"></div>
        </div>
      </div>
    `;

      // Add event listeners
      previewEl.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('sponsorskip-preview-btn')) {
          const action = target.dataset.action as 'skip' | 'keep' | 'mute';
          onChoice(action);
          previewEl.remove();
        }
      });

      // Auto-skip after 5 seconds if no choice made
      const autoSkipTimeout = setTimeout(() => {
        onChoice('skip');
        previewEl.remove();
      }, 5000);

      // Update countdown
      const progressBar = previewEl.querySelector('.sponsorskip-preview-progress') as HTMLElement;
      let countdown = 5;
      const countdownInterval = setInterval(() => {
        countdown--;
        if (progressBar) {
          progressBar.style.width = `${(countdown / 5) * 100}%`;
        }
        if (countdown <= 0) {
          clearInterval(countdownInterval);
        }
      }, 1000);

      // Clean up on removal
      previewEl.addEventListener('remove', () => {
        clearTimeout(autoSkipTimeout);
        clearInterval(countdownInterval);
      });

      // Inject styles if not already present
      this.injectPreviewStyles();

      // Add to page
      document.body.appendChild(previewEl);
    } catch (error) {
      console.error('[EnhancedSkipper] Failed to display preview UI:', error);
      // Fallback: just skip the segment
      onChoice('skip');
    }
  }

  /**
   * Inject CSS for preview UI
   */
  private injectPreviewStyles(): void {
    try {
      if (document.getElementById('sponsorskip-preview-styles')) return;

      const styles = document.createElement('style');
      styles.id = 'sponsorskip-preview-styles';
      styles.textContent = `
      .sponsorskip-preview-container {
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        border-radius: 8px;
        padding: 16px;
        z-index: 10000;
        font-family: "YouTube Sans", "Roboto", sans-serif;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        min-width: 280px;
        animation: slideIn 0.3s ease-out;
      }

      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      .sponsorskip-preview-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .sponsorskip-preview-title {
        font-weight: 500;
      }

      .sponsorskip-preview-time {
        background: rgba(255, 255, 255, 0.2);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 12px;
      }

      .sponsorskip-preview-actions {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
      }

      .sponsorskip-preview-btn {
        flex: 1;
        padding: 8px 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.2s;
      }

      .sponsorskip-preview-btn.skip {
        background: #ff4444;
        color: white;
      }

      .sponsorskip-preview-btn.mute {
        background: #ff9500;
        color: white;
      }

      .sponsorskip-preview-btn.keep {
        background: #00aa00;
        color: white;
      }

      .sponsorskip-preview-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      .sponsorskip-preview-countdown {
        height: 3px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        overflow: hidden;
      }

      .sponsorskip-preview-progress {
        height: 100%;
        background: #ff4444;
        width: 100%;
        transition: width 1s linear;
      }
    `;

      document.head.appendChild(styles);
    } catch (error) {
      console.error('[EnhancedSkipper] Failed to inject preview styles:', error);
    }
  }

  /**
   * Record user action for learning
   */
  private async recordAction(action: UserAction): Promise<void> {
    await this.memoryService.recordUserAction(action);
  }

  /**
   * Get time saved for current video
   */
  public async getVideoTimeSaved(): Promise<number> {
    const videoData = await this.memoryService.getVideoData(this.videoId);
    return videoData.timeSaved;
  }

  /**
   * Clean up muted segments
   */
  public cleanup(): void {
    const video = this.getVideo();
    if (video && this.mutedSegments.size > 0) {
      video.volume = this.originalVolume;
      this.mutedSegments.clear();
    }

    // Remove preview if present
    const preview = document.getElementById('sponsorskip-preview');
    if (preview) {
      preview.remove();
    }

    this.isPreviewMode = false;
  }
}
