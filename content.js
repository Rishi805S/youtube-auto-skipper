// content.js

console.log("📦 content.js is injecting scripts...");

// 1. Create the Meyda script tag
const meydaScript = document.createElement("script");
meydaScript.src = chrome.runtime.getURL("meyda.min.js");

// 2. When the Meyda script finishes loading, THEN inject the analyzer script
meydaScript.onload = () => {
  console.log("✅ Meyda library loaded. Injecting analyzer...");
  const analyzerScript = document.createElement("script");
  analyzerScript.src = chrome.runtime.getURL("analyzer.js");
  (document.head || document.documentElement).appendChild(analyzerScript);

  // Clean up the analyzer script tag after it's loaded
  analyzerScript.onload = () => {
    analyzerScript.remove();
  };
};

// 3. Append the Meyda script to the page to start the process
(document.head || document.documentElement).appendChild(meydaScript);

// Clean up the Meyda script tag after it's been appended and will start loading
meydaScript.remove();