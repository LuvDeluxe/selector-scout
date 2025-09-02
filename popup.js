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
          // No receiver or other error — log for debugging but don't throw
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

  // Use callback form and check chrome.runtime.lastError to avoid uncaught promise
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
    // avoid exact duplicates
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
    // move to front to reflect recent use
    list.splice(idx, 1);
    list.unshift(b);
    setBookmarks(list, () => {
      renderBookmarks();
      // Trigger actual selector use in pages
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
        // prefer existing metadata when selectors match
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

    // Attach event listeners (delegation would be fine too)
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

// Wire bookmark UI controls after DOM is ready. We keep this separate from the
// main DOMContentLoaded handler above so the file changes are smaller and clear.
document.addEventListener("DOMContentLoaded", () => {
  // Render existing bookmarks
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
    // allow Enter key to save
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
      // reset input so same file can be selected again if needed
      importFileInput.value = "";
    });
  }
});
