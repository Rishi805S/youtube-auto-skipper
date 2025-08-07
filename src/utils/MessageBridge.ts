// src/utils/MessageBridge.ts

// Centralize your postMessage/channel names
export const MESSAGE_TYPES = {
  TRACK_URL: 'SPONSORSKIP_TRACK_URL',
  TRANSCRIPT_JSON: 'SPONSORSKIP_TRANSCRIPT_JSON',
} as const;

type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

// Helper to post from page → content
export function postToPage<T>(type: MessageType, payload: T) {
  window.postMessage({ type, payload }, '*');
}

// Helper to listen in content/background
export function listen<T>(type: MessageType, handler: (payload: T) => void) {
  const listener = (e: MessageEvent) => {
    if (e.source !== window) return;
    if (e.data?.type === type) {
      handler(e.data.payload as T);
    }
  };
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}
