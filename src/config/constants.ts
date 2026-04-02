// Instead of using doc.queryselector(#movie_player) which is a bad practice
// we can use this constant to get the player element
export const CONFIG = {
  SELECTORS: {
    VIDEO: 'video',
    PLAYER: '#movie_player',
  },
  TIMEOUTS: {
    SKIP_COOLDOWN: 3000,
    URL_CHANGE_DELAY: 1000,
    VIDEO_CHECK_THROTTLE: 500,
  },
  DEFAULTS: {
    ENABLED: true,
    ACTION: 'skip' as const,
  },
  TRANSCRIPT_HEURISTICS: {
    SEGMENT_DURATION: 30, // Default segment duration in seconds
    GAP_THRESHOLD: 60, // Gap between segments to consider them separate
  },
};
