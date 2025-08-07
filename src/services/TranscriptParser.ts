// src/services/TranscriptParser.ts

/**
 * Takes the raw JSON from Youtube (&fmt=json3)
 * and returns an array of clean cues.
 */
export interface Cue {
  start: number;
  end: number;
  text: string;
}

export function parseTranscriptJson(raw: any): Cue[] {
  if (!raw?.events) return [];

  return raw.events
    .filter((ev: any) => ev.segs)
    .map((ev: any) => ({
      start: ev.tStartMs / 1000,
      end: (ev.tStartMs + ev.dDurationMs) / 1000,
      text: ev.segs.map((s: any) => s.utf8).join('').trim(),
    }));
}