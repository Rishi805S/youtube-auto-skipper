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
          try {
            // @ts-expect-error - ytInitialPlayerResponse is on the window but not in the default type
            const resp = window.ytInitialPlayerResponse;
            const tl = resp?.captions?.playerCaptionsTracklistRenderer;
            
            if (tl) {
              const tracks = tl.captionTracks as CaptionTrack[];
              if (tracks && tracks.length > 0) {
                const best =
                  tracks.find((t) => t.kind === 'asr' && t.languageCode === 'en') ??
                  tracks.find((t) => t.languageCode === 'en') ??
                  tracks[0];

                if (best) {
                  postToPage('SPONSORSKIP_TRACK_URL', best.baseUrl + '&fmt=json3');
                  return;
                }
              }
            }
            
            // Retry if not found yet, but limit retries or just keep polling?
            // Original code kept polling. We'll add a safety check.
            setTimeout(waitForTracks, 50);
          } catch (e) {
            console.error('[SponsorSkip] Error finding caption tracks:', e);
          }
        };
        waitForTracks();
      },
    }).catch(err => {
      console.error('[SponsorSkip] Failed to inject track fetcher:', err);
    });
  }
}
