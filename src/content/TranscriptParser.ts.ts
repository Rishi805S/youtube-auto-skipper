console.log('[CS] 📢 testMessage.js loaded');

(async () => {
  const videoId = new URLSearchParams(location.search).get('v') || '';
  
  if (videoId) {
    console.log(`[CS] Found video ID: ${videoId}. Requesting segments...`);
    chrome.runtime.sendMessage(
      { type: 'GET_SPONSOR_SEGMENTS', videoId },
      response => {
        console.log('[CS] Received response:', response);
      }
    );
  } else {
    // This new block will tell us if the script is running on a non-video page.
    console.log('[CS] testMessage.js is running, but no video ID was found in the URL.');
  }
})();