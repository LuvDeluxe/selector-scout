Selector Scout — Release notes (v1.0.1)

What changed

- Fix: Make generated Cypress snippets display the full `cy.get('<selector>')...` locator in the popup so you can see and copy the selector immediately.
- Fix: Prevent complex selectors (Puppeteer/Playwright) from disappearing in the modal by rebuilding the modal DOM with safe textContent/dataset usage instead of innerHTML. This preserves special characters and ensures snippets copy correctly.

Why update

This patch improves reliability when generating test snippets for Cypress and Puppeteer. Complex selectors that include quotes, brackets, or backslashes are now shown consistently in the UI and can be copied without corruption.

How to test

1. Load the unpacked extension in Chrome (chrome://extensions -> Developer mode -> Load unpacked).
2. Right-click any element and select "Selector Scout" -> "Generate Cypress snippet..." or "Generate Puppeteer snippet...".
3. The modal items should show the full snippet including the selector; clicking an item copies the exact snippet to the clipboard.

Notes

- No API or permission changes were made in this release.
- Bumped manifest version to 1.0.1 for Chrome Web Store submission.
