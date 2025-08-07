console.log('[SponsorSkip] DEBUG Content script loaded.');

async function openTranscriptPanel(): Promise<void> {
  console.log('[DEBUG] 1. Starting openTranscriptPanel...');

  // Step 1: Find and click the "...more" button in the description
  const descriptionMoreBtn = document.querySelector<HTMLElement>('#expand');

  if (!descriptionMoreBtn) {
    throw new Error('Debug Fail: "...more" button in description not found.');
  }
  console.log('[DEBUG] 2. Found description "...more" button:', descriptionMoreBtn);
  descriptionMoreBtn.click();
  console.log('[DEBUG] 3. Clicked description "...more" button.');

  // Wait for the description to expand
  await new Promise((r) => setTimeout(r, 500));

  // Step 2: Find and click the "Show transcript" button
  console.log('[DEBUG] 4. Looking for "Show transcript" button in description...');
  const transcriptButton = document.querySelector<HTMLButtonElement>(
    'ytd-video-description-transcript-section-renderer button'
  );

  if (!transcriptButton) {
    throw new Error('Debug Fail: "Show transcript" button not found in engagement panel.');
  }
  console.log('[DEBUG] 5. Found "Show transcript" button:', transcriptButton);
  transcriptButton.click();
  console.log('[DEBUG] 6. Clicked "Show transcript" button.');
}

async function scrapeTranscriptText(): Promise<string> {
  console.log('[DEBUG] 7. Starting scrapeTranscriptText...');
  const panel = await new Promise<HTMLElement>((resolve, reject) => {
    const start = performance.now();
    const observer = new MutationObserver((_, obs) => {
      const el = document.querySelector<HTMLElement>('ytd-transcript-renderer');
      if (el) {
        console.log('[DEBUG] 8. Found transcript panel in the DOM.');
        obs.disconnect();
        resolve(el);
      } else if (performance.now() - start > 5000) {
        obs.disconnect();
        reject(
          new Error('Debug Fail: Transcript panel did not appear in the DOM after 5 seconds.')
        );
      }
    });
    console.log('[DEBUG] Watching for transcript panel to be added to the page...');
    observer.observe(document.body, { childList: true, subtree: true });
  });

  const segments = panel.querySelectorAll<HTMLElement>('ytd-transcript-segment-renderer');
  console.log(`[DEBUG] 9. Found ${segments.length} segment elements in the panel.`);
  const lines: string[] = [];
  segments.forEach((seg) => {
    const time = seg
      .querySelector<HTMLElement>('.ytd-transcript-segment-renderer')
      ?.innerText.trim();
    const text = seg
      .querySelector<HTMLElement>('.ytd-transcript-segment-renderer')
      ?.innerText.trim();
    if (text) lines.push(`${time ?? ''} ${text}`.trim());
  });

  console.log(`[DEBUG] 10. Scraped ${lines.length} lines of text.`);
  return lines.join('\n');
}

async function retrieveTranscriptViaUI(): Promise<void> {
  try {
    await openTranscriptPanel();
    const transcript = await scrapeTranscriptText();
    console.log(
      '✅ [SponsorSkip] SUCCESS! Extracted transcript (first 500 chars):\n',
      transcript.slice(0, 500)
    );
  } catch (err) {
    console.error('❌ [SponsorSkip] FATAL ERROR during UI scrape:', err);
  }
}

window.addEventListener('yt-navigate-finish', () => {
  console.log('[SponsorSkip] yt-navigate-finish event detected. Waiting 2 seconds to start...');
  setTimeout(retrieveTranscriptViaUI, 2000);
});
