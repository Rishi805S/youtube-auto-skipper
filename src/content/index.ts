// Inject a badge and request segments for the current video
(async () => {
  const params = new URLSearchParams(location.search);
  const videoId = params.get('v') || '';
  console.log('[CS] requesting segments for', videoId);

  chrome.runtime.sendMessage(
    { type: 'GET_SPONSOR_SEGMENTS', videoId },
    resp => {
      if (chrome.runtime.lastError) {
        console.error('[CS] lastError:', chrome.runtime.lastError.message);
        return;
      }
      console.log('[CS] got segments:', resp.segments);
      // TODO: render badge and implement skip logic
    }
  );
})();