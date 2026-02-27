/* global chrome */

// DOM Elements
const statusIndicatorEl = document.getElementById('statusIndicator');
const statusTextEl = document.getElementById('statusText');
const statusMessageEl = document.getElementById('statusMessage');
const openOptionsBtn = document.getElementById('openOptions');

// Tab elements
const tabBtns = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

// Bookmark elements
const bookmarkTitleInput = document.getElementById('bookmarkTitle');
const bookmarkUrlInput = document.getElementById('bookmarkUrl');
const bookmarkDescriptionInput = document.getElementById('bookmarkDescription');
const bookmarkTagsInput = document.getElementById('bookmarkTags');
const bookmarkPublicInput = document.getElementById('bookmarkPublic');
const saveBookmarkBtn = document.getElementById('saveBookmarkBtn');

// File elements
const fileInput = document.getElementById('fileInput');
const fileDescriptionInput = document.getElementById('fileDescription');
const uploadFileBtn = document.getElementById('uploadFileBtn');

let trackeepConfig = {
  apiBaseUrl: '',
  authToken: ''
};

// Tab switching functionality
function initTabs() {
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      
      // Update button states
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update content visibility
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `${targetTab}-tab`) {
          content.classList.add('active');
        }
      });
    });
  });
}

// Status management
function updateStatus(text, type = 'info') {
  statusTextEl.textContent = text;
  statusIndicatorEl.className = 'status-indicator';
  
  if (type === 'success') {
    statusIndicatorEl.classList.add('connected');
  } else if (type === 'error') {
    statusIndicatorEl.classList.add('error');
  }
}

function showMessage(message, type = 'info', duration = 5000) {
  statusMessageEl.textContent = message;
  statusMessageEl.className = `status-message ${type}`;
  statusMessageEl.style.display = 'flex';
  
  // Auto-hide after duration
  if (duration > 0) {
    setTimeout(() => {
      statusMessageEl.style.display = 'none';
    }, duration);
  }
}

function hideMessage() {
  statusMessageEl.style.display = 'none';
}

// Loading states
function setButtonLoading(button, loading = true) {
  if (loading) {
    button.disabled = true;
    const originalContent = button.innerHTML;
    button.dataset.originalContent = originalContent;
    button.innerHTML = `
      <svg class="icon icon-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      <span>Processing...</span>
    `;
  } else {
    button.disabled = false;
    if (button.dataset.originalContent) {
      button.innerHTML = button.dataset.originalContent;
      delete button.dataset.originalContent;
    }
  }
}

function disableForms(disabled) {
  const elements = [
    bookmarkTitleInput, bookmarkUrlInput, bookmarkDescriptionInput, 
    bookmarkTagsInput, bookmarkPublicInput, saveBookmarkBtn,
    fileInput, fileDescriptionInput, uploadFileBtn
  ];
  
  elements.forEach(el => {
    if (el) el.disabled = disabled;
  });
}

function loadConfig(callback) {
  chrome.storage.sync.get(['trackeepApiBaseUrl', 'trackeepAuthToken'], (items) => {
    const apiBaseUrl = (items.trackeepApiBaseUrl || '').trim();
    const authToken = (items.trackeepAuthToken || '').trim();

    trackeepConfig = { apiBaseUrl, authToken };

    if (!apiBaseUrl || !authToken) {
      updateStatus('Configuration required', 'error');
      showMessage('Configure API URL and token in Options to enable saving.', 'error');
      disableForms(true);
    } else {
      updateStatus(`Connected to ${apiBaseUrl}`, 'success');
      hideMessage();
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
      const isTrackeepDomain = url.hostname.includes('trackeep') || url.hostname === 'localhost';
      if (isTrackeepDomain && url.protocol === 'https:') {
        const candidate = `${url.origin}/api/v1`;
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

    chrome.storage.local.get(['contextMenuData'], (items) => {
      const ctx = items.contextMenuData;
      if (ctx && ctx.timestamp && Date.now() - ctx.timestamp < 5000) {
        if (ctx.url && !bookmarkUrlInput.value) {
          bookmarkUrlInput.value = ctx.url;
        }
        if (ctx.title && !bookmarkTitleInput.value) {
          bookmarkTitleInput.value = ctx.title;
        }
        if (ctx.selection && !bookmarkDescriptionInput.value) {
          bookmarkDescriptionInput.value = ctx.selection;
        }
        chrome.storage.local.remove(['contextMenuData']);
      } else {
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
  hideMessage();

  const { apiBaseUrl, authToken } = trackeepConfig;
  if (!apiBaseUrl || !authToken) {
    showMessage('Missing API URL or auth token. Open options first.', 'error');
    return;
  }

  const url = bookmarkUrlInput.value.trim();
  if (!url) {
    showMessage('URL is required.', 'error');
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

  setButtonLoading(saveBookmarkBtn, true);
  showMessage('Saving bookmark...', 'info', 0);

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

    showMessage(`
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20,6 9,17 4,12"/>
      </svg>
      Bookmark saved successfully!
    `, 'success');
    
    // Clear form after successful save
    setTimeout(() => {
      bookmarkDescriptionInput.value = '';
      bookmarkTagsInput.value = '';
      bookmarkPublicInput.checked = false;
    }, 2000);
    
  } catch (err) {
    console.error('Error saving bookmark', err);
    showMessage(err && err.message ? err.message : 'Failed to save bookmark.', 'error');
  } finally {
    setButtonLoading(saveBookmarkBtn, false);
  }
}

async function uploadFile(event) {
  event.preventDefault();
  hideMessage();

  const { apiBaseUrl, authToken } = trackeepConfig;
  if (!apiBaseUrl || !authToken) {
    showMessage('Missing API URL or auth token. Open options first.', 'error');
    return;
  }

  const file = fileInput.files && fileInput.files[0];
  if (!file) {
    showMessage('Please choose a file to upload.', 'error');
    return;
  }

  const description = fileDescriptionInput.value.trim();

  const formData = new FormData();
  formData.append('file', file, file.name);
  if (description) {
    formData.append('description', description);
  }

  setButtonLoading(uploadFileBtn, true);
  showMessage('Uploading file...', 'info', 0);

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

    showMessage(`
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20,6 9,17 4,12"/>
      </svg>
      File uploaded successfully!
    `, 'success');
    
    // Clear form after successful upload
    setTimeout(() => {
      fileInput.value = '';
      fileDescriptionInput.value = '';
    }, 2000);
    
  } catch (err) {
    console.error('Error uploading file', err);
    showMessage(err && err.message ? err.message : 'Failed to upload file.', 'error');
  } finally {
    setButtonLoading(uploadFileBtn, false);
  }
}

function openOptions() {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL('options.html'));
  }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize tabs
  initTabs();
  
  // Event listeners
  openOptionsBtn.addEventListener('click', openOptions);
  saveBookmarkBtn.addEventListener('click', (e) => {
    e.preventDefault();
    saveBookmark(e);
  });
  uploadFileBtn.addEventListener('click', (e) => {
    e.preventDefault();
    uploadFile(e);
  });

  // Initialize configuration and active tab
  detectTrackeepDomain(() => {
    loadConfig(() => {
      initActiveTab();
    });
  });
});
