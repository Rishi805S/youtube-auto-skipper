// interceptor.js (v2 - Smarter)
console.log("🕵️ Smart Interceptor script injected and ready.");

const originalFetch = window.fetch;

window.fetch = async (...args) => {
  const response = await originalFetch(...args);

  try {
    // We must clone the response to read it, so the original request isn't affected.
    const clonedResponse = response.clone();
    const data = await clonedResponse.json();

    // This is the new logic: we check the *content* of every request.
    const captions = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    // If we find the captionTracks in any request, we've hit the jackpot.
    if (captions && captions.length > 0) {
      console.log("🎉 Found the right network request containing caption data!");
      
      const enCaption = captions.find(c => c.languageCode === 'en' && c.kind === 'asr') || captions.find(c => c.languageCode === 'en');
      
      if (enCaption) {
        // Fetch the actual XML from the URL provided
        const transcriptXml = await originalFetch(enCaption.baseUrl).then(res => res.text());

        // Parse the XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(transcriptXml, "text/xml");
        const texts = [...xmlDoc.getElementsByTagName("text")];
        const transcriptData = texts.map(el => ({
            start: parseFloat(el.getAttribute("start")),
            text: el.textContent.replace(/\n/g, " ").trim(),
            end: parseFloat(el.getAttribute("start")) + parseFloat(el.getAttribute("dur"))
        }));
        
        console.log(`✅📜 Transcript Intercepted: Found ${transcriptData.length} segments.`);
        console.table(transcriptData);
        
        // Stop any further processing by removing the override.
        // This is optional, but good practice once we have what we need.
        window.fetch = originalFetch;

        // Send the data to the content script
        window.dispatchEvent(new CustomEvent('TranscriptReady', { detail: transcriptData }));
      }
    }
  } catch (e) {
    // This will catch errors from requests that aren't valid JSON, which is normal.
    // We can safely ignore these.
  }

  // Return the original response to the page
  return response;
};