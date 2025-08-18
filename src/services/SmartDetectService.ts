import { Cue, Segment } from '../types/types';

interface Pattern {
  regex: RegExp;
  weight: number;
}

interface SponsorDetectionRules {
  startPatterns: Pattern[];
  endPatterns: Pattern[];
  startPadding: number; // seconds to pad before start
  endPadding: number; // seconds to pad after end
  maxSegmentLength: number; // maximum length of a sponsor segment in seconds
  minConfidence: number; // minimum confidence threshold
  minSegmentLength: number; // minimum length of a sponsor segment in seconds
}

const DEFAULT_RULES: SponsorDetectionRules = {
  startPatterns: [
    {
      regex: /\b(sponsor(ed|ship|ing)?|brought to you by|thanks to|partnered with)\b/i,
      weight: 1.0,
    },
    {
      regex: /\b(check out|use code|discount code|promo code|off your purchase)\b/i,
      weight: 0.8,
    },
    {
      regex: /\b(before we (begin|start|get started)|let me tell you about)\b/i,
      weight: 0.7,
    },
  ],
  endPatterns: [
    {
      regex: /\b(back to|now onto?|continuing with)\s+(?:the|our)?\s*(?:video|content|topic)\b/i,
      weight: 1.0,
    },
    {
      regex:
        /\b(?:enough|done|that's all)\s+(?:about|with|for)\s+(?:our|the|this|today'?s)?\s*sponsor\b/i,
      weight: 0.9,
    },
    {
      regex: /\b(links? (in|below)|check description|see below)\b/i,
      weight: 0.8,
    },
  ],
  startPadding: -2, // back up 2 seconds before detected start
  endPadding: 1, // extend 1 second after detected end
  maxSegmentLength: 180, // 3 minutes
  minSegmentLength: 10, // 10 seconds
  minConfidence: 0.7,
};

export class SmartDetectService {
  constructor(private rules: SponsorDetectionRules = DEFAULT_RULES) {}

  detectSegments(cues: Cue[]): Segment[] {
    const segments: Segment[] = [];
    if (!cues.length) return segments;

    for (let i = 0; i < cues.length; i++) {
      const startCue = cues[i];
      const startMatch = this.findBestMatch(startCue.text, this.rules.startPatterns);

      if (startMatch && startMatch.weight >= this.rules.minConfidence) {
        // Found potential sponsor start, look for end
        const startTime = Math.max(0, startCue.start + this.rules.startPadding);
        let endTime: number | null = null;
        let bestEndWeight = 0;

        // Look ahead for end pattern within maxSegmentLength
        for (let j = i + 1; j < cues.length; j++) {
          const endCue = cues[j];
          const timeSinceStart = endCue.start - startCue.start;

          if (timeSinceStart > this.rules.maxSegmentLength) break;

          const endMatch = this.findBestMatch(endCue.text, this.rules.endPatterns);
          if (endMatch && endMatch.weight > bestEndWeight) {
            bestEndWeight = endMatch.weight;
            endTime = endCue.start + this.rules.endPadding;
          }
        }

        // If we found a strong end match and segment is long enough, add it
        if (
          endTime &&
          bestEndWeight >= this.rules.minConfidence &&
          endTime - startTime >= this.rules.minSegmentLength
        ) {
          segments.push({
            category: 'sponsor',
            start: startTime,
            end: endTime,
          });

          // Skip past this segment to avoid overlapping detections
          while (i < cues.length && cues[i].start < endTime) i++;
        }
      }
    }

    return segments;
  }

  private findBestMatch(
    text: string,
    patterns: Pattern[]
  ): { pattern: Pattern; weight: number } | null {
    let bestMatch = null;
    let bestWeight = 0;

    for (const pattern of patterns) {
      // Apply the pattern's regex
      const matches = pattern.regex.test(text);
      if (matches) {
        const weight = pattern.weight;
        if (weight > bestWeight) {
          bestMatch = pattern;
          bestWeight = weight;
        }
      }
    }

    return bestMatch ? { pattern: bestMatch, weight: bestWeight } : null;
  }
}
