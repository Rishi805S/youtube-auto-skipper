// src/services/InjectorService.ts

import { MESSAGE_TYPES, postToPage } from '../utils/MessageBridge';
/**
 * Injects into the page MAIN world, polls for ytInitialPlayerResponse,
 * and once found posts the best caption-track URL back to the content script.
 */
// src/services/InjectorService.ts

export class InjectorService {
    static injectTrackUrlFetcher(tabId: number) {
        return chrome.scripting.executeScript({
            target: { tabId },
            world: 'MAIN',
            func: () => {
                console.log('[INJ] injected into MAIN world');

                const waitForTracks = () => {
                    // YouTube’s player response in page context
                    // @ts-ignore
                    const resp = (window as any).ytInitialPlayerResponse;
                    const tl = resp?.captions?.playerCaptionsTracklistRenderer;
                    if (tl) {
                        console.log('[INJ] tracklistRenderer found:', tl);
                        const tracks = tl.captionTracks;
                        const best = tracks.find((t: any) => t.kind === 'asr' && t.languageCode === 'en')
                            ?? tracks.find((t: any) => t.languageCode === 'en')
                            ?? tracks[0];

                        const url = best.baseUrl + '&fmt=json3';
                        console.log('[INJ] posting TRACK_URL:', url);
                        window.postMessage(
                            {
                                type: 'SPONSORSKIP_TRACK_URL',
                                payload: url, // The trackUrl you found
                            },
                            '*'
                        );
                    } else {
                        // keep polling every 50ms
                        setTimeout(waitForTracks, 50);
                    }
                };
                waitForTracks();
            }
        }).catch(err => {
            console.error('[INJ] injection failed', err);
        });
    }
}