// Runs once the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  // Parent menu item
  chrome.contextMenus.create({
    id: "selector-scout-parent",
    title: "Selector Scout",
    contexts: ["all"],
  });

  // Create basic copy actions
  chrome.contextMenus.create({
    id: "copy-css-selector",
    parentId: "selector-scout-parent",
    title: "Copy CSS Selector",
    contexts: ["all"],
  });

  chrome.contextMenus.create({
    id: "copy-xpath",
    parentId: "selector-scout-parent",
    title: "Copy XPath",
    contexts: ["all"],
  });

  // Create separator line
  chrome.contextMenus.create({
    id: "separator-1",
    parentId: "selector-scout-parent",
    type: "separator",
    contexts: ["all"],
  });

  // Create Cypress snippet generator option
  chrome.contextMenus.create({
    id: "generate-cypress-snippet",
    parentId: "selector-scout-parent",
    title: "Generate Cypress snippet...",
    contexts: ["all"],
  });

  chrome.contextMenus.create({
    id: "generate-playwright-snippet",
    parentId: "selector-scout-parent",
    title: "Generate Playwright Snippet...",
    contexts: ["all"],
  });
});

// A listener for when a menu item is clicked
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // Check if clicked item is one of ours
  if (
    info.menuItemId.startsWith("copy-") ||
    info.menuItemId.startsWith("generate-")
  ) {
    // Inject the content js file. This makes all its functions available on the page
    chrome.scripting
      .executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: ["content.js"],
      })
      .then(() => {
        chrome.tabs.sendMessage(tab.id, {
          // A unique name for the message type so the listener knows
          type: "SS_PERFORM_ACTION",
          // The data payload: the ID of the menu item that was clicked
          menuItemId: info.menuItemId,
        });
      })
      .catch((err) => console.error("Selector Scout Error: ", err));
  }
});
