// runs in world: 'MAIN'
// waits for window.ytInitialPlayerResponse
// extracts the best caption track
// returns the URL directly
// matches the background script’s await InjectorService.injectTrackUrlFetcher(details.tabId)

interface CaptionTrack {
  baseUrl: string;
  kind?: string;
  languageCode: string;
}

export class InjectorService {
  static async injectTrackUrlFetcher(tabId: number): Promise<string | null> {
    const [result] = await chrome.scripting
      .executeScript({
        target: { tabId },
        world: 'MAIN',
        func: async () => {
          const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

          for (let attempt = 0; attempt < 100; attempt++) {
            try {
              const pageWindow = window as Window & {
                ytInitialPlayerResponse?: {
                  captions?: {
                    playerCaptionsTracklistRenderer?: {
                      captionTracks?: CaptionTrack[];
                    };
                  };
                };
              };
              const resp = pageWindow.ytInitialPlayerResponse;
              const tl = resp?.captions?.playerCaptionsTracklistRenderer;

              if (tl) {
                const tracks = tl.captionTracks as CaptionTrack[] | undefined;
                if (tracks && tracks.length > 0) {
                  const best =
                    tracks.find((t) => t.kind === 'asr' && t.languageCode === 'en') ??
                    tracks.find((t) => t.languageCode === 'en') ??
                    tracks[0];

                  if (best) {
                    return best.baseUrl;
                  }
                }
              }
            } catch (e) {
              console.error('[SponsorSkip] Error finding caption tracks:', e);
            }

            await sleep(50);
          }

          return null;
        },
      })
      .catch((err) => {
        console.error('[SponsorSkip] Failed to inject track fetcher:', err);
        return [];
      });

    return result?.result ?? null;
  }
}
