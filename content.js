// content.js

console.log("🎬 YouTube Auto Skipper's content script loaded.");

const SPONSOR_KEYWORDS = [
  "sponsored by", "in partnership with", "thanks to our sponsor",
  "thanks to our partner", "brought to you by", "check out the link",
  "link in the description", "use my code", "get started for free",
  "free trial", "special offer", "discount code", "vpn", "squarespace",
  "nordvpn", "expressvpn", "brilliant.org", "skillshare", "audible",
  "so before starting the video"
];

let video;

const injectScript = (fileName) => {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL(fileName);
  (document.head || document.documentElement).appendChild(script);
  console.log(`🚀 Injected ${fileName}`);
};

const main = async (videoId) => {
  console.log(`🎥 New video page detected. Video ID: ${videoId}`);

  video = document.querySelector('video');
  if (!video) {
    console.error("Could not find the video player element.");
    return;
  }
  
  // --- This is the primary logic we are now restoring ---
  try {
    const response = await fetch(`https://sponsor.ajay.app/api/skipSegments?videoID=${videoId}&category=sponsor`);
    
    if (!response.ok) {
      throw new Error(`SponsorBlock API returned status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      // PATH A: SponsorBlock has data, so we use it to skip.
      console.log("✅ SponsorBlock found segments!", data);
      console.log(`Skipping to ${data[0].segment[1]} seconds...`);
      video.currentTime = data[0].segment[1];
    } else {
      // PATH B: SponsorBlock has no data, so we run our custom engine.
      console.log("🟡 SponsorBlock has no data. Initializing custom engine...");
      video.pause(); // Pause the video to give our engine time to work
      injectScript('interceptor.js');
    }

  } catch (error) {
    // PATH C: SponsorBlock API fails, so we run our custom engine.
    console.error("❌ Error fetching from SponsorBlock:", error);
    console.log(" F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F F-block failed. Initializing custom engine...");
    video.pause(); // Pause the video to give our engine time to work
    injectScript('interceptor.js');
  }
};

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "NEW_VIDEO_PAGE") {
    main(request.videoId);
  }
  return true; 
});

const scanTranscriptForSponsors = (transcript) => {
  if (!transcript || transcript.length === 0) {
    if (video) video.play(); 
    return;
  }

  console.log("🕵️‍♂️ Scanning transcript for keywords...");
  let foundSponsor = false;
  for (const segment of transcript) {
    if (segment && segment.text) {
      for (const keyword of SPONSOR_KEYWORDS) {
        if (segment.text.toLowerCase().includes(keyword.toLowerCase())) {
          console.log(`✅ Found keyword '${keyword}' in segment: "${segment.text}"`);
          foundSponsor = true;
          // TODO for Day 4: Implement skip logic here.
          break;
        }
      }
    }
    if (foundSponsor) break;
  }

  if (!foundSponsor) {
    console.log("🤷‍♂️ No sponsor keywords found in transcript.");
  }
  
  console.log("▶️ Analysis complete. Resuming video playback.");
  if (video) video.play();
};

window.addEventListener('TranscriptReady', (event) => {
    console.log("✅ Custom Engine: Transcript data received.");
    scanTranscriptForSponsors(event.detail);
});