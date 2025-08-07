// src/services/TranscriptFetcher.ts

import { MESSAGE_TYPES, listen } from '../utils/MessageBridge';

export class TranscriptFetcher {
  /**
   * Listens for a TRACK_URL message, fetches the JSON transcript,
   * then posts the raw JSON back to the content script.
   */
  static listenAndFetch() {
    listen<string>(MESSAGE_TYPES.TRACK_URL, async (transcriptUrl) => {
      console.log('[TF] fetching JSON transcript:', transcriptUrl);
      try {
        const resp = await fetch(transcriptUrl);
        const json = await resp.json();
        // forward the raw JSON payload
        postRaw(json);
      } catch (err) {
        console.error('[TF] fetch error', err);
        postRaw(null);
      }
    });
  }
}

// internal helper to post raw transcript JSON back
function postRaw(data: any) {
  window.postMessage(
    { type: MESSAGE_TYPES.TRANSCRIPT_JSON, payload: data },
    '*'
  );
}