// Unused imports have been removed.

interface CaptionTrack {
  baseUrl: string;
  kind?: string;
  languageCode: string;
}

export class InjectorService {
  static injectTrackUrlFetcher(tabId: number) {
    return chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => {
        const postToPage = (type: string, payload: unknown) => {
          window.postMessage({ type, payload }, '*');
        };

        const waitForTracks = () => {
          // @ts-expect-error - ytInitialPlayerResponse is on the window but not in the default type
          const resp = window.ytInitialPlayerResponse;
          const tl = resp?.captions?.playerCaptionsTracklistRenderer;
          if (tl) {
            const tracks = tl.captionTracks as CaptionTrack[];
            const best =
              tracks.find((t) => t.kind === 'asr' && t.languageCode === 'en') ??
              tracks.find((t) => t.languageCode === 'en') ??
              tracks[0];

            if (best) {
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
