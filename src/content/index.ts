interface Segment {
  start: number;
  end: number;
  category: string;
}

function getVideoId(): string | null {
  return new URLSearchParams(location.search).get('v');
}

function requestSponsorSegments(videoId: string): Promise<Segment[]> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_SPONSOR_SEGMENTS', videoId }, (resp) => {
      if (chrome.runtime.lastError) {
        console.error('[CS] message error:', chrome.runtime.lastError);
        resolve([]);
      } else {
        console.log('[CS] Received segments:', resp.segments);
        resolve(resp.segments || []);
      }
    });
  });
}

async function initSponsorSkipper() {
  const video = document.querySelector('video');
  if (!video) return;

  const videoId = getVideoId();
  if (!videoId) return;

  const segments = await requestSponsorSegments(videoId);
  if (!segments.length) return;

  video.addEventListener('timeupdate', () => {
    const t = video.currentTime;
    for (const seg of segments) {
      if (t >= seg.start && t < seg.end) {
        console.log(`[CS] Skipping sponsor: ${seg.start}→${seg.end}`);
        video.currentTime = seg.end;
        break;
      }
    }
  });
}

// Wait until the <video> is in the DOM
new MutationObserver((_, obs) => {
  if (document.querySelector('video')) {
    initSponsorSkipper();
    obs.disconnect();
  }
}).observe(document.body, { childList: true, subtree: true });
