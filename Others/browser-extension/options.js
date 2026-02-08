/* global chrome */

const apiBaseUrlInput = document.getElementById('apiBaseUrl');
const authTokenInput = document.getElementById('authToken');
const saveBtn = document.getElementById('saveBtn');
const statusEl = document.getElementById('status');

function setStatus(message, type) {
  statusEl.textContent = message || '';
  statusEl.classList.remove('success', 'error');
  if (type) {
    statusEl.classList.add(type);
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
    setStatus('API base URL is required.', 'error');
    return;
  }

  if (!authToken) {
    setStatus('Auth token is required.', 'error');
    return;
  }

  saveBtn.disabled = true;
  setStatus('Saving…', null);

  chrome.storage.sync.set(
    {
      trackeepApiBaseUrl: apiBaseUrl,
      trackeepAuthToken: authToken
    },
    () => {
      saveBtn.disabled = false;
      if (chrome.runtime.lastError) {
        setStatus(`Failed to save: ${chrome.runtime.lastError.message}`, 'error');
      } else {
        setStatus('Settings saved. You can now use the popup to save bookmarks and files.', 'success');
      }
    }
  );
}

// Init

document.addEventListener('DOMContentLoaded', () => {
  detectAndPrefillApiBaseUrl(() => {
    loadSettings();
    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      saveSettings();
    });
  });
});
