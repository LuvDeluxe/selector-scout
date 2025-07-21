// Store the element that was right-clicked
// context menu happens after the right-click
let lastRightClickedElementInfo = null;

// Inject a content script into all frames of a tab to listen for right-clicks
// More reliable than injecting on demand
chrome.tabs.onUpdated.addEventListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url.startsWith("http")) {
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

  // Add separator for visual organization
  chrome.contextMenus.create({
    id: "separator-1",
    parentId: "selector-scout-parent",
    type: "separator",
    contexts: ["all"],
  });

  // Add the menu item for generating a Cypress snippet
  chrome.contextMenus.create({
    id: "generate-cypress-snippet",
    parentId: "selector-scout-parent",
    title: "Generate Cypress Snippet",
    contexts: ["all"],
  });
});

// A listener for when a menu item is clicked
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // Check which menu item was clicked
  if (
    info.menuItemId === "copy-css-selector" ||
    info.menuItemId === "copy-xpath" ||
    info.menuItemId === "generate-cypress-snippet"
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

            let result;
            switch (menuItemId) {
              case "copy-css-selector":
                result = getCssSelector(window.lastRightClickedElement);
                break;
              case "copy-xpath":
                result = getXPath(window.lastRightClickedElement);
                break;
              case "generate-cypress-snippet":
                result = generateCypressSnippet(window.lastRightClickedElement);
                break;
            }
            copyToClipboard(result);
          },
          args: [info.menuItemId], // Pass menu item ID to the function
        });
      });
  }
});
