document.addEventListener("DOMContentLoaded", () => {
  // Load the users saved preference for dark mode from storage
  const darkModeToggle = document.getElementById("darkModeToggle");

  chrome.storage.sync.get("darkMode", (data) => {
    // Default to light mode (unchecked) unless darkMode is explicitly set to true
    if (data.darkMode === true) {
      darkModeToggle.checked = true;
    } else {
      // Ensure toggle is unchecked for light mode (default)
      darkModeToggle.checked = false;
      // Clear any existing darkMode setting to ensure clean default state
      if (data.darkMode !== undefined) {
        chrome.storage.sync.remove("darkMode");
      }
    }
  });

  // Add a listener for when the user clicks the toggle
  darkModeToggle.addEventListener("change", () => {
    // Save the new setting to storage
    chrome.storage.sync.set({ darkMode: darkModeToggle.checked });
  });
});
