// src/services/InjectorService.ts

import { MESSAGE_TYPES, postToPage } from '../utils/MessageBridge';

export class InjectorService {
  /**
   * Injects into the page MAIN world, polls for ytInitialPlayerResponse,
   * and once found posts the best caption-track URL back to the content script.
   */
  static injectTrackUrlFetcher(tabId: number) {
    return chrome.scripting.executeScript({
      target: { tabId},
      world: 'MAIN',
      func: () => {
        const waitForTracks = () => {
          // @ts-ignore page context
          const resp = (window as any).ytInitialPlayerResponse;
          const tl = resp?.captions?.playerCaptionsTracklistRenderer;
          if (tl) {
            const tracks = tl.captionTracks;
            const best =
              tracks.find((t: any) => t.kind === 'asr' && t.languageCode === 'en') ??
              tracks.find((t: any) => t.languageCode === 'en') ??
              tracks[0];
            if (best) {
              // THE FIX: Use the actual string, not the imported constant.
              postToPage('SPONSORSKIP_TRACK_URL', best.baseUrl + '&fmt=json3');
            }
          } else {
            setTimeout(waitForTracks, 50);
          }
        };
        waitForTracks();
      },
    });
  }
}