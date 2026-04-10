import { invoke } from '@tauri-apps/api/core';

const form = document.getElementById('connect-form');
const instanceInput = document.getElementById('instance-url');
const apiKeyInput = document.getElementById('api-key');
const syncFolderInput = document.getElementById('sync-folder');
const permissionStatusEl = document.getElementById('permission-status');

const connectButton = document.getElementById('connect-button');
const validateTokenButton = document.getElementById('validate-token');
const chooseSyncFolderButton = document.getElementById('choose-sync-folder');
const openSyncFolderButton = document.getElementById('open-sync-folder');
const uploadNowButton = document.getElementById('upload-now');
const quickShareNowButton = document.getElementById('quick-share-now');
const syncNowButton = document.getElementById('sync-now');

const statusEl = document.getElementById('status');
const errorEl = document.getElementById('error');

const actionableButtons = [
  connectButton,
  validateTokenButton,
  chooseSyncFolderButton,
  openSyncFolderButton,
  uploadNowButton,
  quickShareNowButton,
  syncNowButton,
];

const setStatus = (message = '') => {
  statusEl.textContent = message;
};

const setError = (message = '') => {
  errorEl.textContent = message;
};

const setPermissionStatus = (message = '') => {
  permissionStatusEl.textContent = message;
};

const setBusy = (busy, connectLabel = 'Save and Open Instance') => {
  actionableButtons.forEach((button) => {
    button.disabled = busy;
  });
  instanceInput.disabled = busy;
  apiKeyInput.disabled = busy;
  connectButton.textContent = busy ? connectLabel : 'Save and Open Instance';
};

const isValidUrl = (value) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const formatSummary = (summary) => {
  if (!summary) {
    return 'No response from desktop command.';
  }

  const uploaded = Number(summary.uploaded ?? 0);
  const shared = Number(summary.shared ?? 0);
  const failed = Number(summary.failed ?? 0);

  if (uploaded === 0 && shared === 0 && failed === 0) {
    return 'No files selected.';
  }

  const copiedSuffix = summary.clipboard_copied ? ' Links copied to clipboard.' : '';

  if (failed === 0) {
    return `Uploaded ${uploaded} file(s), shared ${shared}.${copiedSuffix}`.trim();
  }

  const firstFailure = Array.isArray(summary.failures) && summary.failures.length > 0
    ? ` First error: ${summary.failures[0]}`
    : '';

  return `Uploaded ${uploaded}, shared ${shared}, failed ${failed}.${copiedSuffix}${firstFailure}`.trim();
};

const hydrate = async () => {
  setBusy(true, 'Loading...');
  setStatus('Loading desktop configuration...');
  setError('');
  setPermissionStatus('');

  try {
    const config = await invoke('get_desktop_config');

    instanceInput.value = config.instance_url || '';
    apiKeyInput.value = config.api_key || '';
    syncFolderInput.value = config.sync_folder || '';

    if (config.instance_url) {
      setStatus(`Saved instance: ${config.instance_url}`);
    } else {
      setStatus('No instance configured yet.');
    }

    if (config.api_key) {
      setPermissionStatus('Saved token is present. Click "Validate Permissions" to verify access.');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setError(`Could not load desktop config: ${message}`);
    setStatus('');
  } finally {
    setBusy(false);
  }
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setError('');

  const instanceUrl = instanceInput.value.trim();
  const apiKey = apiKeyInput.value.trim();
  const syncFolder = syncFolderInput.value.trim();

  if (!isValidUrl(instanceUrl)) {
    setError('Enter a valid http(s) URL, for example https://trackeep.your-domain.com');
    return;
  }

  setBusy(true, 'Saving...');
  setStatus(`Saving configuration for ${instanceUrl} ...`);

  try {
    await invoke('connect_instance', {
      instanceUrl,
      apiKey: apiKey || null,
      syncFolder: syncFolder || null,
    });

    setStatus('Connected. Opening your Trackeep instance...');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setError(message);
    setStatus('');
    setBusy(false);
  }
});

validateTokenButton.addEventListener('click', async () => {
  setError('');

  const instanceUrl = instanceInput.value.trim();
  const token = apiKeyInput.value.trim();

  if (!isValidUrl(instanceUrl)) {
    setError('Set a valid instance URL before token validation.');
    return;
  }

  if (!token) {
    setError('Enter API key/token before validation.');
    return;
  }

  setBusy(true, 'Validating...');

  try {
    const result = await invoke('validate_integration_token', { instanceUrl, token });
    if (result.valid) {
      const perms = Array.isArray(result.permissions) && result.permissions.length > 0
        ? result.permissions.join(', ')
        : 'none reported';
      setPermissionStatus(`Token valid (${result.token_type}). Permissions: ${perms}`);
      setStatus('Token validation successful.');
    } else {
      setPermissionStatus('Token validation failed.');
      setError(result.message || 'Token is not valid for this instance.');
      setStatus('');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setError(message);
    setStatus('');
  } finally {
    setBusy(false);
  }
});

chooseSyncFolderButton.addEventListener('click', async () => {
  setError('');
  setBusy(true, 'Working...');

  try {
    const selected = await invoke('select_sync_folder');
    if (selected) {
      syncFolderInput.value = selected;
      setStatus(`Sync folder selected: ${selected}`);
    } else {
      setStatus('Sync folder selection canceled.');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setError(message);
    setStatus('');
  } finally {
    setBusy(false);
  }
});

openSyncFolderButton.addEventListener('click', async () => {
  setError('');
  setBusy(true, 'Opening...');

  try {
    await invoke('open_sync_folder');
    setStatus('Opened sync folder.');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setError(message);
    setStatus('');
  } finally {
    setBusy(false);
  }
});

uploadNowButton.addEventListener('click', async () => {
  setError('');
  setBusy(true, 'Uploading...');

  try {
    const summary = await invoke('upload_files_now');
    setStatus(formatSummary(summary));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setError(message);
    setStatus('');
  } finally {
    setBusy(false);
  }
});

quickShareNowButton.addEventListener('click', async () => {
  setError('');
  setBusy(true, 'Sharing...');

  try {
    const summary = await invoke('quick_share_files');
    setStatus(formatSummary(summary));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setError(message);
    setStatus('');
  } finally {
    setBusy(false);
  }
});

syncNowButton.addEventListener('click', async () => {
  setError('');
  setBusy(true, 'Syncing...');

  try {
    const summary = await invoke('sync_folder_now');
    setStatus(formatSummary(summary));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setError(message);
    setStatus('');
  } finally {
    setBusy(false);
  }
});

void hydrate();
