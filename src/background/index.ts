console.log('[SponsorSkip] Background script started.');

function getPageData() {
  const check = () => {
    // @ts-ignore
    if (window.ytcfg && window.ytcfg.data_) {
      const payload = {
        // @ts-ignore
        apiKey: window.ytcfg.data_.INNERTUBE_API_KEY,
        // @ts-ignore
        context: window.ytcfg.data_.INNERTUBE_CONTEXT
      };
      window.postMessage({ type: 'SPONSORSKIP_YTCFG', payload }, '*');
    } else {
      setTimeout(check, 50);
    }
  };
  check();
}

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.url && details.url.includes("youtube.com")) {
    console.log(`[BG] Navigated to video. Injecting script into tab: ${details.tabId}`);
    chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      func: getPageData,
    }).catch(err => console.error('[BG] executeScript error:', err));
  }
}, { url: [{ hostContains: 'youtube.com/*' }] });