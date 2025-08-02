# Selector Scout

A Chrome extension that helps developers generate reliable CSS selectors, create test snippets for Cypress and Playwright, and check accessibility issues by right-clicking on any element.

## Features

- **Generate Cypress Snippets**: Right-click any element to get Cypress test assertions
- **Generate Playwright Snippets**: Create Playwright test code for any element
- **Copy Attributes**: View and copy any element's attributes
- **Accessibility Check**: Identify common accessibility issues
- **Dark Mode**: Toggle dark mode for the modal interface
- **Smart Selector Generation**: Creates reliable, unique CSS selectors

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
