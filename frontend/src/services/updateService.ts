// Update service for handling application updates
export interface UpdateInfo {
  version: string;
  releaseNotes: string;
  downloadUrl: string;
  mandatory: boolean;
  size: string;
}

export interface UpdateStatus {
  available: boolean;
  downloading: boolean;
  installing: boolean;
  completed: boolean;
  error?: string;
  progress: number;
}

export interface UpdateCheckResponse {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  updateInfo?: UpdateInfo;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Check if we're in demo mode
const isDemoMode = () => {
  return localStorage.getItem('demoMode') === 'true' || 
         document.title.includes('Demo Mode') ||
         window.location.search.includes('demo=true') ||
         import.meta.env.VITE_DEMO_MODE === 'true';
};

export const updateService = {
  // Check for available updates
  async checkForUpdates(): Promise<UpdateCheckResponse> {
    // If in demo mode, return mock update data
    if (isDemoMode()) {
      console.log('[Demo Mode] Using mock update data');
      return {
        updateAvailable: true,
        currentVersion: '1.0.0',
        latestVersion: '1.0.1',
        updateInfo: {
          version: '1.0.1',
          releaseNotes: '• New AI features added\n• Performance improvements\n• Bug fixes and security patches\n• Enhanced user interface',
          downloadUrl: 'https://github.com/trackeep/trackeep/releases/latest',
          mandatory: false,
          size: '~25MB'
        }
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      console.log('[Real Mode] Checking for updates at:', `${API_BASE}/api/updates/check`);
      const response = await fetch(`${API_BASE}/api/updates/check`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Update check timed out');
      }
      
      console.error('Failed to check for updates:', error);
      throw error;
    }
  },

  // Install an update
  async installUpdate(version: string): Promise<{ message: string; version: string }> {
    // If in demo mode, simulate update installation
    if (isDemoMode()) {
      console.log('[Demo Mode] Simulating update installation for version:', version);
      return {
        message: 'Update started',
        version: version
      };
    }

    try {
      const response = await fetch(`${API_BASE}/api/updates/install`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ version }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to install update:', error);
      throw error;
    }
  },

  // Get update progress
  async getUpdateProgress(): Promise<UpdateStatus> {
    // If in demo mode, return mock progress
    if (isDemoMode()) {
      console.log('[Demo Mode] Using mock update progress');
      return {
        available: true,
        downloading: false,
        installing: false,
        completed: false,
        error: '',
        progress: 0
      };
    }

    try {
      const response = await fetch(`${API_BASE}/api/updates/progress`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get update progress:', error);
      throw error;
    }
  },

  // Get current app version from build-time constant
  getCurrentVersion(): string {
    // Use build-time version from vite config, fallback to environment variable or default
    return (typeof __APP_VERSION__ !== 'undefined') ? __APP_VERSION__ : import.meta.env.VITE_APP_VERSION || '1.0.0';
  },

  // Poll for update progress during installation
  pollUpdateProgress(callback: (progress: UpdateStatus) => void, interval: number = 2000): () => void {
    let isActive = true;
    
    const poll = async () => {
      if (!isActive) return;
      
      try {
        const progress = await this.getUpdateProgress();
        callback(progress);
        
        // Stop polling if update is completed or failed
        if (progress.completed || progress.error) {
          isActive = false;
        }
      } catch (error) {
        console.error('Error polling update progress:', error);
        isActive = false;
      }
    };

    // Start polling
    poll();
    const intervalId = setInterval(poll, interval);

    // Return cleanup function
    return () => {
      isActive = false;
      clearInterval(intervalId);
    };
  },

  // Simulate update progress for demo mode
  simulateUpdateProgress(callback: (progress: UpdateStatus) => void): () => void {
    let isActive = true;
    let progress = 0;
    let phase = 'downloading'; // 'downloading' -> 'installing' -> 'completed'
    
    const simulate = () => {
      if (!isActive) return;
      
      progress += Math.random() * 15 + 5; // Random progress increment
      
      if (progress >= 100) {
        progress = 100;
        if (phase === 'downloading') {
          phase = 'installing';
          progress = 0;
        } else if (phase === 'installing') {
          phase = 'completed';
          isActive = false;
        }
      }
      
      const updateStatus: UpdateStatus = {
        available: true,
        downloading: phase === 'downloading',
        installing: phase === 'installing',
        completed: phase === 'completed',
        error: '',
        progress: progress
      };
      
      callback(updateStatus);
      
      if (isActive) {
        const delay = phase === 'downloading' ? 500 : 1000; // Faster download, slower install
        setTimeout(simulate, delay);
      }
    };
    
    // Start simulation
    simulate();
    
    return () => {
      isActive = false;
    };
  }
};
