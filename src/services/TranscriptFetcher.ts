import { MESSAGE_TYPES, listen, postToPage } from '../utils/MessageBridge';

export class TranscriptFetcher {
  static listenAndFetch() {
    listen<string>(MESSAGE_TYPES.TRACK_URL, async (transcriptUrl) => {
      // This is the deep-debug logic from the guide
      try {
        console.log('[TF] fetching JSON transcript:', transcriptUrl);

        const response = await fetch(transcriptUrl, {
          credentials: 'include', // send cookies so YouTube doesn’t reject us
        });

        // Log status & headers
        console.log(
          '[TF] response status:',
          response.status,
          response.statusText,
          'content-type:',
          response.headers.get('content-type')
        );

        // Grab raw text (safe even if it’s not valid JSON)
        const raw = await response.text();
        console.log('[TF] raw response (first 500 chars):', raw.slice(0, 500));

        // If the raw response is empty, don't try to parse it.
        if (!raw) {
          console.error('[TF] Raw response is empty. Aborting parse.');
          postToPage(MESSAGE_TYPES.TRANSCRIPT_JSON, null);
          return;
        }

        const data = JSON.parse(raw);
        // forward the raw JSON payload
        postToPage(MESSAGE_TYPES.TRANSCRIPT_JSON, data);
      } catch (err) {
        console.error('[TF] fetch/parsing error:', err);
        postToPage(MESSAGE_TYPES.TRANSCRIPT_JSON, null);
      }
    });
  }
}
