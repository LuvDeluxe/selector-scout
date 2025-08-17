let scoutLastTarget = null;

// Decode HTML entities for better attribute values
function decodeHTMLEntities(str) {
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
}

// Escape a string for safe inclusion inside single-quoted JS code snippets
function escapeForSingleQuotedJs(str) {
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n");
}

// Inject CSS styles for the modal
function injectStyles() {
  if (document.getElementById("selector-scout-styles")) return;

  const style = document.createElement("style");
  style.id = "selector-scout-styles";
  style.textContent = `
    /* Modal dialogs CSS */
    #selector-scout-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    #selector-scout-modal .ssm-overlay {
      position: absolute;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
    }

    /* Light mode styles (default) */
    #selector-scout-modal .ssm-content {
      position: relative;
      width: 90%;
      max-width: 550px;
      background: #ffffff;
      color: #333333;
      border-radius: 12px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
      border: 1px solid #e0e0e0;
      overflow: hidden;
  transition: background-color 0.35s ease, color 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease;
    }

    #selector-scout-modal .ssm-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 20px;
      background: #f8f9fa;
      border-bottom: 1px solid #e0e0e0;
    }

    #selector-scout-modal .ssm-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #333333;
    }

    #selector-scout-modal #ssm-close {
      background: none;
      border: none;
      color: #666666;
      font-size: 28px;
      font-weight: bold;
      cursor: pointer;
      padding: 0 8px;
      line-height: 1;
      transition: color 0.2s ease;
    }

    #selector-scout-modal #ssm-close:hover {
      color: #333333;
    }

    #selector-scout-modal .ssm-body ul {
      list-style: none;
      padding: 8px 0;
      margin: 0;
      max-height: 60vh;
      overflow-y: auto;
    }

    #selector-scout-modal .ssm-body li {
      padding: 14px 20px;
      cursor: pointer;
      transition: background-color 0.2s ease, color 0.2s ease;
      border-bottom: 1px solid #f0f0f0;
      font-family: "SF Mono", "Consolas", "Menlo", monospace;
      font-size: 14px;
      white-space: pre-wrap;
      word-break: break-word;
      color: #333333;
  transition: background-color 0.35s ease, color 0.35s ease, border-color 0.35s ease;
    }

    #selector-scout-modal .ssm-body li:last-child {
      border-bottom: none;
    }

    #selector-scout-modal .ssm-body li:hover {
      background: #007aff;
      color: white;
    }

    /* Dark mode styles */
    #selector-scout-modal.ssm-dark-mode .ssm-content {
      background: #2c2c2e;
      color: #ffffff;
      border: 1px solid #4a4a4a;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
    }

    #selector-scout-modal.ssm-dark-mode .ssm-header {
      background: #333333;
      border-bottom: 1px solid #4a4a4a;
    }

    #selector-scout-modal.ssm-dark-mode .ssm-header h3 {
      color: #ffffff;
    }

    #selector-scout-modal.ssm-dark-mode #ssm-close {
      color: #aaaaaa;
    }

    #selector-scout-modal.ssm-dark-mode #ssm-close:hover {
      color: #ffffff;
    }

    #selector-scout-modal.ssm-dark-mode .ssm-body li {
      border-bottom: 1px solid #3a3a3a;
      color: #ffffff;
    }

    #selector-scout-modal.ssm-dark-mode .ssm-body li:hover {
      background: #007acc;
      color: white;
    }

    /* Toast notification */
    .selector-scout-toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #007aff;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
      opacity: 0;
      transform: translate(-50%, 10px);
      max-width: 80%;
      word-wrap: break-word;
    }
  `;
  document.head.appendChild(style);
}

// Inject styles when the script loads
injectStyles();

// Improved element capture - use both mousedown and contextmenu events
document.addEventListener(
  "mousedown",
  (event) => {
    // Store the target on mousedown to ensure we capture the right element
    if (event.button === 2) {
      // Right mouse button
      scoutLastTarget = event.target;
      console.log(
        "Selector Scout: Captured element on mousedown:",
        event.target
      );
    }
  },
  true
);

document.addEventListener(
  "contextmenu",
  (event) => {
    // Also capture on contextmenu as backup
    scoutLastTarget = event.target;
    console.log(
      "Selector Scout: Captured element on contextmenu:",
      event.target
    );
  },
  true
);

// Alt + Shift + S -> open modal with last snippet type
// Alt + Shift + D -> Toggle dark mode locally
document.addEventListener("keydown", (e) => {
  // Ignore when typing in inputs / textareas or contenteditable elements
  const t = e.target;

  if (
    t &&
    (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)
  )
    return;

  if (e.altKey && e.shiftKey && e.code === "KeyS") {
    chrome.runtime.sendMessage({
      type: "SS_OPEN_MODAL",
      menuItemId: window.scoutLastSnippetType || "generate-playwright-snippet",
    });
  }

  if (e.altKey && e.shiftKey && e.code === "KeyD") {
    chrome.storage.sync.get("darkMode", (data) => {
      const next = !data.darkMode;
      chrome.storage.sync.set({ darkMode: next }, () => {
        // apply to any open modal immediately
        const modal = document.getElementById("selector-scout-modal");
        if (modal) modal.classList.toggle("ssm-dark-mode", next);
        showToast(`Theme: ${next ? "Dark" : "Light"}`);
      });
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Selector Scout: Received message:", request);

  if (!sender || sender.id !== chrome.runtime.id) {
    console.log("Selector Scout: Invalid sender, ignoring message");
    sendResponse({ success: false, error: "Invalid sender" });
    return;
  }
  if (!request || typeof request !== "object" || !request.type) {
    console.log("Selector Scout: Invalid request format, ignoring message");
    sendResponse({ success: false, error: "Invalid request format" });
    return;
  }

  if (request.type === "SS_OPEN_MODAL") {
    console.log(
      "Selector Scout: Opening modal for menu item:",
      request.menuItemId
    );
    console.log("Selector Scout: Current target element:", scoutLastTarget);

    if (!scoutLastTarget) {
      console.error("Selector Scout: Element not found.");
      showToast("⚠️ No element found. Try right-clicking on a real element.");
      sendResponse({ success: false, error: "No element found" });
      return;
    }

    // Verify the element still exists in the DOM
    if (!document.contains(scoutLastTarget)) {
      console.error("Selector Scout: Element no longer exists in DOM.");
      showToast("⚠️ Element no longer exists. Try right-clicking again.");
      sendResponse({ success: false, error: "Element no longer exists" });
      return;
    }

    handleAction(request.menuItemId, scoutLastTarget);
    sendResponse({ success: true });
    return; // prevent falling through
  }

  if (request.type === "SS_TOGGLE_DARK_MODE") {
    const modal = document.getElementById("selector-scout-modal");
    if (modal) {
      if (request.enabled) {
        modal.classList.add("ssm-dark-mode");
      } else {
        modal.classList.remove("ssm-dark-mode");
      }
    }
    sendResponse({ success: true });
  }

  // TODO
  // Handle a copy selector command from the bg script
  if (request.type === "SS_COPY_SELECTOR") {
    // ensure there is last captured element and still exists in the DOM
    if (!scoutLastTarget || !document.contains(scoutLastTarget)) {
      showToast("⚠️ No recent element. Right-click an element first.");
      sendResponse && sendResponse({ success: false, error: "No target" });
    }

    const sel = getCssSelector(scoutLastTarget);
    if (sel) {
      copyToClipboard(sel);
      showToast("✅ CSS selector copied");
      sendResponse && sendResponse({ success: true, selector: sel });
    } else {
      showToast("❌ Could not build selector");
      sendResponse && sendResponse({ success: false, error: "No selector" });
    }
    return;
  }
});

function handleAction(menuItemId, el) {
  try {
    console.log(
      "Selector Scout: Handling action:",
      menuItemId,
      "for element:",
      el
    );

    switch (menuItemId) {
      case "generate-cypress-snippet":
        const suggestions = generateCypressAssertions(el);
        showModal("Cypress Snippet Suggestions", suggestions);
        break;
      case "generate-playwright-snippet":
        const playwrightSuggestions = generatePlaywrightAssertions(el);
        showModal("Playwright Snippet Suggestions", playwrightSuggestions);
        break;
      case "generate-puppeteer-snippet":
        const puppeteerSuggestions = generatePuppeteerAssertions(el);
        showModal("Puppeteer Snippet Suggestions", puppeteerSuggestions);
        break;
      case "copy-attribute":
        const attributes = generateAttributeList(el);
        showModal("Copy CSS Selector or Attribute", attributes);
        break;
      case "check-accessibility":
        const a11yInfo = generateAccessibilityInfo(el);
        showModal("Accessibility Check", a11yInfo);
        break;
      default:
        console.error("Selector Scout: Unknown menu item:", menuItemId);
    }
  } catch (error) {
    console.error("Selector Scout: Error handling action:", error);
    showToast("❌ An error occurred while processing your request.");
  }
}

function generateCypressAssertions(el) {
  const selector = getCssSelector(el);
  if (!selector) {
    return [
      {
        display: "❌ Could not generate a reliable selector for this element.",
        code: "",
      },
    ];
  }

  const base = `cy.get('${selector}')`;
  const tagName = el.tagName.toLowerCase();

  let suggestions = [
    { display: `.should('be.visible')`, code: `${base}.should('be.visible');` },
    { display: `.should('exist')`, code: `${base}.should('exist');` },
  ];

  if (tagName === "a" && el.hasAttribute("href")) {
    suggestions.push({
      display: `.should('have.attr', 'href', ...)`,
      code: `${base}.should('have.attr', 'href', '${el.getAttribute(
        "href"
      )}');`,
    });
  }

  if (el.textContent && el.textContent.trim()) {
    const text = el.textContent.trim().substring(0, 30);
    suggestions.push({
      display: `.should('contain', '${text}...')`,
      code: `${base}.should('contain', '${el.textContent.trim()}');`,
    });
  }

  if (tagName === "input" || tagName === "textarea") {
    suggestions.push({
      display: `.type('your-text')`,
      code: `${base}.type('your-text-here');`,
    });
    if (el.value) {
      suggestions.push({
        display: `.should('have.value', ...)`,
        code: `${base}.should('have.value', '${el.value}');`,
      });
    }
  }

  if (el.disabled) {
    suggestions.push({
      display: `.should('be.disabled')`,
      code: `${base}.should('be.disabled');`,
    });
  } else {
    suggestions.push({ display: `.click()`, code: `${base}.click();` });
  }

  return suggestions;
}

function generateAttributeList(el) {
  const attrs = [];
  if (el.hasAttributes()) {
    for (const attr of el.attributes) {
      const value = attr.value || "";
      // Simple formatting for common attributes
      let formattedValue = value;
      let displayText = `${attr.name}: "${value.substring(0, 50)}${
        value.length > 50 ? "..." : ""
      }"`;

      if (attr.name === "class" && value.trim()) {
        formattedValue = value
          .trim()
          .split(/\s+/)
          .map((cls) => `.${cls}`)
          .join("");
        displayText = `${attr.name}: "${value.substring(0, 50)}${
          value.length > 50 ? "..." : ""
        }" → ${formattedValue}`;
      } else if (attr.name === "id" && value.trim()) {
        formattedValue = `#${value.trim()}`;
        displayText = `${attr.name}: "${value}" → ${formattedValue}`;
      }

      const finalValue = decodeHTMLEntities(formattedValue);
      console.log(
        "Selector Scout: Attribute",
        attr.name,
        "raw value:",
        value,
        "formatted:",
        formattedValue,
        "final:",
        finalValue
      );

      attrs.push({
        display: displayText,
        code: finalValue,
      });
    }
  }
  if (attrs.length === 0) {
    return [{ display: "No attributes found on this element.", code: "" }];
  }

  return attrs;
}

function generateAccessibilityInfo(el) {
  const findings = [];
  const tagName = el.tagName.toLowerCase();

  if (tagName === "img" && !el.hasAttribute("alt")) {
    findings.push({
      display: `❌ MISSING ALT TEXT`,
      code: "Image is missing an alt attribute.",
    });
  } else if (tagName === "img" && el.hasAttribute("alt")) {
    findings.push({ display: `✅ ALT text: "${el.alt}"`, code: el.alt });
  }

  if (tagName === "input" && el.type !== "hidden" && el.type !== "submit") {
    const hasWrappingLabel = el.closest("label");
    const hasAriaLabel = el.hasAttribute("aria-label");
    const hasConnectedLabel = el.id
      ? document.querySelector(`label[for="${el.id}"]`)
      : null;
    if (!hasWrappingLabel && !hasAriaLabel && !hasConnectedLabel) {
      findings.push({
        display: `❌ MISSING LABEL`,
        code: "Input is missing a <label> or aria-label.",
      });
    } else {
      findings.push({
        display: `✅ Has an accessible name.`,
        code: "Input has a label.",
      });
    }
  }

  if (findings.length === 0) {
    return [
      {
        display: "No specific accessibility checks for this element type.",
        code: "",
      },
    ];
  }
  return findings;
}

function generatePlaywrightAssertions(el) {
  const selector = getCssSelector(el);
  if (!selector) {
    return [
      {
        display: "❌ Could not generate a reliable selector for this element.",
        code: "",
      },
    ];
  }

  const locator = `page.locator('${selector}')`;
  const tagName = el.tagName.toLowerCase();

  let suggestions = [
    {
      display: `await expect(${locator}).toBeVisible();`,
      code: `await expect(${locator}).toBeVisible();`,
    },
    {
      display: `await expect(${locator}).toHaveCount(1);`,
      code: `await expect(${locator}).toHaveCount(1);`,
    },
  ];

  if (tagName === "a" && el.hasAttribute("href")) {
    suggestions.push({
      display: `await expect(${locator}).toHaveAttribute('href', ...);`,
      code: `await expect(${locator}).toHaveAttribute('href', '${el.getAttribute(
        "href"
      )}');`,
    });
  }

  if (el.textContent && el.textContent.trim()) {
    const text = el.textContent.trim();
    suggestions.push({
      display: `await expect(${locator}).toContainText(...);`,
      code: `await expect(${locator}).toContainText('${text}');`,
    });
  }

  if (tagName === "input" || tagName === "textarea") {
    suggestions.push({
      display: `await ${locator}.fill('your-text');`,
      code: `await ${locator}.fill('your-text-here');`,
    });
    if (el.value) {
      suggestions.push({
        display: `await expect(${locator}).toHaveValue(...);`,
        code: `await expect(${locator}).toHaveValue('${el.value}');`,
      });
    }
  }

  if (el.disabled) {
    suggestions.push({
      display: `await expect(${locator}).toBeDisabled();`,
      code: `await expect(${locator}).toBeDisabled();`,
    });
  } else {
    suggestions.push({
      display: `await ${locator}.click();`,
      code: `await ${locator}.click();`,
    });
  }

  return suggestions;
}

function generatePuppeteerAssertions(el) {
  const selector = getCssSelector(el);
  if (!selector) {
    return [
      {
        display: "❌ Could not generate a reliable selector for this element.",
        code: "",
      },
    ];
  }

  const tagName = el.tagName.toLowerCase();
  const escapedSelector = escapeForSingleQuotedJs(selector);
  let suggestions = [
    {
      display: `await page.waitForSelector('${escapedSelector}', { visible: true })`,
      code: `await page.waitForSelector('${escapedSelector}', { visible: true });`,
    },
    {
      display: `await page.$('${escapedSelector}')`,
      code: `await page.$('${escapedSelector}');`,
    },
  ];

  if (tagName === "a" && el.hasAttribute("href")) {
    const escapedHref = escapeForSingleQuotedJs(el.getAttribute("href"));
    suggestions.push({
      display: `.toHaveAttribute('href', ...)`,
      code: `await page.$eval('${escapedSelector}', (el) => el.getAttribute('href') === '${escapedHref}');`,
    });
  }

  if (el.textContent && el.textContent.trim()) {
    const text = el.textContent.trim().substring(0, 30);
    const escapedText = escapeForSingleQuotedJs(el.textContent.trim());
    suggestions.push({
      display: `.toContainText('${text}...')`,
      code: `await page.$eval('${escapedSelector}', (el) => (el.textContent || '').includes('${escapedText}'));`,
    });
  }

  if (tagName === "input" || tagName === "textarea") {
    suggestions.push({
      display: `.type('your-text')`,
      code: `await page.type('${escapedSelector}', 'your-text-here');`,
    });
    if (el.value) {
      const escapedValue = escapeForSingleQuotedJs(el.value);
      suggestions.push({
        display: `.toHaveValue(...)`,
        code: `await page.$eval('${escapedSelector}', (el) => el.value === '${escapedValue}');`,
      });
    }
  }

  if (el.disabled) {
    suggestions.push({
      display: `.toBeDisabled()`,
      code: `await page.$eval('${escapedSelector}', (el) => el.disabled);`,
    });
  } else {
    suggestions.push({
      display: `.click()`,
      code: `await page.click('${escapedSelector}');`,
    });
  }

  return suggestions;
}

function showModal(title, items) {
  const existingModal = document.getElementById("selector-scout-modal");
  if (existingModal) existingModal.remove();

  const modal = document.createElement("div");
  modal.id = "selector-scout-modal";

  chrome.storage.sync.get("darkMode", (data) => {
    // Default to light mode unless darkMode is explicitly set to true
    if (data.darkMode === true) {
      modal.classList.add("ssm-dark-mode");
    }
  });

  modal.innerHTML = `
    <div class="ssm-overlay"></div>
    <div class="ssm-content">
        <div class="ssm-header">
            <h3>${escapeHTML(title)}</h3>
            <button id="ssm-close">&times;</button>
        </div>
        <div class="ssm-body">
            <ul>
                ${items
                  .map(
                    (item) =>
                      `<li data-code="${escapeHTML(item.code)}">${escapeHTML(
                        item.display
                      )}</li>`
                  )
                  .join("")}
            </ul>
        </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal
    .querySelector("#ssm-close")
    .addEventListener("click", () => modal.remove());
  modal
    .querySelector(".ssm-overlay")
    .addEventListener("click", () => modal.remove());
  modal.querySelectorAll(".ssm-body li").forEach((li, index) => {
    li.addEventListener("click", () => {
      const item = items[index];
      copyToClipboard(item.code);
      modal.remove();
    });
  });
}

function getCssSelector(el) {
  if (!(el instanceof Element)) return null;

  // Try ID first
  if (el.id && el.id.trim()) {
    const idSelector = `#${el.id}`;
    if (document.querySelectorAll(idSelector).length === 1) {
      return idSelector;
    }
  }

  // Try data-testid
  if (el.hasAttribute("data-testid")) {
    const testId = el.getAttribute("data-testid");
    if (testId && testId.trim()) {
      return `[data-testid="${testId}"]`;
    }
  }

  // Try data-cy (Cypress convention)
  if (el.hasAttribute("data-cy")) {
    const dataCy = el.getAttribute("data-cy");
    if (dataCy && dataCy.trim()) {
      return `[data-cy="${dataCy}"]`;
    }
  }

  // Build a more reliable selector
  const path = [];
  let currentEl = el;

  while (currentEl && currentEl.nodeType === Node.ELEMENT_NODE) {
    let selector = currentEl.nodeName.toLowerCase();

    // Add classes if they exist and are stable
    if (currentEl.className && typeof currentEl.className === "string") {
      const classes = currentEl.className.split(/\s+/).filter(Boolean);
      if (classes.length > 0) {
        // Only use classes that don't seem dynamic (avoid classes with numbers, etc.)
        const stableClasses = classes.filter(
          (cls) =>
            !/\d/.test(cls) &&
            !cls.includes("__") &&
            !cls.includes("--") &&
            cls.length > 2
        );
        if (stableClasses.length > 0) {
          selector += `.${stableClasses.slice(0, 2).join(".")}`;
        }
      }
    }

    // Add nth-child if needed
    if (currentEl.parentNode) {
      const siblings = Array.from(currentEl.parentNode.children);
      const sameTagSiblings = siblings.filter(
        (sibling) =>
          sibling.nodeName.toLowerCase() === currentEl.nodeName.toLowerCase()
      );
      if (sameTagSiblings.length > 1) {
        const index = sameTagSiblings.indexOf(currentEl) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);

    // Check if this path is unique
    try {
      const fullSelector = path.join(" > ");
      if (document.querySelectorAll(fullSelector).length === 1) {
        return fullSelector;
      }
    } catch (e) {
      // If selector is invalid, continue building
    }

    if (!currentEl.parentNode || currentEl.parentNode === document.body) break;
    currentEl = currentEl.parentNode;
  }

  return path.join(" > ");
}

/**
 * Copies text to the clipboard using modern Clipboard API with fallback.
 * @param {string} text The text to copy.
 */
async function copyToClipboard(text) {
  if (typeof text !== "string" || !text) return;

  try {
    // Try modern Clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      showToast(
        `✅ Copied: ${text.substring(0, 50)}${text.length > 50 ? "..." : ""}`
      );
      return;
    }
  } catch (err) {
    console.log("Modern clipboard API failed, trying fallback");
  }

  // Fallback to execCommand
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);

    textarea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);

    if (success) {
      showToast(
        `✅ Copied: ${text.substring(0, 50)}${text.length > 50 ? "..." : ""}`
      );
    } else {
      showToast("❌ Failed to copy to clipboard");
    }
  } catch (err) {
    console.error("Selector Scout: Copy to clipboard failed.", err);
    showToast("❌ Failed to copy to clipboard");
  }
}

function showToast(message) {
  const existingToast = document.querySelector(".selector-scout-toast");
  if (existingToast) existingToast.remove();

  const toast = document.createElement("div");
  toast.className = "selector-scout-toast";
  toast.textContent = message;

  document.body.appendChild(toast);

  // Trigger reflow
  toast.offsetHeight;

  setTimeout(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translate(-50%, 0)";
  }, 10);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translate(-50%, 10px)";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function escapeHTML(str) {
  if (typeof str !== "string") return "";
  const p = document.createElement("p");
  p.appendChild(document.createTextNode(str));
  return p.innerHTML;
}
