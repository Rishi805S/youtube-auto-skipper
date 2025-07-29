// background.js
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Check if the URL is a YouTube video page
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes("youtube.com/watch")) {
    // Send a message to the content script in that tab
    chrome.tabs.sendMessage(tabId, {
      type: "NEW_VIDEO_PAGE",
      videoId: new URL(tab.url).searchParams.get('v')
    });
  }
});