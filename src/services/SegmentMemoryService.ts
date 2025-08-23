// src/services/SegmentMemoryService.ts

import { Segment } from '../types/types';

export interface UserAction {
  videoId: string;
  segmentId: string;
  action: 'skip' | 'unskip' | 'mute' | 'manual_skip';
  timestamp: number;
  segmentStart: number;
  segmentEnd: number;
  category?: string;
}

export interface VideoSegmentData {
  videoId: string;
  segments: Segment[];
  userActions: UserAction[];
  lastUpdated: number;
  timeSaved: number;
}

export interface UserPreferences {
  autoSkipCategories: string[];
  muteCategories: string[];
  skipThreshold: number; // confidence threshold for auto-skip
  enableLearning: boolean;
  syncEnabled: boolean;
}

export class SegmentMemoryService {
  private static instance: SegmentMemoryService;
  private cache = new Map<string, VideoSegmentData>();
  private preferences: UserPreferences = {
    autoSkipCategories: ['sponsor'],
    muteCategories: [],
    skipThreshold: 0.7,
    enableLearning: true,
    syncEnabled: true,
  };

  private isInitialized = false;

  private constructor() {
    // Don't call async method in constructor
  }

  public static getInstance(): SegmentMemoryService {
    if (!SegmentMemoryService.instance) {
      SegmentMemoryService.instance = new SegmentMemoryService();
    }
    return SegmentMemoryService.instance;
  }

  /**
   * Initialize the service (call this before using)
   */
  public async initialize(): Promise<void> {
    if (!this.isInitialized) {
      await this.loadPreferences();
      this.isInitialized = true;
    }
  }

  /**
   * Load user preferences from storage
   */
  private async loadPreferences(): Promise<void> {
    try {
      const stored = await chrome.storage.sync.get('userPreferences');
      if (stored.userPreferences) {
        this.preferences = { ...this.preferences, ...stored.userPreferences };
      }
    } catch (error) {
      console.warn('[SegmentMemory] Failed to load preferences:', error);
    }
  }

  /**
   * Save user preferences to storage
   */
  public async savePreferences(): Promise<void> {
    try {
      await chrome.storage.sync.set({ userPreferences: this.preferences });
    } catch (error) {
      console.error('[SegmentMemory] Failed to save preferences:', error);
    }
  }

  /**
   * Get user preferences
   */
  public getPreferences(): UserPreferences {
    return { ...this.preferences };
  }

  /**
   * Update user preferences
   */
  public async updatePreferences(updates: Partial<UserPreferences>): Promise<void> {
    this.preferences = { ...this.preferences, ...updates };
    await this.savePreferences();
  }

  /**
   * Record a user action for learning
   */
  public async recordUserAction(action: UserAction): Promise<void> {
    const key = `video_${action.videoId}`;
    let videoData = this.cache.get(action.videoId);

    if (!videoData) {
      videoData = await this.getVideoData(action.videoId);
    }

    // Add the action
    videoData.userActions.push(action);
    videoData.lastUpdated = Date.now();

    // Update time saved if it's a skip action
    if (action.action === 'skip' || action.action === 'manual_skip') {
      videoData.timeSaved += action.segmentEnd - action.segmentStart;
    }

    // Cache and persist
    this.cache.set(action.videoId, videoData);
    await this.persistVideoData(videoData);

    // Learn from the action if learning is enabled
    if (this.preferences.enableLearning) {
      await this.learnFromAction(action);
    }
  }

  /**
   * Learn user preferences from their actions
   */
  private async learnFromAction(action: UserAction): Promise<void> {
    if (!action.category) return;

    const recentActions = await this.getRecentActionsForCategory(action.category, 10);
    const skipCount = recentActions.filter(
      (a) => a.action === 'skip' || a.action === 'manual_skip'
    ).length;
    const unskipCount = recentActions.filter((a) => a.action === 'unskip').length;
    const muteCount = recentActions.filter((a) => a.action === 'mute').length;

    // Auto-adjust preferences based on user behavior
    const totalActions = recentActions.length;
    if (totalActions >= 5) {
      const skipRatio = skipCount / totalActions;
      const muteRatio = muteCount / totalActions;

      // If user consistently skips this category, add it to auto-skip
      if (skipRatio > 0.8 && !this.preferences.autoSkipCategories.includes(action.category)) {
        this.preferences.autoSkipCategories.push(action.category);
        console.log(`[SegmentMemory] Learned to auto-skip category: ${action.category}`);
      }

      // If user consistently mutes this category, add it to mute list
      if (muteRatio > 0.6 && !this.preferences.muteCategories.includes(action.category)) {
        this.preferences.muteCategories.push(action.category);
        console.log(`[SegmentMemory] Learned to mute category: ${action.category}`);
      }

      // If user consistently unskips, remove from auto-skip
      if (unskipCount / totalActions > 0.5) {
        this.preferences.autoSkipCategories = this.preferences.autoSkipCategories.filter(
          (cat) => cat !== action.category
        );
        console.log(`[SegmentMemory] Learned to not auto-skip category: ${action.category}`);
      }

      await this.savePreferences();
    }
  }

  /**
   * Get recent actions for a specific category
   */
  private async getRecentActionsForCategory(
    category: string,
    limit: number
  ): Promise<UserAction[]> {
    const allActions: UserAction[] = [];

    // Get actions from cache
    for (const videoData of this.cache.values()) {
      allActions.push(...videoData.userActions.filter((a) => a.category === category));
    }

    // Sort by timestamp and limit
    return allActions.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  /**
   * Get video data from cache or storage
   */
  public async getVideoData(videoId: string): Promise<VideoSegmentData> {
    // Check cache first
    if (this.cache.has(videoId)) {
      return this.cache.get(videoId)!;
    }

    // Load from storage
    try {
      const key = `video_${videoId}`;
      const stored = await chrome.storage.local.get(key);

      if (stored[key]) {
        const videoData = stored[key] as VideoSegmentData;
        this.cache.set(videoId, videoData);
        return videoData;
      }
    } catch (error) {
      console.warn('[SegmentMemory] Failed to load video data:', error);
    }

    // Return empty data if not found
    const emptyData: VideoSegmentData = {
      videoId,
      segments: [],
      userActions: [],
      lastUpdated: Date.now(),
      timeSaved: 0,
    };

    this.cache.set(videoId, emptyData);
    return emptyData;
  }

  /**
   * Store video data to persistent storage
   */
  private async persistVideoData(videoData: VideoSegmentData): Promise<void> {
    try {
      const key = `video_${videoData.videoId}`;
      await chrome.storage.local.set({ [key]: videoData });
    } catch (error) {
      console.error('[SegmentMemory] Failed to persist video data:', error);
    }
  }

  /**
   * Update segments for a video
   */
  public async updateVideoSegments(videoId: string, segments: Segment[]): Promise<void> {
    const videoData = await this.getVideoData(videoId);
    videoData.segments = segments;
    videoData.lastUpdated = Date.now();

    this.cache.set(videoId, videoData);
    await this.persistVideoData(videoData);
  }

  /**
   * Get segments with user preference filtering
   */
  public async getFilteredSegments(videoId: string): Promise<Segment[]> {
    const videoData = await this.getVideoData(videoId);

    return videoData.segments.filter((segment) => {
      if (!segment.category) return true;

      // Check if user has consistently unskipped this category
      const categoryActions = videoData.userActions.filter((a) => a.category === segment.category);
      const unskipCount = categoryActions.filter((a) => a.action === 'unskip').length;

      if (unskipCount > 2 && categoryActions.length > 3) {
        return false; // User doesn't want this category skipped
      }

      return this.preferences.autoSkipCategories.includes(segment.category);
    });
  }

  /**
   * Check if a segment should be muted instead of skipped
   */
  public shouldMuteSegment(segment: Segment): boolean {
    if (!segment.category) return false;
    return this.preferences.muteCategories.includes(segment.category);
  }

  /**
   * Get total time saved across all videos
   */
  public async getTotalTimeSaved(): Promise<number> {
    let total = 0;

    // Add from cache
    for (const videoData of this.cache.values()) {
      total += videoData.timeSaved;
    }

    // Add from storage (for videos not in cache)
    try {
      const allData = await chrome.storage.local.get();
      for (const [key, value] of Object.entries(allData)) {
        if (key.startsWith('video_') && !this.cache.has(key.replace('video_', ''))) {
          const videoData = value as VideoSegmentData;
          total += videoData.timeSaved;
        }
      }
    } catch (error) {
      console.warn('[SegmentMemory] Failed to calculate total time saved:', error);
    }

    return total;
  }

  /**
   * Clear old data to prevent storage bloat
   */
  public async cleanupOldData(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    const cutoff = Date.now() - maxAge;
    const keysToRemove: string[] = [];

    try {
      const allData = await chrome.storage.local.get();

      for (const [key, value] of Object.entries(allData)) {
        if (key.startsWith('video_')) {
          const videoData = value as VideoSegmentData;
          if (videoData.lastUpdated < cutoff) {
            keysToRemove.push(key);
            this.cache.delete(key.replace('video_', ''));
          }
        }
      }

      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
        console.log(`[SegmentMemory] Cleaned up ${keysToRemove.length} old video records`);
      }
    } catch (error) {
      console.error('[SegmentMemory] Failed to cleanup old data:', error);
    }
  }
}
