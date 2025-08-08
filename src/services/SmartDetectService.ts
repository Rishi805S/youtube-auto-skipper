// Import from our new central types file
import { Cue, Segment } from '../types/types';

export class SmartDetectService {
  private startRegex =
    /\b(sponsor(ed|ship|ing)?|brought to you by|thanks to|shoutout to|partnering with|collaboration with)\b/i;

  // ✅ Expanded list of end keywords, including your suggestions
  private endRegex =
    /\b(now (let'?s|we)|back to|let'?s get started|check out|links in the description|in the description below)\b/i;

  private maxDuration = 45; // Default max sponsor block length in seconds

  constructor(startKeywords?: RegExp, endKeywords?: RegExp, maxDuration?: number) {
    if (startKeywords) this.startRegex = startKeywords;
    if (endKeywords) this.endRegex = endKeywords;
    if (maxDuration) this.maxDuration = maxDuration;
  }

  detectSegments(cues: Cue[]): Segment[] {
    const segments: Segment[] = [];

    for (let i = 0; i < cues.length; i++) {
      const cue = cues[i];

      if (this.startRegex.test(cue.text)) {
        const startTime = Math.max(cue.start - 2, 0);
        let endTime: number | null = null;

        // ✅ Increased lookahead from 5 to 20 cues
        for (let j = i + 1; j < Math.min(cues.length, i + 21); j++) {
          if (this.endRegex.test(cues[j].text)) {
            endTime = cues[j].start + 4;
            console.log(`[SmartDetect] Found a clear end cue: "${cues[j].text}"`);
            break;
          }
        }

        if (endTime === null) {
          console.log(
            `[SmartDetect] No clear end cue found. Using fallback timer of ${this.maxDuration}s.`
          );
          endTime = startTime + this.maxDuration;
        }

        segments.push({ start: startTime, end: endTime });

        // Skip ahead in the main loop to avoid re-detecting the same segment
        if (endTime) {
          while (i < cues.length && cues[i].start < endTime) {
            i++;
          }
        }
      }
    }

    console.log(`[SmartDetect] Detected ${segments.length} segments:`, segments);
    return segments;
  }
}
