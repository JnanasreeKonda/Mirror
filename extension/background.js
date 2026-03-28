//chrome.commands.onCommand.addListener((command) => {
//  if (command === "capture_look") {
//    chrome.tabs.captureVisibleTab(null, { format: "jpeg", quality: 70 }, (dataUrl) => {
//      // Open the side panel first
//      chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
//
//      // Delay slightly to ensure sidepanel.js is loaded and listening
//      setTimeout(() => {
//        chrome.runtime.sendMessage({
//          type: "SCREENSHOT_CAPTURED",
//          data: dataUrl
//        });
//      }, 500);
//    });
//  }
//});



// Clicking the extension toolbar icon opens the side panel
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.commands.onCommand.addListener((command) => {
  if (command === "capture_look") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab) return;

      chrome.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: 70 }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          console.error("Capture error:", chrome.runtime.lastError.message);
          return;
        }

        // Save screenshot to session storage so the panel can grab it on load
        chrome.storage.session.set({ lastScreenshot: dataUrl }, () => {
          // Also try sending live in case the panel is already open
          chrome.runtime.sendMessage({ type: "SCREENSHOT_CAPTURED", data: dataUrl })
            .catch(() => {}); // silently ignore if panel isn't open yet
        });
      });
    });
  }
});