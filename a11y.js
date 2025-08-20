// displayA11yResults removed from content script to avoid duplication.
// Rendering is handled by the popup (popup.js). The content script only
// collects and returns data via messaging.
console.log("a11y.js injected and starting...");

// Helper functions
function isVisible(el) {
  const style = window.getComputedStyle(el);
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0" &&
    el.offsetParent !== null
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
    fallbackInfo = `"${el.textContent.trim().substring(0, 30)}"`;
  } else if (el.href) {
    fallbackInfo = el.href;
  } else if (el.getAttribute("aria-label")) {
    fallbackInfo = `aria-label="${el
      .getAttribute("aria-label")
      .substring(0, 20)}"`;
  } else {
    const siblings = Array.from(el.parentNode?.children || []).filter(
      (child) => child.tagName === el.tagName
    );
    const index = siblings.indexOf(el);
    fallbackInfo = `(${index + 1} of ${siblings.length})`;
  }

  return {
    tag,
    selector: `${tag}${fallbackInfo ? ` ${fallbackInfo}` : ""}`,
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
    if (alt === null || alt === undefined) {
      findings.push({
        display: "MISSING ALT",
        severity: "high",
        suggestion:
          'Add alt attribute. Use alt="" for decorative images or descriptive text for informative images.',
      });
    } else if (alt.trim() === "") {
      // Empty alt is okay for decorative images, but flag it as info
      findings.push({
        display: "EMPTY ALT",
        severity: "medium",
        suggestion:
          'If decorative keep alt=""; if informative replace with concise alt text.',
      });
    }
  }

  // Check links
  if (tag === "a") {
    const href = el.getAttribute("href");
    const text = el.textContent?.trim();
    const ariaLabel = el.getAttribute("aria-label");

    if (!text && !ariaLabel) {
      findings.push({
        display: "NO ACCESSIBLE NAME",
        severity: "high",
        suggestion:
          "Provide readable text content or aria-label/aria-labelledby referencing visible text.",
      });
    }

    if (href === "#" || href === "javascript:void(0)" || href === "") {
      findings.push({
        display: "PLACEHOLDER HREF",
        severity: "medium",
        suggestion:
          "Use a real URL or use a button element/role for actions; avoid meaningless href='#'.",
      });
    }
  }

  // Check form inputs
  if (["input", "textarea", "select"].includes(tag)) {
    const labels = document.querySelectorAll(`label[for="${el.id}"]`);
    const ariaLabel = el.getAttribute("aria-label");
    const ariaLabelledby = el.getAttribute("aria-labelledby");
    const hasLabel =
      labels.length > 0 || el.closest("label") || ariaLabel || ariaLabelledby;

    if (!hasLabel) {
      findings.push({
        display: "MISSING LABEL",
        severity: "high",
        suggestion:
          "Wrap input in <label> or add aria-label/aria-labelledby that points to visible text.",
      });
    }

    const text = el.textContent?.trim();
    if (!text && !ariaLabel && !ariaLabelledby) {
      findings.push({
        display: "NO ACCESSIBLE NAME",
        severity: "high",
        suggestion:
          "Provide readable text content or aria-label/aria-labelledby referencing visible text.",
      });
    }
  }

  // Check buttons
  if (tag === "button") {
    const text = el.textContent?.trim();
    const ariaLabel = el.getAttribute("aria-label");

    if (!text && !ariaLabel) {
      findings.push({
        display: "NO ACCESSIBLE NAME",
        severity: "high",
        suggestion:
          "Provide readable text content or aria-label/aria-labelledby referencing visible text.",
      });
    }
  }

  return findings;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("Message received in a11y.js:", msg);
  if (!msg || msg.type !== "SS_RUN_A11Y_SCAN") return;

  const scope = msg.scope || "visible";
  const results = [];
  const groupedResults = {};

  const nodeList =
    scope === "page"
      ? document.querySelectorAll("body *")
      : document.querySelectorAll("body *");

  nodeList.forEach((el) => {
    if (scope === "visible" && !isVisible(el)) return;
    const findings = generateAccessibilityInfo(el);
    if (findings && findings.length) {
      const weight = { high: 3, medium: 2, low: 1, info: 0 };
      findings.sort(
        (a, b) => (weight[b.severity] || 0) - (weight[a.severity] || 0)
      );
      results.push({ element: getDescriptor(el), findings });

      // Group for summary
      findings.forEach((finding) => {
        const key = finding.display;
        if (!groupedResults[key]) {
          groupedResults[key] = {
            display: finding.display,
            severity: finding.severity,
            suggestion: finding.suggestion,
            count: 0,
            examples: [],
          };
        }
        groupedResults[key].count++;
        if (groupedResults[key].examples.length < 5) {
          groupedResults[key].examples.push({
            selector: getDescriptor(el).selector,
          });
        }
      });
    }
  });

  const summary = {
    totalIssues: results.length,
    highCount: results.filter((r) =>
      r.findings.some((f) => f.severity === "high")
    ).length,
    mediumCount: results.filter((r) =>
      r.findings.some((f) => f.severity === "medium")
    ).length,
    lowCount: results.filter((r) =>
      r.findings.some((f) => f.severity === "low")
    ).length,
  };

  sendResponse({ results: Object.values(groupedResults), summary });
  console.log("Scan complete, response sent.");
  return true;
});
