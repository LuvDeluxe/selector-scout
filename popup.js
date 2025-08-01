document.addEventListener("DOMContentLoaded", () => {
  // Load the users saved preference for dark mode from storage
  const darkModeToggle = document.getElementById("darkModeToggle");

  chrome.storage.sync.get("darkmode", (data) => {
    // if dark mode saved as true, check the toggle
    if (data.darkMode) {
      darkModeToggle.checked = true;
    }
  });

  // Add a listener for when the user clicks the toggle
  darkModeToggle.addEventListener("change", () => {
    // Save the new setting to storage
    chrome.storage.sync.set({ darkMode: darkModeToggle.checked });
  });
});
