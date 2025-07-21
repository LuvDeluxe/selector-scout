// This function is designed to be injected into the page by the background script
// It contains all the logic for generating selectors and copying them

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
 * Copies the given text to the user's clipboard using the modern Navigator API.
 * @param {string} text The text to copy.
 */
function copyToClipboard(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      console.log("Selector scout: Copied to clipboard:", text);
    })
    .catch((err) => {
      console.log("Selector scout: Failed to copy text: ", err);
    });
}
