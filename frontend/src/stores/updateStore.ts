import { createSignal } from 'solid-js';
import { updateService, type UpdateInfo, type UpdateStatus } from '../services/updateService';
import { isDemoMode } from '@/lib/demo-mode';

// Global update state store
const [updateAvailable, setUpdateAvailable] = createSignal(false);
const [updateInfo, setUpdateInfo] = createSignal<UpdateInfo | null>(null);
const [updateStatus, setUpdateStatus] = createSignal<UpdateStatus>({
  available: false,
  downloading: false,
  installing: false,
  completed: false,
  progress: 0
});
const [isChecking, setIsChecking] = createSignal(false);
const [error, setError] = createSignal<string | null>(null);
const [currentVersion, setCurrentVersion] = createSignal('1.0.0');
const [lastCheckTime, setLastCheckTime] = createSignal<number>(0);

let pollCleanup: (() => void) | null = null;
let checkInterval: number | null = null;

let checkInProgress = false;

// Check for updates
const checkForUpdates = async () => {
  // Prevent multiple simultaneous checks with both signal and flag
  if (isChecking() || checkInProgress) return;
  
  checkInProgress = true;
  setIsChecking(true);
  setError(null);
  
  try {
    const response = await updateService.checkForUpdates();
    setUpdateAvailable(response.updateAvailable);
    setUpdateInfo(response.updateInfo || null);
    setCurrentVersion(response.currentVersion);
    setLastCheckTime(Date.now());
    
    // Save last check time to localStorage
    localStorage.setItem('lastUpdateCheck', Date.now().toString());
    
    if (response.updateAvailable && response.updateInfo) {
      setUpdateStatus(prev => ({ ...prev, available: true }));
    }
  } catch (err) {
    console.error('Failed to check for updates:', err);
    setError('Failed to check for updates');
  } finally {
    setIsChecking(false);
    checkInProgress = false;
  }
};

// Install update
const installUpdate = async () => {
  if (!updateInfo()) return;

  try {
    setError(null);
    await updateService.installUpdate(updateInfo()!.version);
    
    // Start polling for progress or simulation in demo mode
    if (isDemoMode()) {
      pollCleanup = updateService.simulateUpdateProgress((progress: UpdateStatus) => {
        setUpdateStatus(progress);
        
        if (progress.completed) {
          // Show success notification or trigger reload
          setTimeout(() => {
            window.location.reload();
          }, 3000);
        }
        
        if (progress.error) {
          setError(progress.error);
        }
      });
    } else {
      pollCleanup = updateService.pollUpdateProgress((progress: UpdateStatus) => {
        setUpdateStatus(progress);
        
        if (progress.completed) {
          // Show success notification or trigger reload
          setTimeout(() => {
            window.location.reload();
          }, 3000);
        }
        
        if (progress.error) {
          setError(progress.error);
        }
      });
    }
    
  } catch (err) {
    console.error('Failed to install update:', err);
    setError('Failed to install update');
  }
};

// Cancel update
const cancelUpdate = () => {
  if (pollCleanup) {
    pollCleanup();
    pollCleanup = null;
  }
  setUpdateStatus({
    available: updateAvailable(),
    downloading: false,
    installing: false,
    completed: false,
    progress: 0
  });
};

// Initialize update checking
const initializeUpdateChecking = async () => {
  // Set current version
  setCurrentVersion(await updateService.getCurrentVersion());
  
  // Check if last check was more than 24 hours ago
  const lastCheckTimeStr = localStorage.getItem('lastUpdateCheck');
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;
  
  if (!lastCheckTimeStr || (now - parseInt(lastCheckTimeStr)) > twentyFourHours) {
    // Check for updates on initialization if it's been more than 24 hours
    checkForUpdates();
  } else {
    setLastCheckTime(parseInt(lastCheckTimeStr));
  }
  
  // Set up periodic checking (every 24 hours)
  checkInterval = setInterval(checkForUpdates, twentyFourHours);
};

// Cleanup
const cleanup = () => {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
  if (pollCleanup) {
    pollCleanup();
    pollCleanup = null;
  }
};

// Auto-initialize when store is imported
let initialized = false;
const ensureInitialized = async () => {
  if (!initialized) {
    await initializeUpdateChecking();
    initialized = true;
  }
};

// Export store functions and signals
export const updateStore = {
  // Signals
  updateAvailable,
  updateInfo,
  updateStatus,
  isChecking,
  error,
  currentVersion,
  lastCheckTime,
  
  // Actions
  checkForUpdates,
  installUpdate,
  cancelUpdate,
  
  // Lifecycle
  ensureInitialized,
  cleanup
};

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanup);
}
