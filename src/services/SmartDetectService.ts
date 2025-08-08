// src/services/SmartDetectService.ts

export interface Cue {
  start: number; // seconds
  text: string;
}

export interface Segment {
  start: number; // seconds
  end: number; // seconds
}

export class SmartDetectService {
  private startRegex =
    /\b(sponsor|sponsored|sponsorship|sponsoring|brought to you by|thanks to)\b/i;
  private endRegex = /\b(now (let'?s|we)|back to|let'?s get started)\b/i;
  private maxDuration = 30; // default max sponsor block length in seconds

  constructor(startKeywords?: RegExp, endKeywords?: RegExp, maxDuration?: number) {
    if (startKeywords) this.startRegex = startKeywords;
    if (endKeywords) this.endRegex = endKeywords;
    if (maxDuration) this.maxDuration = maxDuration;
  }

  detectSegments(cues: Cue[]): Segment[] {
    const segments: Segment[] = [];

    for (let i = 0; i < cues.length; i++) {
      const cue = cues[i];

      // 1. Detect start
      if (this.startRegex.test(cue.text)) {
        const startTime = Math.max(cue.start - 2, 0);
        let endTime: number | null = null;

        // 2. Look for end within next 5 cues
        for (let j = i + 1; j < Math.min(cues.length, i + 6); j++) {
          if (this.endRegex.test(cues[j].text)) {
            endTime = cues[j].start + 2;
            break;
          }
        }

        // 3. Fallback: maxDuration
        if (endTime === null) {
          endTime = startTime + this.maxDuration;
        }

        // 4. Push segment
        segments.push({ start: startTime, end: endTime });
      }
    }

    console.log(`[SmartDetect] Detected ${segments.length} segments:`, segments);
    return segments;
  }
}
