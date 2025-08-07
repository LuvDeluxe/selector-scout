// Runs once the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  // Remove existing menus first to avoid duplicates
  chrome.contextMenus.removeAll(() => {
    // Parent menu item
    chrome.contextMenus.create(
      {
        id: "selector-scout-parent",
        title: "Selector Scout",
        contexts: ["all"],
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error(
            "Error creating parent menu:",
            chrome.runtime.lastError
          );
          return;
        }

        // Create Cypress snippet generator option
        chrome.contextMenus.create(
          {
            id: "generate-cypress-snippet",
            parentId: "selector-scout-parent",
            title: "Generate Cypress snippet...",
            contexts: ["all"],
          },
          () => {
            if (chrome.runtime.lastError) {
              console.error(
                "Error creating Cypress menu:",
                chrome.runtime.lastError
              );
            }
          }
        );

        chrome.contextMenus.create(
          {
            id: "generate-playwright-snippet",
            parentId: "selector-scout-parent",
            title: "Generate Playwright Snippet...",
            contexts: ["all"],
          },
          () => {
            if (chrome.runtime.lastError) {
              console.error(
                "Error creating Playwright menu:",
                chrome.runtime.lastError
              );
            }
          }
        );

        chrome.contextMenus.create(
          {
            id: "generate-puppeteer-snippet",
            parentId: "selector-scout-parent",
            title: "Generate Puppeteer Snippet...",
            contexts: ["all"],
          },
          () => {
            if (chrome.runtime.lastError) {
              console.error("Error creating Puppeteer menu:");
              chrome.runtime.lastError;
            }
          }
        );

        // New separator
        chrome.contextMenus.create(
          {
            id: "separator-2",
            parentId: "selector-scout-parent",
            type: "separator",
            contexts: ["all"],
          },
          () => {
            if (chrome.runtime.lastError) {
              console.error(
                "Error creating separator:",
                chrome.runtime.lastError
              );
            }
          }
        );

        // Copy attribute menu item
        chrome.contextMenus.create(
          {
            id: "copy-attribute",
            parentId: "selector-scout-parent",
            title: "Copy Attribute...",
            contexts: ["all"],
          },
          () => {
            if (chrome.runtime.lastError) {
              console.error(
                "Error creating copy attribute menu:",
                chrome.runtime.lastError
              );
            }
          }
        );

        // Check accessibility menu item
        chrome.contextMenus.create(
          {
            id: "check-accessibility",
            parentId: "selector-scout-parent",
            title: "Check Accessibility...",
            contexts: ["all"],
          },
          () => {
            if (chrome.runtime.lastError) {
              console.error(
                "Error creating accessibility menu:",
                chrome.runtime.lastError
              );
            }
          }
        );
      }
    );
  });
});

// A listener for when a menu item is clicked
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) {
    console.error("No valid tab found for context menu action");
    return;
  }

  if (
    info.menuItemId === "copy-attribute" ||
    info.menuItemId === "check-accessibility" ||
    info.menuItemId.startsWith("generate-")
  ) {
    // Send message to content script with proper error handling
    chrome.tabs.sendMessage(
      tab.id,
      {
        type: "SS_OPEN_MODAL",
        menuItemId: info.menuItemId,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Error sending message:",
            chrome.runtime.lastError.message
          );
          // The error is usually harmless - content script might not be ready
          // or the page might not support the extension
        }
      }
    );
  }
});
