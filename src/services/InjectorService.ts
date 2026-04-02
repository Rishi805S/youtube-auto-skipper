interface CaptionTrack {
  baseUrl: string;
  kind?: string;
  languageCode?: string;
}

interface PlayerResponse {
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: CaptionTrack[];
    };
  };
}

// Go into the real YouTube page
// -> read ytInitialPlayerResponse
// -> find captionTracks
// -> choose English track
// -> return its baseUrl

export class InjectorService {
  // Injects a function into YouTube's page context so we can read
  // ytInitialPlayerResponse and extract the caption track URL from it.
  static async injectTrackUrlFetcher(tabId: number): Promise<string | null> {
    const [result] = await chrome.scripting
      .executeScript({
        target: { tabId },
        world: 'MAIN',
        func: async () => {
          const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

          const getPlayerResponse = (): PlayerResponse | undefined => {
            const pageWindow = window as Window & {
              ytInitialPlayerResponse?: PlayerResponse;
            };

            return pageWindow.ytInitialPlayerResponse;
          };

          const getCaptionTracks = (): CaptionTrack[] => {
            return (
              getPlayerResponse()?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? []
            );
          };

          const getEnglishCaptionTrack = (tracks: CaptionTrack[]): CaptionTrack | undefined => {
            return (
              tracks.find((track) => track.kind === 'asr' && track.languageCode === 'en') ??
              tracks.find((track) => track.languageCode === 'en')
            );
          };

          for (let attempt = 0; attempt < 100; attempt++) {
            const captionTracks = getCaptionTracks();
            const englishTrack = getEnglishCaptionTrack(captionTracks);

            if (englishTrack?.baseUrl) {
              return englishTrack.baseUrl;
            }

            // YouTube does not always expose caption tracks immediately,
            // so we poll briefly before giving up.
            await sleep(50);
          }

          return null;
        },
      })
      .catch(() => []);

    return result?.result ?? null;
  }
}
