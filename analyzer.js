// analyzer.js

console.log("🚀 analyzer.js injected and ready!");

const startAnalyzingAudio = (video) => {
  try {
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaElementSource(video);
    source.connect(audioCtx.destination);

    // Now Meyda is defined because this script runs in the page's world
    const analyzer = Meyda.createMeydaAnalyzer({
      audioContext: audioCtx,
      source: source,
      bufferSize: 1024,
      featureExtractors: ["rms", "zcr", "mfcc"],
      callback: (features) => {
        console.log("🎧 Audio Features:", {
          rms: features.rms,
          zcr: features.zcr,
          // Example: log only the first 5 MFCC values
          mfcc: features.mfcc.slice(0, 5),
        });
      },
    });

    const startAnalyzer = () => {
      // Resume context on user gesture (play)
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }
      if (!analyzer._isRunning) {
        analyzer.start();
        console.log("✅ Audio analysis started!");
      }
    };

    video.addEventListener("play", startAnalyzer);

    // If the video is already playing when the script loads
    if (!video.paused) {
      startAnalyzer();
    }
  } catch (err) {
    console.error("❌ Failed to start audio analysis:", err);
  }
};

// Use a MutationObserver for a more reliable way to find the video element
const observer = new MutationObserver((mutations, obs) => {
  const video = document.querySelector("video");
  if (video) {
    console.log("🎥 Video element found. Starting analysis...");
    startAnalyzingAudio(video);
    obs.disconnect(); // Stop observing once the video is found
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});