console.log("[BG] background script loaded");

import { Segment } from '../types/Segment';

const API_URL = 'https://sponsor.ajay.app/api/skipSegments';
const CACHE_TTL = 1000 * 60 * 60 * 6;

export class SponsorBlockService {
  static async fetchSegments(videoId: string): Promise<Segment[]> {
    const cacheKey = `sponsorblock_${videoId}`;
    const { [cacheKey]: cached } = await chrome.storage.local.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      return cached.segments as Segment[];
    }
    const resp = await fetch(`${API_URL}?videoID=${videoId}`);
    if (!resp.ok) throw new Error(`SponsorBlock API ${resp.status}`);
    const data = (await resp.json()) as {
      segment: [number, number];
      category: string;
    }[];
    const segments = data.map(d => ({
      start: d.segment[0],
      end: d.segment[1],
      category: d.category
    }));
    await chrome.storage.local.set({
      [cacheKey]: { fetchedAt: Date.now(), segments }
    });
    return segments;
  }
}