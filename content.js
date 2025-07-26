// Main Content Code
// function waitForVideoAndTrack() {
//   const checkInterval = setInterval(() => {
//     const video = document.querySelector("video");

//     if (video) {
//       console.log("YouTube video found!");
//       console.log("Current time:", video.currentTime);

//       // Start tracking playback time
//       setInterval(() => {
//         console.log("Current playback time:", video.currentTime);
//       }, 2000);

//       clearInterval(checkInterval); // Stop looking once video is found
//     }
//   }, 1000); // Check every 1 second until video is loaded
// }

// waitForVideoAndTrack();



// Code For Play, Pause, control speed and reset
function waitForVideoAndTrack() {
  const checkInterval = setInterval(() => {
    const video = document.querySelector("video");

    if (video) {
      console.log("🎥 YouTube video found!");

      // Optional: Log current playback time every 2s
      setInterval(() => {
        console.log("⏱️ Current playback time:", video.currentTime);
      }, 4000);

      // 🧪 Try video controls
      setTimeout(() => {
        console.log("⏸️ Pausing video...");
        video.pause();

        setTimeout(() => {
          console.log("▶️ Resuming video...");
          video.play();
        }, 3000); // pause for 3s then play

        setTimeout(() => {
          console.log("⏩ Skipping 10 seconds...");
          video.currentTime += 10;
        }, 6000); // skip ahead after 6s
        
        setTimeout(() => {
          console.log("⏩ Play back speed 2.0...");
          video.playbackRate = 2.0;
        }, 6000); // skip ahead after 6s

        setTimeout(() => {
          console.log("⏪ Rewinding 5 seconds...");
          video.currentTime -= 5;
        }, 9000); // rewind after 9s

      }, 2000); // Delay initial control for video to stabilize

      clearInterval(checkInterval);
    }
  }, 4000);
}

waitForVideoAndTrack();
