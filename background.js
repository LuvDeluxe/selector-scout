// Runs once the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  // Parent menu item
  chrome.contextMenus.create({
    id: "selector-scout-parent",
    title: "Selector Scout",
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

  // New separator
  chrome.contextMenus.create({
    id: "separator-2",
    parentId: "selector-scout-parent",
    type: "separator",
    contexts: ["all"],
  });

  // Copy attribute menu item
  chrome.contextMenus.create({
    id: "copy-attribute",
    parentId: "selector-scout-parent",
    title: "Copy Attribute...",
    contexts: ["all"],
  });

  // Check accessibility menu item
  chrome.contextMenus.create({
    id: "check-accessibility",
    parentId: "selector-scout-parent",
    title: "Check Accessibility...",
    contexts: ["all"],
  });
});

// A listener for when a menu item is clicked
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (
    info.menuItemId === "copy-attribute" ||
    info.menuItemId === "check-accessibility" ||
    info.menuItemId.startsWith("generate-")
  ) {
    chrome.tabs.sendMessage(tab.id, {
      type: "SS_OPEN_MODAL",
      menuItemId: info.menuItemId,
    });
  }
});
