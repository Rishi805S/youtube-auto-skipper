// content.js

console.log("🎬 YouTube Auto Skipper's content script loaded.");

const injectScript = (fileName) => {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL(fileName);
  (document.head || document.documentElement).appendChild(script);
  console.log(`🚀 Injected ${fileName}`);
};

const main = async (videoId) => {
  console.log(`🎥 New video page detected. Video ID: ${videoId}`);

  // This is the code you just added. Perfect.
  const video = document.querySelector('video');
  if (!video) {
    console.error("Could not find the video player element.");
    return; 
  }
  
  // This is the code from yesterday that fetches the data.
  try {
    const response = await fetch(`https://sponsor.ajay.app/api/skipSegments?videoID=${videoId}&category=sponsor`);
    
    if (!response.ok) {
      throw new Error(`SponsorBlock API returned status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      console.log("✅ SponsorBlock found segments!", data);
      console.log(`Skipping to ${data[0].segment[1]} seconds...`);
      video.currentTime = data[0].segment[1];
    } else {
      console.log("🟡 SponsorBlock has no data for this video.");
    }

  } catch (error) {
    console.error("❌ Error fetching from SponsorBlock:", error);
  }
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