document.addEventListener("DOMContentLoaded", () => {
  const darkModeToggle = document.getElementById("darkModeToggle");

  chrome.storage.sync.get(["darkMode", "_themeInitialized"], (data) => {
    if (typeof data.darkMode === "boolean") {
      darkModeToggle.checked = data.darkMode;
      document.body.classList.toggle("dark-mode", data.darkMode);
    } else {
      const systemPrefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      darkModeToggle.checked = systemPrefersDark;
      document.body.classList.toggle("dark-mode", systemPrefersDark);
      chrome.storage.sync.set({
        darkMode: systemPrefersDark,
        _themeInitialized: true,
      });
    }
  });

  darkModeToggle.addEventListener("change", () => {
    const enabled = darkModeToggle.checked;
    document.body.classList.toggle("dark-mode", enabled);
    chrome.storage.sync.set({ darkMode: enabled, _themeInitialized: true });
    try {
      chrome.runtime.sendMessage({ type: "SS_TOGGLE_DARK_MODE", enabled });
    } catch (e) {}
  });

  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", (e) => {
    chrome.storage.sync.get(["darkMode", "_themeInitialized"], (data) => {
      if (typeof data.darkMode === "boolean") return;
      const prefersDark = e.matches;
      darkModeToggle.checked = prefersDark;
      document.body.classList.toggle("dark-mode", prefersDark);
      chrome.storage.sync.set({ darkMode: prefersDark });
      try {
        chrome.runtime.sendMessage({
          type: "SS_TOGGLE_DARK_MODE",
          enabled: prefersDark,
        });
      } catch (err) {}
    });
  });

  const scanBtn = document.getElementById("scanA11yBtn");
  if (scanBtn) {
    scanBtn.addEventListener("click", () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) {
          console.error("No active tab found.");
          return;
        }
        const tabId = tabs[0].id;
        // Dynamically inject a11y.js to ensure it's loaded
        chrome.scripting.executeScript(
          {
            target: { tabId: tabId },
            files: ["a11y.js"],
          },
          () => {
            if (chrome.runtime.lastError) {
              console.error(
                "Script injection failed:",
                chrome.runtime.lastError.message
              );
              const container = document.getElementById("a11y-results");
              if (container) {
                container.innerHTML =
                  "<p>Error: Could not inject content script. Check extension permissions or try reloading.</p>";
              }
              return;
            }
            // Now send the message after injection
            chrome.tabs.sendMessage(
              tabId,
              { type: "SS_RUN_A11Y_SCAN", scope: "visible" },
              (resp) => {
                if (chrome.runtime.lastError) {
                  console.error(
                    "Message send failed:",
                    chrome.runtime.lastError.message
                  );
                  const container = document.getElementById("a11y-results");
                  if (container) {
                    container.innerHTML =
                      "<p>Error: Content script not responding. Try refreshing the page.</p>";
                  }
                  return;
                }
                console.log("Accessibility scan results", resp);
                if (resp && resp.results) {
                  displayA11yResults(resp);
                } else {
                  const container = document.getElementById("a11y-results");
                  if (container) {
                    container.innerHTML =
                      "<p>No results received. Scan may have failed.</p>";
                  }
                }
              }
            );
          }
        );
      });
    });
  }

  document.addEventListener(
    "contextmenu",
    (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    },
    true
  );
});

function displayA11yResults(data) {
  const container = document.getElementById("a11y-results");
  if (!container) {
    console.error("Results container not found!");
    return;
  }

  container.innerHTML = "";

  if (!data.results || data.results.length === 0) {
    container.innerHTML = "<p>No accessibility issues found!</p>";
    return;
  }

  // Summary
  const summaryDiv = document.createElement("div");
  summaryDiv.className = "summary";
  summaryDiv.innerHTML = `
    <h3>Scan Summary</h3>
    <p class="totalissues">Total issues: ${data.summary.totalIssues}</p>
    <p class="highseverity">High severity: ${data.summary.highCount}</p>
    <p class="mediumseverity">Medium severity: ${data.summary.mediumCount}</p>
  `;
  container.appendChild(summaryDiv);

  // Table for grouped results
  const table = document.createElement("table");
  table.className = "results-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th scope="col">Issue</th>
        <th scope="col">Severity</th>
        <th scope="col">Count</th>
        <th scope="col">Suggestion</th>
        <th scope="col">Examples (Selectors)</th>
      </tr>
    </thead>
    <tbody>
  `;

  data.results.forEach((group) => {
    const row = document.createElement("tr");
    row.className = `severity-${group.severity}`;
    const examplesList = group.examples
      .map((ex) => {
        let displaySelector = ex.selector;
        if (displaySelector.includes("http")) {
          try {
            const url = new URL(displaySelector.replace(/^a /, ""));
            displaySelector = `${url.hostname}${url.pathname.substring(
              0,
              20
            )}...`;
          } catch (e) {}
        }
        return `<li title="${ex.selector}">${displaySelector}</li>`;
      })
      .join("");

    row.innerHTML = `
      <td>${group.display}</td>
      <td>${group.severity.toUpperCase()}</td>
      <td>${group.count}</td>
      <td>${group.suggestion}</td>
      <td><ul>${examplesList}</ul></td>
    `;
    table.querySelector("tbody").appendChild(row);
  });

  container.appendChild(table);

  // Button container for Copy and Hide
  const buttonContainer = document.createElement("div");
  buttonContainer.className = "button-container";

  // Copy button
  const copyBtn = document.createElement("button");
  copyBtn.textContent = "Copy Results to Clipboard";
  copyBtn.addEventListener("click", () => {
    const text = JSON.stringify(data, null, 2); // Or format as Markdown
    navigator.clipboard.writeText(text).then(() => alert("Copied!"));
  });
  buttonContainer.appendChild(copyBtn);

  // Hide button
  const hideBtn = document.createElement("button");
  hideBtn.textContent = "Hide Results";
  hideBtn.addEventListener("click", () => {
    container.innerHTML = ""; // Reset to initial state (empty)
  });
  buttonContainer.appendChild(hideBtn);

  container.appendChild(buttonContainer);
}

async function isInjectableUrl(url) {
  if (!url) return false;
  if (
    url.startsWith("chrome://") ||
    url.startsWith("about:") ||
    url.startsWith("chrome-extension://") ||
    url.includes("chrome.google.com/webstore")
  ) {
    return false;
  }
  return /^https?:\/\//.test(url);
}

async function runScanFromPopup() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || "";
  if (!(await isInjectableUrl(url))) {
    console.warn("Cannot inject into this page:", url);
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
  } catch (err) {
    console.error("Script injection failed:", err);
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: "scan" });
    console.log("scan response", response);
  } catch (err) {
    console.error("Could not send message to content script:", err);
  }
}
