// Store the element that was right-clicked
// context menu happens after the right-click
let lastRightClickedElementInfo = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (regular.type === "rightClick") {
    lastRightClickedElementInfo = {
      tabId: sender.tab.id,
      target: request.target, // can't store so re-select
    };
  }
});

// Inject a content script into all frames of a tab to listen for right-clicks
// More reliable than injecting on demand
chrome.tabs.onUpdated.addEventListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url.startsWith("complete")) {
    chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: true },
      func: () => {
        document.addEventListener(
          "contextmenu",
          (event) => {
            // When a right-click happens, send a message to the background script.
            // Can't send the element directly, so have to re-identify it later.
            // For now, just set a global variable in the page.
            window.lastRightClickedElement = event.target;
          },
          true
        );
      },
    });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  // Create the main "parent" item in the context menu

  chrome.contextMenus.create({
    id: "selector-scout-parent",
    title: "Selector scout",
    contexts: ["all"], // menu item will appear for all contexts (page, image, etc.)
  });

  // Create a child item for copying a CSS selector
  chrome.contextMenus.create({
    id: "copy-css-selector",
    parentId: "selector-scout-parent",
    title: "Copy CSS Selector",
    contexts: ["all"],
  });

  // Create another child item for copying Xpath
  chrome.contextMenus.create({
    id: "copy-xpath",
    parentId: "selector-scout-parent",
    title: "Copy XPath",
    contexts: ["all"],
  });

  // A listener for when a menu item is clicked
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    // Check which menu item was clicked
    if (
      info.menuItemId === "copy-css-selector" ||
      info.menuItemId === "copy-xpath"
    ) {
      chrome.scripting
        .executeScript({
          target: { tabId: tab.id, allFrames: true },
          files: ["content.js"],
        })
        .then(() => {
          // After the file is injected, execute function within that pages context
          chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            func: (menuItemId) => {
              // This code runs in the webpage
              if (!window.lastRightClickedElement) {
                console.error("Selector Scout: Element not found.");
                return;
              }
              let selector;
              if (menuItemId === "copy-css-selector") {
                selector = getCssSelector(window.lastRightClickedElement);
              } else {
                selector = getXPath(window.lastRightClickedElement);
              }
              copyToClipboard(selector);
            },
            args: [info.menuItemId], // Pass menu item ID to the function
          });
        });
    }
  });
});
