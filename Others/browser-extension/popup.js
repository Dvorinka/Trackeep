/* global chrome */

const statusEl = document.getElementById('status');
const configHintEl = document.getElementById('configHint');
const openOptionsBtn = document.getElementById('openOptions');

const bookmarkTitleInput = document.getElementById('bookmarkTitle');
const bookmarkUrlInput = document.getElementById('bookmarkUrl');
const bookmarkDescriptionInput = document.getElementById('bookmarkDescription');
const bookmarkTagsInput = document.getElementById('bookmarkTags');
const bookmarkPublicInput = document.getElementById('bookmarkPublic');
const saveBookmarkBtn = document.getElementById('saveBookmarkBtn');

const fileInput = document.getElementById('fileInput');
const fileDescriptionInput = document.getElementById('fileDescription');
const uploadFileBtn = document.getElementById('uploadFileBtn');

let trackeepConfig = {
  apiBaseUrl: '',
  authToken: ''
};

function setStatus(message, type) {
  statusEl.textContent = message || '';
  statusEl.classList.remove('error', 'success');
  if (type) {
    statusEl.classList.add(type);
  }
}

function disableForms(disabled) {
  [bookmarkTitleInput, bookmarkUrlInput, bookmarkDescriptionInput, bookmarkTagsInput, bookmarkPublicInput, saveBookmarkBtn,
   fileInput, fileDescriptionInput, uploadFileBtn].forEach((el) => {
    if (!el) return;
    el.disabled = disabled;
  });
}

function loadConfig(callback) {
  chrome.storage.sync.get(['trackeepApiBaseUrl', 'trackeepAuthToken'], (items) => {
    const apiBaseUrl = (items.trackeepApiBaseUrl || '').trim();
    const authToken = (items.trackeepAuthToken || '').trim();

    trackeepConfig = { apiBaseUrl, authToken };

    if (!apiBaseUrl || !authToken) {
      configHintEl.textContent = 'Configure API URL and token in Options to enable saving.';
      disableForms(true);
    } else {
      configHintEl.textContent = `Using API: ${apiBaseUrl}`;
      disableForms(false);
    }

    if (typeof callback === 'function') {
      callback();
    }
  });
}

function detectTrackeepDomain(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs && tabs[0];
    if (!tab || !tab.url) {
      if (callback) callback();
      return;
    }

    try {
      const url = new URL(tab.url);
      // Common Trackeep domains: localhost, trackeep.*, etc.
      const isTrackeepDomain = url.hostname.includes('trackeep') || url.hostname === 'localhost';
      if (isTrackeepDomain && url.protocol === 'https:') {
        const candidate = `${url.origin}/api/v1`;
        // Only pre-fill if not already set
        chrome.storage.sync.get(['trackeepApiBaseUrl'], (items) => {
          if (!items.trackeepApiBaseUrl) {
            chrome.storage.sync.set({ trackeepApiBaseUrl: candidate }, () => {
              console.log('Auto-detected Trackeep API URL:', candidate);
              if (callback) callback();
            });
          } else {
            if (callback) callback();
          }
        });
      } else {
        if (callback) callback();
      }
    } catch (e) {
      if (callback) callback();
    }
  });
}

function initActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs && tabs[0];
    if (!tab) return;

    // Check for context menu data first
    chrome.storage.local.get(['contextMenuData'], (items) => {
      const ctx = items.contextMenuData;
      if (ctx && ctx.timestamp && Date.now() - ctx.timestamp < 5000) {
        // Use context menu data if recent
        if (ctx.url && !bookmarkUrlInput.value) {
          bookmarkUrlInput.value = ctx.url;
        }
        if (ctx.title && !bookmarkTitleInput.value) {
          bookmarkTitleInput.value = ctx.title;
        }
        if (ctx.selection && !bookmarkDescriptionInput.value) {
          bookmarkDescriptionInput.value = ctx.selection;
        }
        // Clear after using
        chrome.storage.local.remove(['contextMenuData']);
      } else {
        // Fallback to active tab
        if (tab.title && !bookmarkTitleInput.value) {
          bookmarkTitleInput.value = tab.title;
        }
        if (tab.url && !bookmarkUrlInput.value) {
          bookmarkUrlInput.value = tab.url;
        }
      }
    });
  });
}

async function saveBookmark(event) {
  event.preventDefault();
  setStatus('', null);

  const { apiBaseUrl, authToken } = trackeepConfig;
  if (!apiBaseUrl || !authToken) {
    setStatus('Missing API URL or auth token. Open options first.', 'error');
    return;
  }

  const url = bookmarkUrlInput.value.trim();
  if (!url) {
    setStatus('URL is required.', 'error');
    return;
  }

  const title = bookmarkTitleInput.value.trim() || url;
  const description = bookmarkDescriptionInput.value.trim();
  const tagsRaw = bookmarkTagsInput.value.trim();
  const isPublic = !!bookmarkPublicInput.checked;

  const tags = tagsRaw
    ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  const payload = {
    title,
    url,
    description,
    tags,
    is_public: isPublic
  };

  saveBookmarkBtn.disabled = true;
  setStatus('Saving bookmark…', null);

  try {
    const base = apiBaseUrl.replace(/\/$/, '');
    const response = await fetch(`${base}/bookmarks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorMessage = `Failed to save bookmark (status ${response.status})`;
      try {
        const data = await response.json();
        if (data && data.error) {
          errorMessage = data.error;
        }
      } catch (_) {
        // ignore JSON parse errors
      }
      throw new Error(errorMessage);
    }

    setStatus('Bookmark saved to Trackeep.', 'success');
  } catch (err) {
    console.error('Error saving bookmark', err);
    setStatus(err && err.message ? err.message : 'Failed to save bookmark.', 'error');
  } finally {
    saveBookmarkBtn.disabled = false;
  }
}

async function uploadFile(event) {
  event.preventDefault();
  setStatus('', null);

  const { apiBaseUrl, authToken } = trackeepConfig;
  if (!apiBaseUrl || !authToken) {
    setStatus('Missing API URL or auth token. Open options first.', 'error');
    return;
  }

  const file = fileInput.files && fileInput.files[0];
  if (!file) {
    setStatus('Please choose a file to upload.', 'error');
    return;
  }

  const description = fileDescriptionInput.value.trim();

  const formData = new FormData();
  formData.append('file', file, file.name);
  if (description) {
    formData.append('description', description);
  }

  uploadFileBtn.disabled = true;
  setStatus('Uploading file…', null);

  try {
    const base = apiBaseUrl.replace(/\/$/, '');
    const response = await fetch(`${base}/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });

    if (!response.ok) {
      let errorMessage = `Failed to upload file (status ${response.status})`;
      try {
        const data = await response.json();
        if (data && data.error) {
          errorMessage = data.error;
        }
      } catch (_) {
        // ignore JSON parse errors
      }
      throw new Error(errorMessage);
    }

    setStatus('File uploaded to Trackeep.', 'success');
    fileInput.value = '';
    fileDescriptionInput.value = '';
  } catch (err) {
    console.error('Error uploading file', err);
    setStatus(err && err.message ? err.message : 'Failed to upload file.', 'error');
  } finally {
    uploadFileBtn.disabled = false;
  }
}

function openOptions() {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL('options.html'));
  }
}

// Init

document.addEventListener('DOMContentLoaded', () => {
  openOptionsBtn.addEventListener('click', openOptions);
  saveBookmarkBtn.addEventListener('click', (e) => {
    e.preventDefault();
    saveBookmark(e);
  });
  uploadFileBtn.addEventListener('click', (e) => {
    e.preventDefault();
    uploadFile(e);
  });

  detectTrackeepDomain(() => {
    loadConfig(() => {
      initActiveTab();
    });
  });
});
