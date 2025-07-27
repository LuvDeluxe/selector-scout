/**
 * Add a listener to the whole document that waits for a contextmenu event
 */
document.addEventListener(
  "contextmenu",
  (event) => {
    window.lastRightClickedElement = event.target;
  },
  true
);

/**
  Mailbox for content script
  Sets up a listener that runs the callback function every time a message
  is sent to this tab.
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // The request object is the message sent from background.js
  if (request.type === "SS_PERFORM_ACTION") {
    if (!window.lastRightClickedElement) {
      console.error("Selector Scout: Element not found.");
      return;
    }
    // Call main router function, passing necessary data from the message and the element stored earlier
    handleAction(request.menuItemId, window.lastRightClickedElement);
  }
});

/**
 * Main action router Looks at the menuItemId and decides which follow-up function to call
 */
function handleAction(menuItemId, el) {
  switch (menuItemId) {
    case "copy-css-selector":
      copyToClipboard(getCssSelector(el));
      break;
    case "copy-xpath":
      copyToClipboard(getXPath(el));
      break;
    case "generate-cypress-snippet":
      const suggestions = generateCypressAssertions(el); // generate list of choices
      showModal("Cypress Snippet Suggestions", suggestions); // show modal with those suggestions
      break;
  }
}

/**
 * Analyzes an element and generates a list of useful, context aware Cypress commands
 */
function generateCypressAssertions(el) {
  const selector = getCssSelector(el);
  const base = `cy.get('${selector}')`;
  const tagName = el.tagName.toLowerCase();

  // Start with useful suggestions
  let suggestions = [
    { display: `.should('be.visible')`, code: `${base}.should('be.visible');` },
    { display: `.should('exist')`, code: `${base}.should('exist');` },
  ];

  // Check properties of the element for adding smarter suggestions

  // Suggest checking a links 'href'.
  if (tagName === "a") {
    suggestions.push({
      display: `.should('have.attr', 'href', ...)`,
      code: `${base}.should('have.attr', 'href', '${el.getAttribute(
        "href"
      )}');`,
    });
  }
  // Suggest checking for text if it has it.
  if (el.textContent) {
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
    suggestions.push({
      display: `.should('have.value', ...)`,
      code: `${base}.should('have.value', '${el.value}');`,
    });
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

/**
 * This function builds and displays the custom HTML modal on the page.
 */
function showModal(title, items) {
  // If already open, remove it to prevent duplicates.
  const existingModal = document.getElementById("selector-scout-modal");
  if (existingModal) existingModal.remove();

  const modal = document.createElement("div");
  modal.id = "selector-scout-modal";

  modal.innerHTML = `
    <div class="ssm-overlay"></div>
    <div class="ssm-content">
        <div class="ssm-header">
            <h3>${title}</h3>
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

  modal.querySelectorAll(".ssm-body li").forEach((li) => {
    li.addEventListener("click", () => {
      copyToClipboard(li.dataset.code);
      modal.remove();
    });
  });
}

/**
 * Generates a unique, stable CSS selector for a given HTML element.
 * The strategy is to find the most reliable selector possible.
 * @param {Element} el The HTML element to generate a selector for.
 * @returns {string} The generated CSS selector.
 */

function getCssSelector(el) {
  // Ensure working with an HTML element
  if (!(el instanceof Element)) {
    return;
  }

  // 1 Use a unique ID if it exists
  if (el.id) {
    return `#${el.id}`;
  }

  // 2 Use a data-testid attribute
  if (el.hasAttribute("data-testid")) {
    return `[data-testid="${el.getAttribute("data-testid")}"]`;
  }

  // 3 Fallback to constructing a path from the element up to the body
  const path = [];
  while (el && el.nodeType === Node.ELEMENT_NODE) {
    // Start with elements tag name (e.g 'div', 'button')
    let selector = el.nodeName.toLowerCase();

    // Add class names if they exist. This makes the selector more specific. E.G div.class1.class2
    if (el.className) {
      const stableClasses = el.className.split(/\s+/).filter(Boolean).join(".");
      if (stableClasses) {
        selector += `.${stableClasses}`;
      }
    }

    // If multiple siblings with same tag, need to add `:nth-of-type`
    // to distinguish the element from its brothers and sisters
    const siblings = Array.from(el.parentNode.children);
    const sameTagSiblings = siblings.filter(
      (sibling) => sibling.nodeName.toLowerCase() === el.nodeName.toLowerCase()
    );
    if (sameTagSiblings.length > 1) {
      const index = sameTagSiblings.indexOf(el) + 1;
      selector += `:nth-of-type(${index})`;
    }

    // Add generated part of the selector to the beginning of path array
    path.unshift(selector);

    // After adding a part check if selector is unique. If so stop
    // This prevents creating unnecessarily long selectors like 'body > div > ...'
    try {
      if (document.querySelectorAll(path.join(" > ")).length === 1) {
        break;
      }
    } catch (e) {}

    // Move up to the next parent element and repeat the process.
    el = el.parentNode;
  }
  return path.join(" > ");
}

/**
 * Generates an XPath for a given element using a recursive approach.
 * @param {Element} el The element to generate an XPath for.
 * @returns {string} The XPath.
 */
function getXPath(el) {
  // if element has id, use for direct and stable xPath
  if (el.id !== "") {
    return `id("${el.id}")`;
  }

  // if reached top stop recursion
  if (el === document.body) {
    return el.tagName;
  }

  let ix = 0;
  const siblings = el.parentNode.childNodes;

  for (let i = 0; i < siblings.length; i++) {
    const sibling = siblings[i];

    if (sibling === el) {
      // Recursively call getXPath for the parent and append this elements path part
      return `${getXPath(el.parentNode)}/${el.tagName}[${ix + 1}]`;
    }
    // Count only element nodes with same tag name to get the correct index
    if (sibling.nodeType === 1 && sibling.tagName === el.tagName) {
      ix++;
    }
  }
}

/**
 * Copies text and now shows a visual confirmation toast.
 * @param {string} text The text to copy.
 */
function copyToClipboard(text) {
  if (!text) return;
  navigator.clipboard
    .writeText(text)
    .then(() => {
      showToast(`Copied: ${text.substring(0, 60)}...`);
    })
    .catch((err) => {
      console.error("Selector Scout: Failed to copy text: ", err);
    });
}

/**
 * Shows a temporary toast message on the page
 * @param {string} message The message to display
 */
function showToast(message) {
  const existingToast = document.querySelector(".selector-scout-toast");
  if (existingToast) existingToast.remove();

  const toast = document.createElement("div");
  toast.className = "selector-scout-toast";
  toast.textContent = message;

  // Apply CSS directly via JS for self-contaiend functionality
  toast.style.cssText = `position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
        background-color: #007aff; color: white; padding: 12px 24px; border-radius: 8px;
        z-index: 2147483647; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 14px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        transition: opacity 0.5s ease, bottom 0.5s ease; opacity: 0;`;
  document.body.appendChild(toast);

  // Use short timeout to trigger transition for smooth fade-in animation
  setTimeout(() => {
    toast.style.opacity = "1";
    toast.style.bottom = "40px";
  }, 10);

  // After 3 seconds fade the toast out and remove it from the dom
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.bottom = "30px";
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

/**
 * Escapes HTML special characters
 * @param {string} str The string to escape
 */
function escapeHTML(str) {
  const p = document.createElement("p");
  p.appendChild(document.createTextNode(str));
  return p.innerHTML;
}
