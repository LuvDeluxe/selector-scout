console.log("a11y.js injected and starting...");

// Helper functions
function isVisible(el) {
  // More comprehensive visibility check
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;

  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    parseFloat(style.opacity) > 0 &&
    // Element must be within viewport or close to it
    rect.bottom >= -100 &&
    rect.right >= -100 &&
    rect.top <=
      (window.innerHeight || document.documentElement.clientHeight) + 100 &&
    rect.left <=
      (window.innerWidth || document.documentElement.clientWidth) + 100
  );
}

function getDescriptor(el) {
  const tag = el.tagName.toLowerCase();

  if (el.id) {
    return {
      tag,
      selector: `#${el.id}`,
      id: el.id,
      classes: el.className || "",
      text: el.textContent?.trim().substring(0, 50) || "",
    };
  }

  if (el.className && typeof el.className === "string") {
    const classes = el.className.trim().split(/\s+/).join(".");
    return {
      tag,
      selector: `${tag}.${classes}`,
      id: null,
      classes: el.className,
      text: el.textContent?.trim().substring(0, 50) || "",
    };
  }

  let fallbackInfo = "";

  if (el.textContent && el.textContent.trim()) {
    const text = el.textContent.trim().substring(0, 30);
    fallbackInfo = `"${text}"`;
  } else if (el.href) {
    try {
      const u = new URL(el.getAttribute("href"), location.href);
      const short = `${u.hostname}${u.pathname}`.replace(/\/$/, "");
      fallbackInfo =
        short.length > 60 ? `${short.slice(0, 57)}...` : short || u.hostname;
    } catch (e) {
      const raw = el.getAttribute("href") || "";
      fallbackInfo = raw.length > 60 ? `${raw.slice(0, 57)}...` : raw;
    }
  } else {
    // Use nth-of-type for position-based selection
    let nth = 1;
    if (el.parentNode) {
      const siblings = Array.from(el.parentNode.children).filter(
        (s) => s.tagName === el.tagName
      );
      nth = siblings.length > 1 ? siblings.indexOf(el) + 1 : 1;
    }
    fallbackInfo = `:nth-of-type(${nth})`;
  }

  return {
    tag,
    selector: `${tag}${
      fallbackInfo.startsWith(":") ? fallbackInfo : ` ${fallbackInfo}`
    }`.trim(),
    id: null,
    classes: "",
    text: el.textContent?.trim().substring(0, 50) || "",
  };
}

function generateAccessibilityInfo(el) {
  const findings = [];
  const tag = el.tagName.toLowerCase();

  // Check images
  if (tag === "img") {
    const alt = el.getAttribute("alt");
    const src = el.getAttribute("src");

    if (alt === null || alt === undefined) {
      findings.push({
        display: "MISSING ALT ATTRIBUTE",
        severity: "high",
        suggestion:
          'Add alt attribute. Use alt="" for decorative images or descriptive text for informative images.',
      });
    } else if (
      alt.trim() === "" &&
      src &&
      !src.includes("spacer") &&
      !src.includes("pixel")
    ) {
      // Empty alt might be suspicious unless it's clearly decorative
      findings.push({
        display: "EMPTY ALT ATTRIBUTE",
        severity: "medium",
        suggestion:
          'Verify if image is decorative (keep alt="") or informative (add descriptive alt text).',
      });
    }
  }

  // Check links
  if (tag === "a") {
    const href = el.getAttribute("href");
    const text = el.textContent?.trim();
    const ariaLabel = el.getAttribute("aria-label");
    const ariaLabelledby = el.getAttribute("aria-labelledby");

    // Check for accessible name
    if (!text && !ariaLabel && !ariaLabelledby) {
      findings.push({
        display: "LINK WITH NO ACCESSIBLE NAME",
        severity: "high",
        suggestion:
          "Provide readable text content, aria-label, or aria-labelledby referencing visible text.",
      });
    }

    // Check for meaningful href
    if (href === "#" || href === "javascript:void(0)" || href === "") {
      findings.push({
        display: "PLACEHOLDER OR EMPTY HREF",
        severity: "medium",
        suggestion:
          "Use a real URL or convert to a button element for actions. Avoid href='#' or javascript:void(0).",
      });
    }

    // Check for vague link text
    if (text && /^(click here|read more|more|here|link)$/i.test(text.trim())) {
      findings.push({
        display: "VAGUE LINK TEXT",
        severity: "medium",
        suggestion:
          "Use descriptive link text that makes sense out of context. Avoid 'click here', 'read more', etc.",
      });
    }
  }

  // Check form inputs
  if (["input", "textarea", "select"].includes(tag)) {
    const type = el.getAttribute("type");
    const id = el.getAttribute("id");
    const ariaLabel = el.getAttribute("aria-label");
    const ariaLabelledby = el.getAttribute("aria-labelledby");

    // Find associated labels
    const labels = id ? document.querySelectorAll(`label[for="${id}"]`) : [];
    const wrappingLabel = el.closest("label");
    const hasLabel =
      labels.length > 0 || wrappingLabel || ariaLabel || ariaLabelledby;

    if (
      !hasLabel &&
      type !== "hidden" &&
      type !== "submit" &&
      type !== "button"
    ) {
      findings.push({
        display: "FORM INPUT WITHOUT LABEL",
        severity: "high",
        suggestion:
          "Associate input with a label element, or add aria-label/aria-labelledby.",
      });
    }

    // Check for required inputs without indication
    if (el.hasAttribute("required") && !el.getAttribute("aria-required")) {
      const labelText =
        wrappingLabel?.textContent || labels[0]?.textContent || ariaLabel || "";

      if (
        labelText &&
        !labelText.includes("*") &&
        !labelText.toLowerCase().includes("required")
      ) {
        findings.push({
          display: "REQUIRED FIELD NOT INDICATED",
          severity: "medium",
          suggestion:
            "Indicate required fields visually and programmatically (aria-required='true').",
        });
      }
    }
  }

  // Check buttons
  if (
    tag === "button" ||
    (tag === "input" && ["button", "submit"].includes(el.getAttribute("type")))
  ) {
    const text = el.textContent?.trim();
    const ariaLabel = el.getAttribute("aria-label");
    const ariaLabelledby = el.getAttribute("aria-labelledby");
    const value = el.getAttribute("value");

    if (!text && !ariaLabel && !ariaLabelledby && !value) {
      findings.push({
        display: "BUTTON WITHOUT ACCESSIBLE NAME",
        severity: "high",
        suggestion:
          "Provide readable button text, value attribute, or aria-label.",
      });
    }
  }

  // Check headings
  if (/^h[1-6]$/.test(tag)) {
    const text = el.textContent?.trim();
    if (!text) {
      findings.push({
        display: "EMPTY HEADING",
        severity: "medium",
        suggestion:
          "Headings should contain descriptive text. Remove empty headings or add content.",
      });
    }

    // Check heading hierarchy (simplified check)
    const level = parseInt(tag.charAt(1));
    const prevHeading = Array.from(
      document.querySelectorAll("h1, h2, h3, h4, h5, h6")
    )
      .reverse()
      .find(
        (h) =>
          h !== el &&
          h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING
      );

    if (prevHeading && level > parseInt(prevHeading.tagName.charAt(1)) + 1) {
      findings.push({
        display: "HEADING HIERARCHY SKIP",
        severity: "medium",
        suggestion: `Heading levels should not skip. Found ${tag} after ${prevHeading.tagName.toLowerCase()}.`,
      });
    }
  }

  // Check for missing alt on background images with content
  if (
    el.style.backgroundImage ||
    window.getComputedStyle(el).backgroundImage !== "none"
  ) {
    const hasText = el.textContent?.trim();
    const hasAriaLabel = el.getAttribute("aria-label");

    if (!hasText && !hasAriaLabel) {
      findings.push({
        display: "BACKGROUND IMAGE WITHOUT TEXT",
        severity: "medium",
        suggestion:
          "Elements with background images should have descriptive text or aria-label.",
      });
    }
  }

  // Check for custom elements or divs/spans used as buttons
  if (
    (tag === "div" || tag === "span") &&
    (el.onclick || el.getAttribute("onclick") || el.style.cursor === "pointer")
  ) {
    const hasRole = el.getAttribute("role");
    const hasTabindex = el.hasAttribute("tabindex");

    if (!hasRole || hasRole !== "button") {
      findings.push({
        display: "CLICKABLE ELEMENT WITHOUT BUTTON ROLE",
        severity: "high",
        suggestion:
          "Add role='button' and tabindex='0' to clickable divs/spans, or use a real button element.",
      });
    }

    if (!hasTabindex || el.getAttribute("tabindex") < 0) {
      findings.push({
        display: "CLICKABLE ELEMENT NOT KEYBOARD ACCESSIBLE",
        severity: "high",
        suggestion:
          "Add tabindex='0' to make clickable elements keyboard accessible.",
      });
    }
  }

  // Check for iframe without title
  if (tag === "iframe") {
    const title = el.getAttribute("title");
    const ariaLabel = el.getAttribute("aria-label");

    if (!title && !ariaLabel) {
      findings.push({
        display: "IFRAME WITHOUT TITLE",
        severity: "medium",
        suggestion:
          "Add title attribute or aria-label to describe the iframe content.",
      });
    }
  }

  // Check for tables without proper headers
  if (tag === "table") {
    const headers = el.querySelectorAll("th");
    const caption = el.querySelector("caption");

    if (headers.length === 0) {
      findings.push({
        display: "TABLE WITHOUT HEADERS",
        severity: "high",
        suggestion:
          "Use <th> elements to mark table headers for better screen reader support.",
      });
    }

    if (
      !caption &&
      !el.getAttribute("aria-label") &&
      !el.getAttribute("aria-labelledby")
    ) {
      findings.push({
        display: "TABLE WITHOUT CAPTION",
        severity: "medium",
        suggestion:
          "Add <caption> element or aria-label to describe the table purpose.",
      });
    }
  }

  return findings;
}

// Add a ping handler to check if script is loaded
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("Message received in a11y.js:", msg);

  // Handle ping requests
  if (msg && msg.type === "SS_PING") {
    sendResponse({ status: "ready" });
    return true;
  }

  if (!msg || msg.type !== "SS_RUN_A11Y_SCAN") return;

  console.log("Starting accessibility scan...");

  try {
    const scope = msg.scope || "visible";
    const results = [];
    const groupedResults = {};

    // Get all elements, but be more selective
    const allElements = document.querySelectorAll("*");
    let processedCount = 0;
    let visibleCount = 0;

    console.log(`Found ${allElements.length} total elements`);

    allElements.forEach((el) => {
      processedCount++;

      // Skip script, style, meta, and other non-content elements
      const tag = el.tagName.toLowerCase();
      if (
        [
          "script",
          "style",
          "meta",
          "link",
          "head",
          "title",
          "noscript",
        ].includes(tag)
      ) {
        return;
      }

      // For visible scope, check visibility
      if (scope === "visible" && !isVisible(el)) {
        return;
      }

      visibleCount++;

      try {
        const findings = generateAccessibilityInfo(el);
        if (findings && findings.length > 0) {
          const descriptor = getDescriptor(el);

          findings.forEach((finding) => {
            // Create a unique key for grouping similar issues
            const key = `${finding.display}|||${finding.severity}|||${finding.suggestion}`;

            if (!groupedResults[key]) {
              groupedResults[key] = {
                display: finding.display,
                severity: finding.severity || "low",
                suggestion: finding.suggestion || "",
                count: 0,
                examples: [],
              };
            }

            groupedResults[key].count += 1;

            // Add example with deduplication
            const exampleObj = {
              selector: descriptor.selector,
              text: descriptor.text || "",
              id: descriptor.id || null,
              classes: descriptor.classes || "",
            };

            const exists = groupedResults[key].examples.some(
              (e) => e.selector === exampleObj.selector
            );

            if (!exists && groupedResults[key].examples.length < 10) {
              groupedResults[key].examples.push(exampleObj);
            }

            // Keep individual results for summary calculation
            results.push({
              selector: descriptor.selector,
              findings: [finding],
            });
          });
        }
      } catch (elementError) {
        console.warn("Error processing element:", elementError, el);
      }
    });

    console.log(
      `Processed ${processedCount} elements, ${visibleCount} visible, found ${results.length} issues`
    );

    // Calculate summary statistics
    const groupedArray = Object.values(groupedResults);
    const summary = {
      totalIssues: results.length,
      totalGroups: groupedArray.length,
      highCount: groupedArray
        .filter((g) => g.severity === "high")
        .reduce((sum, g) => sum + g.count, 0),
      mediumCount: groupedArray
        .filter((g) => g.severity === "medium")
        .reduce((sum, g) => sum + g.count, 0),
      lowCount: groupedArray
        .filter((g) => g.severity === "low")
        .reduce((sum, g) => sum + g.count, 0),
    };

    console.log("Scan summary:", summary);
    console.log("Grouped results:", groupedArray);

    const response = {
      results: groupedArray,
      summary,
      debug: {
        totalElements: allElements.length,
        processedElements: processedCount,
        visibleElements: visibleCount,
        scope,
      },
    };

    sendResponse(response);
    console.log("Accessibility scan complete, response sent");
  } catch (error) {
    console.error("Accessibility scan error:", error);
    sendResponse({
      error: error.message,
      results: [],
      summary: { totalIssues: 0, highCount: 0, mediumCount: 0, lowCount: 0 },
    });
  }

  return true; // Keep message channel open for async response
});
