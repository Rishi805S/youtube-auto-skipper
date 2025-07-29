// content.js

console.log("🎬 YouTube Auto Skipper's content script loaded.");

const injectScript = (fileName) => {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL(fileName);
  (document.head || document.documentElement).appendChild(script);
  console.log(`🚀 Injected ${fileName}`);
};

const main = (videoId) => {
  console.log(`🎥 New video page detected. Video ID: ${videoId}`);
  
  // Here is where our Day 1 logic will begin.
  // We will build this out starting tomorrow.
  console.log("STEP 1: Checking SponsorBlock API...");
  // TODO: Implement fetch call to SponsorBlock API.

  // For now, let's assume SponsorBlock has no data and inject our custom engine scripts.
  console.log("STEP 2: SponsorBlock has no data. Initializing custom engine...");
  
  // We inject the scripts that will get us the transcript and audio features.
  injectScript('interceptor.js');
  // We will add the analyzer injection when we need it.
};


// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "NEW_VIDEO_PAGE") {
    main(request.videoId);
  }
  return true; 
});

// We still listen for the transcript data from our injected script
window.addEventListener('TranscriptReady', (event) => {
    console.log("✅ Custom Engine: Transcript data received.", event.detail.length, "segments found.");
    // TODO: Pass this data to our scoring/analysis function.
});