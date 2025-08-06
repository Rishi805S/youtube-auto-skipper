console.log("[BG] background script loaded");

import { SponsorBlockService } from './SponsorBlockService';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("[BG] received:", msg);
  if (msg.type === 'GET_SPONSOR_SEGMENTS') {
    SponsorBlockService.fetchSegments(msg.videoId)
      .then(segments => sendResponse({ segments }))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
});