export interface Cue {
  start: number;
  end: number;
  text: string;
}

// Define the shape of the raw data to avoid using 'any'
interface RawSeg {
  utf8: string;
}

interface RawEvent {
  tStartMs: number;
  dDurationMs: number;
  segs: RawSeg[];
}

interface RawTranscript {
  events: RawEvent[];
}

export function parseTranscriptJson(raw: RawTranscript): Cue[] {
  if (!raw?.events) return [];

  return raw.events
    .filter((ev) => ev.segs)
    .map((ev) => ({
      start: ev.tStartMs / 1000,
      end: (ev.tStartMs + ev.dDurationMs) / 1000,
      text: ev.segs
        .map((s) => s.utf8)
        .join('')
        .trim(),
    }));
}
