/* global chrome, browser */

// Browser compatibility polyfill
if (typeof browser === 'undefined' && typeof chrome !== 'undefined') {
  browser = chrome;
}

const apiBaseUrlInput = document.getElementById('trackeepApiUrl');
const apiKeyInput = document.getElementById('trackeepApiKey');
const youtubeAutoPromptInput = document.getElementById('youtubeAutoPrompt');
const testConnectionBtn = document.getElementById('testConnectionBtn');
const generateKeyBtn = document.getElementById('generateKeyBtn');
const saveBtn = document.getElementById('saveBtn');
const statusMessageEl = document.getElementById('statusMessage');
const connectionStatusEl = document.getElementById('connectionStatus');
const statusTitleEl = document.getElementById('statusTitle');
const statusTextEl = document.getElementById('connectionStatusMessage');
const installWelcomeEl = document.getElementById('installWelcome');
const mainOptionsEl = document.getElementById('mainOptions');

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

function showConnectionStatus(title, message, type = 'info') {
  connectionStatusEl.style.display = 'block';
  statusTitleEl.textContent = title;
  statusTextEl.textContent = message;
  connectionStatusEl.className = `connection-status ${type}`;
}

function hideConnectionStatus() {
  connectionStatusEl.style.display = 'none';
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
  browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
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
        browser.storage.sync.get(['trackeepApiBaseUrl'], (items) => {
          if (!items.trackeepApiBaseUrl) {
            apiBaseUrlInput.value = candidate;
          }
          if (callback) callback();
        });
      } else {
        // Fallback to localhost if nothing set
        browser.storage.sync.get(['trackeepApiBaseUrl'], (items) => {
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
  browser.storage.sync.get([
    'trackeepApiBaseUrl',
    'trackeepApiKey',
    'trackeepAuthToken',
    'youtubeAutoPrompt',
    'isFirstInstall'
  ], (items) => {
    // Handle first-time install
    if (items.isFirstInstall) {
      installWelcomeEl.style.display = 'flex';
      mainOptionsEl.style.display = 'none';
    } else {
      installWelcomeEl.style.display = 'none';
      mainOptionsEl.style.display = 'block';
    }

    // Load saved settings
    if (items.trackeepApiBaseUrl) {
      apiBaseUrlInput.value = items.trackeepApiBaseUrl;
    }
    if (items.trackeepApiKey || items.trackeepAuthToken) {
      apiKeyInput.value = items.trackeepApiKey || items.trackeepAuthToken;
    }
    if (youtubeAutoPromptInput) {
      youtubeAutoPromptInput.checked = typeof items.youtubeAutoPrompt === 'boolean'
        ? items.youtubeAutoPrompt
        : true;
    }

    // Auto-detect API URL if empty
    if (!items.trackeepApiBaseUrl) {
      detectAndPrefillApiBaseUrl();
    }
  });
}

function saveSettings() {
  const apiBaseUrl = apiBaseUrlInput.value.trim();
  const token = apiKeyInput.value.trim();
  const youtubeAutoPrompt = youtubeAutoPromptInput ? !!youtubeAutoPromptInput.checked : true;
  
  if (!apiBaseUrl) {
    showMessage('API base URL is required.', 'error');
    return;
  }
  
  if (!token) {
    showMessage('API key or token is required.', 'error');
    return;
  }
  
  setButtonLoading(saveBtn, true);
  showMessage('Saving settings...', 'info', 0);
  
  browser.storage.sync.set({
    trackeepApiBaseUrl: apiBaseUrl,
    trackeepApiKey: token,
    trackeepAuthToken: token,
    youtubeAutoPrompt,
    isFirstInstall: false
  }, () => {
    setButtonLoading(saveBtn, false);
    showMessage('Settings saved successfully!', 'success');
  });
}

async function validateConnectionToken(apiBaseUrl, token) {
  const base = apiBaseUrl.replace(/\/$/, '');
  const isApiKey = token.startsWith('tk_');
  const endpoint = isApiKey ? `${base}/browser-extension/validate` : `${base}/auth/me`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  let payload = {};
  try {
    payload = await response.json();
  } catch (_) {
    // Keep empty payload for non-JSON responses.
  }

  return { isApiKey, payload };
}

async function testConnection() {
  const apiBaseUrl = apiBaseUrlInput.value.trim();
  const token = apiKeyInput.value.trim();
  
  if (!apiBaseUrl || !token) {
    showConnectionStatus('Connection Failed', 'Please enter both URL and token', 'error');
    return;
  }
  
  showConnectionStatus('Testing Connection', 'Connecting to your Trackeep instance...', 'info');
  
  try {
    const result = await validateConnectionToken(apiBaseUrl, token);
    const identity = result.payload && result.payload.username ? result.payload.username : 'user';
    showConnectionStatus(
      'Connection Successful',
      `Connected as ${identity}. ${result.isApiKey ? 'API key' : 'Token'} is valid.`,
      'success'
    );

    setTimeout(() => {
      hideConnectionStatus();
    }, 3000);
  } catch (error) {
    showConnectionStatus('Connection Failed', `Error: ${error.message}`, 'error');
  }
}

async function generateApiKey() {
  const apiBaseUrl = apiBaseUrlInput.value.trim();
  
  if (!apiBaseUrl) {
    showMessage('Please enter API URL first', 'error');
    return;
  }
  
  showConnectionStatus('Generating API Key', 'Opening Trackeep to generate new API key...', 'info');
  
  try {
    const base = apiBaseUrl.replace(/\/$/, '');
    const response = await fetch(`${base}/auth/generate-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.api_key) {
        apiKeyInput.value = data.api_key;
        showConnectionStatus('API Key Generated', 'New API key generated and copied to clipboard!', 'success');
        
        // Copy to clipboard
        navigator.clipboard.writeText(data.api_key);
        
        // Hide success message after 3 seconds
        setTimeout(() => {
          hideConnectionStatus();
        }, 3000);
      } else {
        throw new Error('No API key in response');
      }
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    showConnectionStatus('Generation Failed', `Error: ${error.message}`, 'error');
  }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  detectAndPrefillApiBaseUrl(() => {
    loadSettings();
  });
  
  // Event listeners for main options
  saveBtn.addEventListener('click', (e) => {
    e.preventDefault();
    saveSettings();
  });
  
  testConnectionBtn.addEventListener('click', (e) => {
    e.preventDefault();
    testConnection();
  });
  
  generateKeyBtn.addEventListener('click', (e) => {
    e.preventDefault();
    generateApiKey();
  });

  // Event listeners for setup form
  const testSetupConnectionBtn = document.getElementById('testSetupConnectionBtn');
  const completeSetupBtn = document.getElementById('completeSetupBtn');
  const getStartedBtn = document.getElementById('getStartedBtn');

  if (testSetupConnectionBtn) {
    testSetupConnectionBtn.addEventListener('click', (e) => {
      e.preventDefault();
      testSetupConnection();
    });
  }

  if (completeSetupBtn) {
    completeSetupBtn.addEventListener('click', (e) => {
      e.preventDefault();
      completeSetup();
    });
  }

  if (getStartedBtn) {
    getStartedBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // Hide welcome and show main options with setup form
      document.getElementById('installWelcome').style.display = 'none';
      document.getElementById('mainOptions').style.display = 'block';
    });
  }
});

// Test connection from setup form
async function testSetupConnection() {
  const apiBaseUrl = document.getElementById('setupApiUrl').value.trim();
  const token = document.getElementById('setupApiKey').value.trim();
  
  if (!apiBaseUrl || !token) {
    showSetupConnectionStatus('Connection Failed', 'Please enter both URL and token', 'error');
    return;
  }
  
  showSetupConnectionStatus('Testing Connection', 'Connecting to your Trackeep instance...', 'info');
  
  try {
    const result = await validateConnectionToken(apiBaseUrl, token);
    const identity = result.payload && result.payload.username ? result.payload.username : 'user';
    showSetupConnectionStatus(
      'Connection Successful',
      `Connected as ${identity}. ${result.isApiKey ? 'API key' : 'Token'} is valid.`,
      'success'
    );

    document.getElementById('trackeepApiUrl').value = apiBaseUrl;
    document.getElementById('trackeepApiKey').value = token;

    setTimeout(() => {
      hideSetupConnectionStatus();
    }, 3000);
  } catch (error) {
    showSetupConnectionStatus('Connection Failed', `Error: ${error.message}`, 'error');
  }
}

// Complete setup
function completeSetup() {
  const apiBaseUrl = document.getElementById('setupApiUrl').value.trim();
  const token = document.getElementById('setupApiKey').value.trim();
  
  if (!apiBaseUrl || !token) {
    showMessage('Please fill in both URL and token', 'error');
    return;
  }
  
  // Save settings
  browser.storage.sync.set({
    trackeepApiBaseUrl: apiBaseUrl,
    trackeepApiKey: token,
    trackeepAuthToken: token,
    youtubeAutoPrompt: true,
    isFirstInstall: false
  }, () => {
    showMessage('Setup completed successfully!', 'success');
    
    // Switch to main options view
    document.getElementById('installWelcome').style.display = 'none';
    document.getElementById('mainOptions').style.display = 'block';
    
    // Load settings in main form
    document.getElementById('trackeepApiUrl').value = apiBaseUrl;
    document.getElementById('trackeepApiKey').value = token;
  });
}

// Setup connection status functions
function showSetupConnectionStatus(title, message, type = 'info') {
  const statusEl = document.getElementById('setupConnectionStatus');
  const titleEl = document.getElementById('setupStatusTitle');
  const messageEl = document.getElementById('setupStatusMessage');
  
  statusEl.style.display = 'block';
  titleEl.textContent = title;
  messageEl.textContent = message;
  statusEl.className = `connection-status ${type}`;
}

function hideSetupConnectionStatus() {
  document.getElementById('setupConnectionStatus').style.display = 'none';
}
