// Popup script for Sanskrit Learner extension settings

document.addEventListener('DOMContentLoaded', async () => {
  const enabledToggle = document.getElementById('enabled-toggle');
  const statusDiv = document.getElementById('status');
  const statusText = document.getElementById('status-text');
  const versionSpan = document.getElementById('version');

  // Load version from manifest
  const manifest = chrome.runtime.getManifest();
  versionSpan.textContent = manifest.version;

  // Load current settings
  const result = await chrome.storage.sync.get(['enabled']);
  const isEnabled = result.enabled !== false; // Default to true

  enabledToggle.checked = isEnabled;
  updateStatus(isEnabled);

  // Handle toggle change
  enabledToggle.addEventListener('change', async () => {
    const enabled = enabledToggle.checked;
    await chrome.storage.sync.set({ enabled });
    updateStatus(enabled);

    // Notify all tabs
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_CHANGED', enabled });
      } catch {
        // Tab might not have content script, ignore
      }
    }
  });

  function updateStatus(enabled) {
    if (enabled) {
      statusDiv.classList.remove('disabled');
      statusText.textContent = 'Extension active';
    } else {
      statusDiv.classList.add('disabled');
      statusText.textContent = 'Extension disabled';
    }
  }
});
