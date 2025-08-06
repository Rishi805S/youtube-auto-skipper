import { SponsorBlockService } from './SponsorBlockService';

const sb = new SponsorBlockService();

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'GET_SPONSOR_SEGMENTS') return;

  console.log('[BG] GET_SPONSOR_SEGMENTS for', msg.videoId);

  sb.fetchSegments(msg.videoId)
    .then((segments) => sendResponse({ segments }))
    .catch((err) => {
      console.error('[BG] SponsorBlock error', err);
      sendResponse({ segments: [] });
    });

  // Keep channel open for async sendResponse
  return true;
});
