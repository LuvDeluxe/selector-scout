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
  chrome.contextMenus.onClicked.addEventListener((info, tab) => {
    console.log("Selector Scout menu clicked!");
    console.log("Item ID:", info.menuItemId);
    console.log("Tab ID:", tab.id);
  });
});
