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

export const updateService = {
  // Check for available updates
  async checkForUpdates(): Promise<UpdateCheckResponse> {
    try {
      const response = await fetch(`${API_BASE}/api/updates/check`, {
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
      console.error('Failed to check for updates:', error);
      throw error;
    }
  },

  // Install an update
  async installUpdate(version: string): Promise<{ message: string; version: string }> {
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

  // Get current app version from package.json
  getCurrentVersion(): string {
    // This would typically be injected at build time
    return import.meta.env.VITE_APP_VERSION || '1.0.0';
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
  }
};
