document.addEventListener("DOMContentLoaded", () => {
  const darkModeToggle = document.getElementById("darkModeToggle");

  chrome.storage.sync.get(["darkMode", "_themeInitialized"], (data) => {
    if (typeof data.darkMode === "boolean") {
      // Existing preference
      darkModeToggle.checked = data.darkMode;
      document.body.classList.toggle("dark-mode", data.darkMode);
    } else {
      // First run: detect system preference
      const systemPrefersDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      darkModeToggle.checked = systemPrefersDark;
      document.body.classList.toggle("dark-mode", systemPrefersDark);
      chrome.storage.sync.set({
        darkMode: systemPrefersDark,
        _themeInitialized: true,
      });
    }
  });

  // Listen for manual toggle changes
  darkModeToggle.addEventListener("change", () => {
    const enabled = darkModeToggle.checked;
    document.body.classList.toggle("dark-mode", enabled);
    chrome.storage.sync.set({ darkMode: enabled, _themeInitialized: true });

    // Broadcast to content scripts
    try {
      chrome.runtime.sendMessage({ type: "SS_TOGGLE_DARK_MODE", enabled });
    } catch (e) {
      /* ignore */
    }
  });

  // Optional: react to live system changes ONLY if user hasn't manually overridden.
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
});
