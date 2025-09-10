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
    chrome.runtime.sendMessage(
      { type: "SS_TOGGLE_DARK_MODE", enabled },
      (resp) => {
        if (chrome.runtime.lastError) {
          console.warn(
            "SS_TOGGLE_DARK_MODE sendMessage error:",
            chrome.runtime.lastError.message
          );
        }
      }
    );
  });

  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", (e) => {
    chrome.storage.sync.get(["darkMode", "_themeInitialized"], (data) => {
      if (typeof data.darkMode === "boolean") return;
      const prefersDark = e.matches;
      darkModeToggle.checked = prefersDark;
      document.body.classList.toggle("dark-mode", prefersDark);
      chrome.storage.sync.set({ darkMode: prefersDark });
      chrome.runtime.sendMessage(
        { type: "SS_TOGGLE_DARK_MODE", enabled: prefersDark },
        (resp) => {
          if (chrome.runtime.lastError) {
            console.warn(
              "SS_TOGGLE_DARK_MODE sendMessage error:",
              chrome.runtime.lastError.message
            );
          }
        }
      );
    });
  });

  const scanBtn = document.getElementById("scanA11yBtn");
  if (scanBtn) {
    scanBtn.addEventListener("click", async () => {
      const container = document.getElementById("a11y-results");
      if (container) {
        container.innerHTML = "<p>Scanning for accessibility issues...</p>";
      }

      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });

        if (!tab || !tab.id) {
          throw new Error("No active tab found");
        }

        // Check if URL is injectable
        if (!(await isInjectableUrl(tab.url))) {
          throw new Error(
            "Cannot scan this page type (chrome://, extension pages, etc.)"
          );
        }

        console.log("Starting accessibility scan for tab:", tab.id);

        // First, try to ping the content script to see if it's already loaded
        let contentScriptReady = false;
        try {
          await new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tab.id, { type: "SS_PING" }, (response) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve(response);
              }
            });
          });
          contentScriptReady = true;
          console.log("Content script already loaded");
        } catch (e) {
          console.log("Content script not loaded, will inject");
        }

        // If content script is not ready, inject it
        if (!contentScriptReady) {
          console.log("Injecting a11y.js...");
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["a11y.js"],
          });

          // Wait a bit for the script to initialize
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Now send the scan message
        console.log("Sending scan message...");
        const response = await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error("Scan timeout - content script not responding"));
          }, 10000); // 10 second timeout

          chrome.tabs.sendMessage(
            tab.id,
            { type: "SS_RUN_A11Y_SCAN", scope: "visible" },
            (resp) => {
              clearTimeout(timeoutId);
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve(resp);
              }
            }
          );
        });

        console.log("Accessibility scan results:", response);

        if (response && response.results) {
          displayA11yResults(response);
        } else {
          throw new Error("Invalid response from content script");
        }
      } catch (error) {
        console.error("Accessibility scan failed:", error);
        const container = document.getElementById("a11y-results");
        if (container) {
          container.innerHTML = `
            <div class="error">
              <h3>Scan Failed</h3>
              <p><strong>Error:</strong> ${error.message}</p>
              <p><strong>Troubleshooting:</strong></p>
              <ul>
                <li>Try refreshing the page and scanning again</li>
                <li>Make sure you're on a regular website (not chrome:// or extension pages)</li>
                <li>Check if the page has finished loading</li>
              </ul>
              <button onclick="this.parentElement.parentElement.innerHTML=''">Hide Error</button>
            </div>
          `;
        }
      }
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
    container.innerHTML = `
      <div class="success">
        <h3>✓ Great News!</h3>
        <p>No accessibility issues found in the visible elements on this page.</p>
        <small>Note: This scan checks common issues like missing alt text, unlabeled form inputs, and missing link text.</small>
      </div>
    `;
    return;
  }

  // Summary
  const summaryDiv = document.createElement("div");
  summaryDiv.className = "summary";
  summaryDiv.innerHTML = `
    <h3>Accessibility Scan Results</h3>
    <div class="summary-stats">
      <span class="total-issues">Total issues: ${
        data.summary.totalIssues
      }</span>
      <span class="high-severity">High severity: ${
        data.summary.highCount || 0
      }</span>
      <span class="medium-severity">Medium severity: ${
        data.summary.mediumCount || 0
      }</span>
      <span class="low-severity">Low severity: ${
        data.summary.lowCount || 0
      }</span>
    </div>
  `;
  container.appendChild(summaryDiv);

  // Table for grouped results
  const table = document.createElement("table");
  table.className = "results-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th scope="col">Issue Type</th>
        <th scope="col">Severity</th>
        <th scope="col">Count</th>
        <th scope="col">How to Fix</th>
        <th scope="col">Examples</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");

  data.results.forEach((group) => {
    const row = document.createElement("tr");
    row.className = `severity-${group.severity}`;

    // Create examples list with better formatting
    const examplesList = group.examples
      .slice(0, 5) // Limit to 5 examples for better UX
      .map((ex) => {
        let displayText = ex.selector;

        // Shorten long selectors for display
        if (displayText.length > 50) {
          displayText = displayText.substring(0, 47) + "...";
        }

        return `<li title="${escapeHtml(
          ex.selector
        )}" class="example-item" data-full-selector="${escapeHtml(
          ex.selector
        )}">${escapeHtml(displayText)}</li>`;
      })
      .join("");

    row.innerHTML = `
      <td class="issue-type">${escapeHtml(group.display)}</td>
      <td class="severity-cell">
        <span class="severity-badge severity-${
          group.severity
        }">${group.severity.toUpperCase()}</span>
      </td>
      <td class="count-cell">${group.count}</td>
      <td class="suggestion-cell">${escapeHtml(group.suggestion)}</td>
      <td class="examples-cell">
        <ul class="examples-list">${examplesList}</ul>
        ${
          group.examples.length > 5
            ? `<small>... and ${group.examples.length - 5} more</small>`
            : ""
        }
      </td>
    `;
    tbody.appendChild(row);
  });

  container.appendChild(table);

  // Button container for Copy and Hide
  const buttonContainer = document.createElement("div");
  buttonContainer.className = "button-container";

  // Copy button
  const copyBtn = document.createElement("button");
  copyBtn.textContent = "Copy Results";
  copyBtn.className = "action-btn copy-btn";
  copyBtn.addEventListener("click", async () => {
    try {
      const textResults = formatResultsAsText(data);
      await navigator.clipboard.writeText(textResults);
      copyBtn.textContent = "✓ Copied!";
      setTimeout(() => {
        copyBtn.textContent = "Copy Results";
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      copyBtn.textContent = "Copy failed";
      setTimeout(() => {
        copyBtn.textContent = "Copy Results";
      }, 2000);
    }
  });
  buttonContainer.appendChild(copyBtn);

  // Hide button
  const hideBtn = document.createElement("button");
  hideBtn.textContent = "Hide Results";
  hideBtn.className = "action-btn hide-btn";
  hideBtn.addEventListener("click", () => {
    container.innerHTML = "";
  });
  buttonContainer.appendChild(hideBtn);

  // Rescan button
  const rescanBtn = document.createElement("button");
  rescanBtn.textContent = "Scan Again";
  rescanBtn.className = "action-btn rescan-btn";
  rescanBtn.addEventListener("click", () => {
    document.getElementById("scanA11yBtn").click();
  });
  buttonContainer.appendChild(rescanBtn);

  container.appendChild(buttonContainer);

  // Attach click-to-copy behavior for example selectors
  const exampleItems = container.querySelectorAll(".example-item");
  exampleItems.forEach((el) => {
    el.addEventListener("click", async (ev) => {
      const target = ev.currentTarget;
      const full =
        target.getAttribute("data-full-selector") || target.textContent;
      try {
        await navigator.clipboard.writeText(full);

        // show temporary visual feedback using CSS class
        const originalText = target.textContent;
        target.textContent = "Copied!";
        target.classList.add("copied");

        setTimeout(() => {
          target.textContent = originalText;
          target.classList.remove("copied");
        }, 1000);
      } catch (err) {
        console.error("Copy failed", err);
        // fallback: briefly show error
        const originalText = target.textContent;
        target.textContent = "Copy failed";
        setTimeout(() => {
          target.textContent = originalText;
        }, 1200);
      }
    });
  });
}

// Helper function to format results as readable text
function formatResultsAsText(data) {
  let text = "Accessibility Scan Results\n";
  text += "==========================\n\n";
  text += `Total Issues: ${data.summary.totalIssues}\n`;
  text += `High Severity: ${data.summary.highCount || 0}\n`;
  text += `Medium Severity: ${data.summary.mediumCount || 0}\n`;
  text += `Low Severity: ${data.summary.lowCount || 0}\n\n`;

  data.results.forEach((group, index) => {
    text += `${index + 1}. ${
      group.display
    } (${group.severity.toUpperCase()})\n`;
    text += `   Count: ${group.count}\n`;
    text += `   Fix: ${group.suggestion}\n`;
    text += `   Examples:\n`;
    group.examples.slice(0, 3).forEach((ex) => {
      text += `   - ${ex.selector}\n`;
    });
    text += "\n";
  });

  return text;
}

async function isInjectableUrl(url) {
  if (!url) return false;
  if (
    url.startsWith("chrome://") ||
    url.startsWith("about:") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("moz-extension://") ||
    url.startsWith("edge-extension://") ||
    url.includes("chrome.google.com/webstore") ||
    url.includes("addons.mozilla.org")
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

  chrome.tabs.sendMessage(tab.id, { action: "scan" }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn(
        "sendMessage(scan) error:",
        chrome.runtime.lastError.message
      );
      return;
    }
    console.log("scan response", response);
  });
}

// Utility: generate compact unique id
function _uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Read bookmarks (async via callback)
function getBookmarks(cb) {
  chrome.storage.local.get(["bookmarks"], (res) => {
    cb(res.bookmarks || []);
  });
}

// Write bookmarks (replace entire array)
function setBookmarks(list, cb) {
  chrome.storage.local.set({ bookmarks: list }, () => {
    if (cb) cb();
  });
}

// Add a new bookmark (no duplicates by exact selector)
function addBookmark(selector) {
  const s = (selector || "").trim();
  if (!s) return;
  getBookmarks((list) => {
    if (list.some((b) => b.selector === s)) return;
    const entry = {
      id: _uid(),
      selector: s,
      createdAt: Date.now(),
      lastUsed: null,
      useCount: 0,
    };
    list.unshift(entry);
    setBookmarks(list, renderBookmarks);
  });
}

// Delete by id
function deleteBookmark(id) {
  getBookmarks((list) => {
    const next = list.filter((b) => b.id !== id);
    setBookmarks(next, renderBookmarks);
  });
}

// Mark as used: increment useCount and set lastUsed; then call the selector runner
function useBookmark(id) {
  getBookmarks((list) => {
    const idx = list.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const b = list[idx];
    b.useCount = (b.useCount || 0) + 1;
    b.lastUsed = Date.now();
    list.splice(idx, 1);
    list.unshift(b);
    setBookmarks(list, () => {
      renderBookmarks();
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs && tabs[0];
        if (!tab) return;
        isInjectableUrl(tab.url).then((ok) => {
          if (!ok) return;
          chrome.scripting.executeScript(
            { target: { tabId: tab.id }, files: ["content.js"] },
            () => {
              if (chrome.runtime.lastError) {
                console.error(
                  "Injection failed before using bookmark:",
                  chrome.runtime.lastError.message
                );
                return;
              }
              chrome.tabs.sendMessage(
                tab.id,
                { action: "runSelector", selector: b.selector },
                (resp) => {
                  if (chrome.runtime.lastError) {
                    console.error(
                      "sendMessage error (useBookmark):",
                      chrome.runtime.lastError.message
                    );
                  } else {
                    console.log("runSelector response:", resp);
                  }
                }
              );
            }
          );
        });
      });
    });
  });
}

// Export bookmarks to a JSON file
function exportBookmarks() {
  getBookmarks((list) => {
    const blob = new Blob([JSON.stringify(list, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `selector-scout-bookmarks-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
}

// Import bookmarks from a JSON file; merge by selector text (avoid duplicates)
function importBookmarksFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error("Invalid format");
      getBookmarks((existing) => {
        const map = new Map();
        existing.forEach((b) => map.set(b.selector, b));
        imported.forEach((b) => {
          const key = (b.selector || "").trim();
          if (!key) return;
          if (!map.has(key)) {
            map.set(key, {
              id: b.id || _uid(),
              selector: key,
              createdAt: b.createdAt || Date.now(),
              lastUsed: b.lastUsed || null,
              useCount: b.useCount || 0,
            });
          }
        });
        const merged = Array.from(map.values()).sort(
          (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
        );
        setBookmarks(merged, renderBookmarks);
      });
    } catch (err) {
      console.error("Import failed", err);
      alert("Invalid JSON file for import");
    }
  };
  reader.readAsText(file);
}

// Render bookmarks list into the popup UI
function renderBookmarks() {
  const listEl = document.getElementById("bookmarksList");
  if (!listEl) return;
  getBookmarks((list) => {
    listEl.innerHTML = "";
    if (!list || list.length === 0) {
      listEl.innerHTML = '<li class="empty">No saved selectors</li>';
      return;
    }
    list.forEach((b) => {
      const li = document.createElement("li");
      li.className = "bookmark";
      const last = b.lastUsed ? new Date(b.lastUsed).toLocaleString() : "-";
      li.innerHTML = `
        <div class="meta">
          <code class="selector">${escapeHtml(b.selector)}</code>
          <div class="stats">${b.useCount || 0} uses • last: ${last}</div>
        </div>
        <div class="actions">
          <button data-id="${b.id}" class="use-btn">Use</button>
          <button data-id="${b.id}" class="del-btn">Delete</button>
        </div>
      `;
      listEl.appendChild(li);
    });

    listEl.querySelectorAll(".use-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        useBookmark(id);
      });
    });
    listEl.querySelectorAll(".del-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        if (confirm("Delete this saved selector?")) deleteBookmark(id);
      });
    });
  });
}

// Small HTML escape helper
function escapeHtml(str) {
  return String(str).replace(/[&<>"'`]/g, (s) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
      "`": "&#96;",
    }[s];
  });
}

// Wire bookmark UI controls after DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  renderBookmarks();

  const saveBtn = document.getElementById("saveSelectorBtn");
  const selectorInput = document.getElementById("selectorInput");
  const exportBtn = document.getElementById("exportBtn");
  const importBtn = document.getElementById("importBtn");
  const importFileInput = document.getElementById("importFileInput");

  if (saveBtn && selectorInput) {
    saveBtn.addEventListener("click", () => {
      addBookmark(selectorInput.value || "");
      selectorInput.value = "";
    });
    selectorInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addBookmark(selectorInput.value || "");
        selectorInput.value = "";
      }
    });
  }

  if (exportBtn) exportBtn.addEventListener("click", exportBookmarks);
  if (importBtn && importFileInput) {
    importBtn.addEventListener("click", () => importFileInput.click());
    importFileInput.addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) importBookmarksFile(f);
      importFileInput.value = "";
    });
  }
});
