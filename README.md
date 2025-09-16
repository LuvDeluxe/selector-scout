# Selector Scout


![selectors](https://github.com/user-attachments/assets/93826e6b-fa30-4cc6-af68-beeabdf95d5e)
![playwright](https://github.com/user-attachments/assets/b328012b-f992-4c0c-af47-03e817f856a2)
![accesibility](https://github.com/user-attachments/assets/6202f2ac-f5fd-4f92-a67a-98cd8f3bda58)

A Chrome extension to help QA engineers and developers generate robust CSS selectors and test snippets, inspect element attributes, and run quick accessibility checks.

This README reflects the current state of the codebase (Cypress, Playwright, and Puppeteer snippet generation, saved selectors/bookmarks in the popup, export/import, and messaging robustness).

## Key Features

- Right-click context menu to generate test snippets for:
  - Cypress
  - Playwright
  - Puppeteer
- Copy an element's attributes to clipboard
- Accessibility scan via the popup (injects a11y script and displays grouped findings)
- Saved Selectors (Bookmarks) in the popup:
  - Save, list, use, and delete selectors
  - Tracks `useCount` and `lastUsed`
  - Export and import bookmarks as JSON (merge by selector)
- Dark mode support — bookmarks panel matches dark mode
- Robust messaging: popup injects content script when needed and uses safe messaging to avoid uncaught promise errors when no receiver exists

## Installation

1. Clone or download the repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable Developer mode (top-right).
4. Click "Load unpacked" and choose the project folder.

## How to Use

- Right-click any element on a page and use the "Selector Scout" context menu to generate snippets for Cypress / Playwright / Puppeteer or to copy attributes.
- Open the extension popup (click the toolbar icon):
  - Run an accessibility scan.
  - Save a CSS selector into Saved Selectors.
  - Use a saved selector to run it against the active tab.
  - Export saved selectors (.json) or import a previously exported file (merges by selector text).

## Popup Bookmarks (Saved Selectors)

- Storage: bookmarks are stored in `chrome.storage.local` under the `bookmarks` key.
- Bookmark object shape:

```json
{
  "id": "<string>",
  "selector": "<css selector>",
  "createdAt": 1630000000000,
  "lastUsed": 1630001000000,
  "useCount": 3
}
```

- Import behavior: imports are merged by selector string; existing bookmarks are preserved.

## Notes about messaging and reliability

- The popup uses `chrome.scripting.executeScript` to inject `content.js` before sending messages when necessary. This prevents common errors like "Could not establish connection. Receiving end does not exist.".
- Messaging uses callback forms and checks `chrome.runtime.lastError` to avoid uncaught promise rejections when a content script isn't present.

## Development

- Modify files, then refresh the extension in `chrome://extensions`.
- Popup and content script log messages to DevTools: inspect the popup or the page console to troubleshoot.

## Troubleshooting

- If a feature (like running a saved selector) doesn't work:
  - Make sure the page isn't a restricted origin (e.g., `chrome://` or the Chrome Web Store) where content scripts cannot run.
  - Open DevTools on the page and the extension background/service worker console to look for error messages.

## Contributing

Contributions welcome. Open an issue or a PR; keep changes focused and include tests where appropriate.

## License

See the `LICENSE` file in the repository.
# Selector Scout

A Chrome extension that helps developers generate reliable CSS selectors, create test snippets for Cypress and Playwright, and check accessibility issues by right-clicking on any element.

## Features

- **Generate Cypress Snippets**: Right-click any element to get Cypress test assertions
- **Generate Playwright Snippets**: Create Playwright test code for any element
- **Copy Attributes**: View and copy any element's attributes
- **Accessibility Check**: Identify common accessibility issues
- **Dark Mode**: Toggle dark mode for the modal interface
- **Smart Selector Generation**: Creates reliable, unique CSS selectors
- **Saved Selectors (Bookmarks)**: Save frequently-used CSS selectors in the popup so you can re-run them quickly. Bookmarks store usage metadata (useCount and lastUsed).
 - **Export / Import Bookmarks**: Download bookmarks as JSON and import them back (merge by selector) for backup or sharing.
 - **Dark-mode sync for Bookmarks UI**: The saved selectors panel respects dark mode for a consistent UI.
 - **Messaging Robustness**: Improved sendMessage usage in the popup to avoid uncaught promise errors when the content script is not present (prevents "Could not establish connection" runtime errors).

## Installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension icon should appear in your toolbar

## How to Use

1. Navigate to any webpage
2. Right-click on any element you want to test or inspect
3. Select "Selector Scout" from the context menu
4. Choose your desired action:
   - **Generate Cypress snippet**: Get Cypress test code
   - **Generate Playwright Snippet**: Get Playwright test code
   - **Copy Attribute**: View and copy element attributes
   - **Check Accessibility**: Identify a11y issues

## Recent Fixes

### Version 1.0.0 (Fixed)

- ✅ **Fixed CSS Loading**: Modal styles now inject directly into content script
- ✅ **Improved Clipboard Functionality**: Added modern Clipboard API with fallback
- ✅ **Better Error Handling**: Added try-catch blocks and user feedback
- ✅ **Enhanced Selector Generation**: More reliable and unique CSS selectors
- ✅ **Fixed Dark Mode**: Corrected storage key inconsistency
- ✅ **Improved Background Script**: Added error handling and duplicate prevention
- ✅ **Better Toast Notifications**: More reliable feedback system
- ✅ **Enhanced Security**: Added activeTab permission

## Technical Details

### Selector Generation Strategy

The extension uses a priority-based approach for generating selectors:

1. **ID selectors** (if unique)
2. **data-testid attributes** (Cypress convention)
3. **data-cy attributes** (Cypress convention)
4. **Smart class-based selectors** (filters out dynamic classes)
5. **Fallback to nth-child** (if needed)

### Clipboard Support

- Modern `navigator.clipboard` API (secure contexts)
- Fallback to `document.execCommand('copy')` for older browsers
- Visual feedback with toast notifications

### Browser Compatibility

- Chrome 88+ (Manifest V3)
- Supports both secure (HTTPS) and non-secure (HTTP) contexts
- Works in all frames and iframes

## Development

To modify the extension:

1. Edit the files in the repository
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Selector Scout extension
4. Test your changes

## Troubleshooting

If the extension isn't working:

1. Check the browser console for errors
2. Ensure the extension is enabled
3. Try refreshing the target webpage
4. Check if the page has any Content Security Policy restrictions

## License

This project is open source and available under the [LICENSE](LICENSE) file.
