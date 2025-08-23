// src/services/PerformanceService.ts

import { Segment } from '../types/types';

export interface BatchProcessingOptions {
  batchSize: number;
  processingDelay: number;
  maxConcurrent: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class PerformanceService {
  private static instance: PerformanceService;
  private cache = new Map<string, CacheEntry<any>>();
  private processingQueue: Array<() => Promise<void>> = [];
  private isProcessing = false;
  private cleanupInterval?: NodeJS.Timeout;
  private batchOptions: BatchProcessingOptions = {
    batchSize: 10,
    processingDelay: 100,
    maxConcurrent: 3,
  };

  private constructor() {
    // Clean up expired cache entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanupCache(), 5 * 60 * 1000);
  }

  public static getInstance(): PerformanceService {
    if (!PerformanceService.instance) {
      PerformanceService.instance = new PerformanceService();
    }
    return PerformanceService.instance;
  }

  /**
   * Cache data with TTL
   */
  public setCache<T>(key: string, data: T, ttl: number = 10 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Get cached data if not expired
   */
  public getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Batch process segments to reduce CPU usage
   */
  public async batchProcessSegments(
    segments: Segment[],
    processor: (segment: Segment) => Promise<Segment>
  ): Promise<Segment[]> {
    const results: Segment[] = [];
    const batches = this.createBatches(segments, this.batchOptions.batchSize);

    for (const batch of batches) {
      const batchPromises = batch.map((segment) => processor(segment));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches to prevent blocking
      if (this.batchOptions.processingDelay > 0) {
        await this.delay(this.batchOptions.processingDelay);
      }
    }

    return results;
  }

  /**
   * Create batches from array
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Add task to processing queue
   */
  public queueTask(task: () => Promise<void>): void {
    this.processingQueue.push(task);
    this.processQueue();
  }

  /**
   * Process queued tasks with concurrency control
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const concurrent: Promise<void>[] = [];

    while (this.processingQueue.length > 0 && concurrent.length < this.batchOptions.maxConcurrent) {
      const task = this.processingQueue.shift();
      if (task) {
        const promise = task().catch((error) => {
          console.error('[PerformanceService] Task failed:', error);
        });
        concurrent.push(promise);
      }
    }

    if (concurrent.length > 0) {
      await Promise.all(concurrent);
    }

    this.isProcessing = false;

    // Process remaining tasks
    if (this.processingQueue.length > 0) {
      setTimeout(() => this.processQueue(), this.batchOptions.processingDelay);
    }
  }

  /**
   * Debounce function calls
   */
  public debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  /**
   * Throttle function calls
   */
  public throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  }

  /**
   * Lazy load data with caching
   */
  public async lazyLoad<T>(
    key: string,
    loader: () => Promise<T>,
    ttl: number = 10 * 60 * 1000
  ): Promise<T> {
    // Check cache first
    const cached = this.getCache<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Load and cache
    const data = await loader();
    this.setCache(key, data, ttl);
    return data;
  }

  /**
   * Optimize segment processing for large datasets
   */
  public optimizeSegments(segments: Segment[]): Segment[] {
    // Remove duplicates
    const uniqueSegments = segments.filter((segment, index, array) => {
      return !array
        .slice(0, index)
        .some(
          (existing) =>
            Math.abs(existing.start - segment.start) < 1 && Math.abs(existing.end - segment.end) < 1
        );
    });

    // Sort by start time for efficient processing
    uniqueSegments.sort((a, b) => a.start - b.start);

    // Merge overlapping segments
    const mergedSegments: Segment[] = [];
    for (const segment of uniqueSegments) {
      const lastMerged = mergedSegments[mergedSegments.length - 1];

      if (lastMerged && segment.start <= lastMerged.end + 2) {
        // Merge overlapping or close segments
        lastMerged.end = Math.max(lastMerged.end, segment.end);
        if (!lastMerged.category && segment.category) {
          lastMerged.category = segment.category;
        }
      } else {
        mergedSegments.push({ ...segment });
      }
    }

    return mergedSegments;
  }

  /**
   * Create efficient segment lookup for time-based queries
   */
  public createSegmentIndex(segments: Segment[]): Map<number, Segment[]> {
    const index = new Map<number, Segment[]>();

    for (const segment of segments) {
      const startBucket = Math.floor(segment.start / 10) * 10; // 10-second buckets
      const endBucket = Math.floor(segment.end / 10) * 10;

      for (let bucket = startBucket; bucket <= endBucket; bucket += 10) {
        if (!index.has(bucket)) {
          index.set(bucket, []);
        }
        index.get(bucket)!.push(segment);
      }
    }

    return index;
  }

  /**
   * Find segments at current time using index
   */
  public findSegmentsAtTime(time: number, segmentIndex: Map<number, Segment[]>): Segment[] {
    const bucket = Math.floor(time / 10) * 10;
    const candidates = segmentIndex.get(bucket) || [];

    return candidates.filter((segment) => time >= segment.start && time < segment.end);
  }

  /**
   * Memory-efficient statistics calculation
   */
  public async calculateStatistics(videoIds: string[]): Promise<{
    totalVideos: number;
    totalSegments: number;
    totalTimeSaved: number;
    averageSegmentsPerVideo: number;
  }> {
    let totalSegments = 0;
    let totalTimeSaved = 0;
    let processedVideos = 0;

    // Process in batches to avoid memory issues
    const batches = this.createBatches(videoIds, 50);

    for (const batch of batches) {
      const batchPromises = batch.map(async (videoId) => {
        try {
          const key = `video_${videoId}`;
          const stored = await chrome.storage.local.get(key);

          if (stored[key]) {
            const videoData = stored[key];
            return {
              segments: videoData.segments?.length || 0,
              timeSaved: videoData.timeSaved || 0,
            };
          }
          return { segments: 0, timeSaved: 0 };
        } catch {
          return { segments: 0, timeSaved: 0 };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      for (const result of batchResults) {
        if (result.segments > 0) {
          processedVideos++;
          totalSegments += result.segments;
          totalTimeSaved += result.timeSaved;
        }
      }

      // Small delay between batches
      await this.delay(10);
    }

    return {
      totalVideos: processedVideos,
      totalSegments,
      totalTimeSaved,
      averageSegmentsPerVideo: processedVideos > 0 ? totalSegments / processedVideos : 0,
    };
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Update batch processing options
   */
  public updateBatchOptions(options: Partial<BatchProcessingOptions>): void {
    this.batchOptions = { ...this.batchOptions, ...options };
  }

  /**
   * Clear all caches
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; memoryUsage: number } {
    const size = this.cache.size;
    const memoryUsage = JSON.stringify([...this.cache.entries()]).length;

    return { size, memoryUsage };
  }

  /**
   * Destroy the service and clean up resources
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.cache.clear();
    this.processingQueue = [];
  }
}
