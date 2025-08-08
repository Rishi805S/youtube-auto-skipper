// src/types/types.ts
export interface Cue {
  start: number; // seconds
  text: string;
}

export interface Segment {
  start: number; // seconds
  end: number; // seconds
}

// src/types/types.ts (or a new file)
export interface SponsorBlockApiSegment {
  category: string;
  segment: [number, number];
}
