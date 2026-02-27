/* global chrome */

const apiBaseUrlInput = document.getElementById('apiBaseUrl');
const authTokenInput = document.getElementById('authToken');
const saveBtn = document.getElementById('saveBtn');
const statusMessageEl = document.getElementById('statusMessage');

function showMessage(message, type = 'info', duration = 5000) {
  statusMessageEl.textContent = message;
  statusMessageEl.className = `status-message ${type}`;
  statusMessageEl.style.display = 'flex';
  
  if (duration > 0) {
    setTimeout(() => {
      statusMessageEl.style.display = 'none';
    }, duration);
  }
}

function hideMessage() {
  statusMessageEl.style.display = 'none';
}

function setButtonLoading(button, loading = true) {
  if (loading) {
    button.disabled = true;
    const originalContent = button.innerHTML;
    button.dataset.originalContent = originalContent;
    button.innerHTML = `
      <svg class="icon icon-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      <span>Saving...</span>
    `;
  } else {
    button.disabled = false;
    if (button.dataset.originalContent) {
      button.innerHTML = button.dataset.originalContent;
      delete button.dataset.originalContent;
    }
  }
}

function detectAndPrefillApiBaseUrl(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs && tabs[0];
    if (!tab || !tab.url) {
      if (callback) callback();
      return;
    }

    try {
      const url = new URL(tab.url);
      const isTrackeepDomain = url.hostname.includes('trackeep') || url.hostname === 'localhost';
      if (isTrackeepDomain && (url.protocol === 'https:' || url.protocol === 'http:')) {
        const candidate = `${url.origin}/api/v1`;
        chrome.storage.sync.get(['trackeepApiBaseUrl'], (items) => {
          if (!items.trackeepApiBaseUrl) {
            apiBaseUrlInput.value = candidate;
          }
          if (callback) callback();
        });
      } else {
        // Fallback to localhost if nothing set
        chrome.storage.sync.get(['trackeepApiBaseUrl'], (items) => {
          if (!items.trackeepApiBaseUrl) {
            apiBaseUrlInput.value = 'http://localhost:8080/api/v1';
          }
          if (callback) callback();
        });
      }
    } catch (e) {
      if (callback) callback();
    }
  });
}

function loadSettings() {
  chrome.storage.sync.get(['trackeepApiBaseUrl', 'trackeepAuthToken'], (items) => {
    if (items.trackeepApiBaseUrl) {
      apiBaseUrlInput.value = items.trackeepApiBaseUrl;
    }
    if (items.trackeepAuthToken) {
      authTokenInput.value = items.trackeepAuthToken;
    }
  });
}

function saveSettings() {
  const apiBaseUrl = apiBaseUrlInput.value.trim();
  const authToken = authTokenInput.value.trim();

  if (!apiBaseUrl) {
    showMessage('API base URL is required.', 'error');
    return;
  }

  if (!authToken) {
    showMessage('Authentication token is required.', 'error');
    return;
  }

  setButtonLoading(saveBtn, true);
  hideMessage();

  chrome.storage.sync.set(
    {
      trackeepApiBaseUrl: apiBaseUrl,
      trackeepAuthToken: authToken
    },
    () => {
      setButtonLoading(saveBtn, false);
      if (chrome.runtime.lastError) {
        showMessage(`Failed to save: ${chrome.runtime.lastError.message}`, 'error');
      } else {
        showMessage(`
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20,6 9,17 4,12"/>
      </svg>
      Settings saved successfully! You can now use the extension to save bookmarks and files.
    `, 'success');
      }
    }
  );
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  detectAndPrefillApiBaseUrl(() => {
    loadSettings();
    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      saveSettings();
    });
  });
});
