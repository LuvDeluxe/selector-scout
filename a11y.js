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
    // use :nth-of-type(...) (no extra tag) to avoid "tag tag:nth-of-type(...)"
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
    // concatenate tag + suffix without extra space when suffix begins with ':'
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
      const descriptor = getDescriptor(el);

      findings.forEach((f) => {
        // use a stable key per issue type to group correctly
        const key = `${f.display}|||${f.suggestion}`;

        if (!groupedResults[key]) {
          groupedResults[key] = {
            display: f.display,
            severity: f.severity || "low",
            suggestion: f.suggestion || "",
            count: 0,
            examples: [],
          };
        }

        groupedResults[key].count += 1;

        // Push a plain example object with selector and optional short text only.
        const exampleObj = {
          selector: descriptor.selector,
          text: descriptor.text || "",
          id: descriptor.id || null,
          classes: descriptor.classes || "",
        };

        // dedupe by selector and cap to 10
        const exists = groupedResults[key].examples.some(
          (e) => e.selector === exampleObj.selector
        );
        if (!exists && groupedResults[key].examples.length < 10) {
          groupedResults[key].examples.push(exampleObj);
        }

        // keep full results list if you need it elsewhere
        results.push({
          selector: descriptor.selector,
          findings: [f],
        });
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
