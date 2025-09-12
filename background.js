// Selector Scout - Background Service Worker
// Handles context menu creation and click events for the extension.

// Runs once the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  // Remove existing menus to avoid duplicates
  chrome.contextMenus.removeAll(() => {
    if (chrome.runtime.lastError) {
      console.warn(
        "No existing menus to remove:",
        chrome.runtime.lastError.message
      );
    }

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
            chrome.runtime.lastError.message
          );
          return;
        }

        // Helper function to create child menu items
        const createChildMenu = (
          id,
          title,
          parentId = "selector-scout-parent"
        ) => {
          chrome.contextMenus.create(
            {
              id,
              parentId,
              title,
              contexts: ["all"],
            },
            () => {
              if (chrome.runtime.lastError) {
                console.error(
                  `Error creating ${title.toLowerCase()} menu:`,
                  chrome.runtime.lastError.message
                );
              }
            }
          );
        };

        // Create Cypress snippet generator option
        createChildMenu(
          "generate-cypress-snippet",
          "Generate Cypress snippet..."
        );

        // Create Playwright snippet option
        createChildMenu(
          "generate-playwright-snippet",
          "Generate Playwright Snippet..."
        );

        // Create Puppeteer snippet option
        createChildMenu(
          "generate-puppeteer-snippet",
          "Generate Puppeteer Snippet..."
        );

        // Separator after snippets
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
                chrome.runtime.lastError.message
              );
            }
          }
        );

        // Copy attribute menu item
        createChildMenu("copy-attribute", "Copy Attribute...");

        // Check accessibility menu item
        createChildMenu("check-accessibility", "Check Accessibility...");
      }
    );
  });
});

// Helpful startup log to confirm the service worker is running
console.log("Selector Scout: background service worker loaded");

// Listener for when a menu item is clicked
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) {
    console.error("No valid tab found for context menu action");
    return;
  }

  // Check if the clicked item is one we handle
  const handledIds = [
    "copy-attribute",
    "check-accessibility",
    "generate-cypress-snippet",
    "generate-playwright-snippet",
    "generate-puppeteer-snippet",
  ];

  if (!handledIds.includes(info.menuItemId)) {
    console.log("Unhandled menu item clicked:", info.menuItemId);
    return;
  }

  // Send message to content script with proper error handling
  safeSendMessageToTab(
    tab.id,
    {
      type: "SS_OPEN_MODAL",
      menuItemId: info.menuItemId,
      // Include click info for the content script to use (e.g., for element targeting)
      // This works with activeTab permission - no host_permissions needed
      clickInfo: {
        mediaType: info.mediaType,
        linkUrl: info.linkUrl,
        srcUrl: info.srcUrl,
        pageUrl: info.pageUrl,
        frameId: info.frameId,
        selectionText: info.selectionText,
        editable: info.editable,
      },
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error sending message:",
          chrome.runtime.lastError.message
        );
        // Harmless error: content script might not be injected yet or page doesn't support it
        return;
      }
      if (response && response.error) {
        console.error("Content script error:", response.error);
      } else {
        console.log("Message sent successfully:", response);
      }
    }
  );
});

/**
 * Safely sends a message to a tab's content script.
 * Handles invalid tabId by falling back to the active tab.
 * @param {number} tabId - The ID of the tab to send to.
 * @param {object} message - The message object.
 * @param {function} callback - Optional callback for response.
 */
function safeSendMessageToTab(tabId, message, callback) {
  // Normalize callback
  const cb = typeof callback === "function" ? callback : undefined;

  if (typeof tabId !== "number" || tabId < 0) {
    console.error("Invalid tabId:", tabId, "- Falling back to active tab");
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error querying active tab:",
          chrome.runtime.lastError.message
        );
        if (cb) cb({ error: "no_valid_tab" });
        return;
      }
      const fallbackTab = tabs[0];
      if (!fallbackTab || !fallbackTab.id) {
        console.error("No active tab found");
        if (cb) cb({ error: "no_active_tab" });
        return;
      }
      chrome.tabs.sendMessage(fallbackTab.id, message, cb);
    });
    return;
  }

  // Send to specified tab
  chrome.tabs.sendMessage(tabId, message, (response) => {
    if (chrome.runtime.lastError) {
      console.error("sendMessage error:", chrome.runtime.lastError.message);
      if (cb) cb({ error: chrome.runtime.lastError.message });
    } else if (cb) {
      cb(response);
    }
  });
}
