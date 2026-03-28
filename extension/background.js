chrome.commands.onCommand.addListener((command) => {
  if (command === "capture_look") {
    chrome.tabs.captureVisibleTab(null, { format: "jpeg", quality: 70 }, (dataUrl) => {
      // Open the side panel first
      chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });

      // Delay slightly to ensure sidepanel.js is loaded and listening
      setTimeout(() => {
        chrome.runtime.sendMessage({
          type: "SCREENSHOT_CAPTURED",
          data: dataUrl
        });
      }, 500);
    });
  }
});