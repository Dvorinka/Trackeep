// Demo mode API wrapper for Trackeep
// Provides mock data when backend is not available

import { 
  getMockDocuments, 
  getMockBookmarks, 
  getMockTasks, 
  getMockNotes, 
  getMockTimeEntries, 
  getMockVideos, 
  getMockLearningPaths, 
  getMockStats
} from './mockData';

// Check if we're in demo mode
const isDemoMode = () => {
  return localStorage.getItem('demoMode') === 'true' || 
         document.title.includes('Demo Mode') ||
         window.location.search.includes('demo=true');
};

// Demo mode API client that falls back to mock data
export class DemoModeApiClient {
  public baseURL: string;
  private demoMode: boolean;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.demoMode = isDemoMode();
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // If in demo mode, return mock data immediately
    if (this.demoMode) {
      return this.getMockResponse(endpoint, options);
    }

    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        // If backend fails, fall back to demo mode
        console.warn(`API endpoint ${endpoint} failed, falling back to demo mode`);
        return this.getMockResponse(endpoint, options);
      }

      return await response.json();
    } catch (error) {
      console.warn(`API request failed for ${endpoint}, falling back to demo mode:`, error);
      return this.getMockResponse(endpoint, options);
    }
  }

  private getMockResponse<T>(endpoint: string, options: RequestInit): T {
    const method = options.method || 'GET';
    
    // Dashboard stats
    if (endpoint.includes('/dashboard/stats')) {
      return getMockStats() as T;
    }

    // Documents
    if (endpoint.includes('/documents') || endpoint.includes('/files')) {
      if (method === 'GET') {
        return { documents: getMockDocuments() } as T;
      }
    }

    // Bookmarks
    if (endpoint.includes('/bookmarks')) {
      if (method === 'GET') {
        return getMockBookmarks() as T;
      }
    }

    // Tasks
    if (endpoint.includes('/tasks')) {
      if (method === 'GET') {
        return getMockTasks() as T;
      }
    }

    // Notes
    if (endpoint.includes('/notes')) {
      if (method === 'GET') {
        return getMockNotes() as T;
      }
    }

    // Time entries
    if (endpoint.includes('/time-entries')) {
      if (method === 'GET') {
        const mockEntries = getMockTimeEntries();
        // Convert mock entries to TimeEntry format
        const timeEntries = mockEntries.map(entry => ({
          id: parseInt(entry.id.replace('time_', '')),
          user_id: 1,
          task_id: entry.taskId ? parseInt(entry.taskId.replace('task_', '')) : undefined,
          start_time: `${entry.date}T${entry.startTime}:00Z`,
          end_time: entry.endTime ? `${entry.date}T${entry.endTime}:00Z` : undefined,
          duration: entry.duration,
          description: entry.description,
          tags: entry.tags,
          billable: entry.billable,
          hourly_rate: entry.hourlyRate,
          is_running: false,
          source: 'demo',
          created_at: `${entry.date}T${entry.startTime}:00Z`,
          updated_at: entry.endTime ? `${entry.date}T${entry.endTime}:00Z` : `${entry.date}T${entry.startTime}:00Z`
        }));
        return { time_entries: timeEntries } as T;
      }
      if (method === 'POST') {
        const mockEntries = getMockTimeEntries();
        const entry = mockEntries[0];
        // Convert mock entry to TimeEntry format
        const timeEntry = {
          id: parseInt(entry.id.replace('time_', '')),
          user_id: 1,
          task_id: entry.taskId ? parseInt(entry.taskId.replace('task_', '')) : undefined,
          start_time: `${entry.date}T${entry.startTime}:00Z`,
          end_time: entry.endTime ? `${entry.date}T${entry.endTime}:00Z` : undefined,
          duration: entry.duration,
          description: entry.description,
          tags: entry.tags,
          billable: entry.billable,
          hourly_rate: entry.hourlyRate,
          is_running: false,
          source: 'demo',
          created_at: `${entry.date}T${entry.startTime}:00Z`,
          updated_at: entry.endTime ? `${entry.date}T${entry.endTime}:00Z` : `${entry.date}T${entry.startTime}:00Z`
        };
        return { time_entry: timeEntry } as T;
      }
    }

    // YouTube
    if (endpoint.includes('/youtube')) {
      if (endpoint.includes('predefined-channels')) {
        return {
          channels: [
            { id: 'UC8butISFwT-Wy7pm24E6Icg', name: 'NetworkChuck' },
            { id: 'UCsBjURrPoezyKlLJRzKwBA', name: 'Fireship' },
            { id: 'UCsXVk37bltJxDpvrMzOXvQ', name: 'Beyond Fireship' }
          ]
        } as T;
      }
      if (endpoint.includes('video-details')) {
        return getMockVideos()[0] as T;
      }
    }

    // Learning paths
    if (endpoint.includes('/learning-paths')) {
      if (endpoint.includes('categories')) {
        return {
          categories: ['Web Development', 'DevOps', 'Programming', 'Design', 'Business']
        } as T;
      }
      return getMockLearningPaths() as T;
    }

    // GitHub
    if (endpoint.includes('/github/repos')) {
      return {
        repositories: [
          { name: 'trackeep', stars: 245, forks: 43, watchers: 65 },
          { name: 'solidjs-app', stars: 123, forks: 21, watchers: 34 }
        ]
      } as T;
    }

    // Chat sessions
    if (endpoint.includes('/chat/sessions')) {
      return {
        sessions: [
          { id: '1', title: 'General Chat', created_at: new Date().toISOString() },
          { id: '2', title: 'Development Help', created_at: new Date().toISOString() }
        ]
      } as T;
    }

    // AI providers
    if (endpoint.includes('/ai/providers')) {
      return {
        providers: [
          { id: 'longcat', name: 'LongCat AI', enabled: true },
          { id: 'mistral', name: 'Mistral AI', enabled: false },
          { id: 'openai', name: 'OpenAI', enabled: false }
        ]
      } as T;
    }

    // Updates endpoint
    if (endpoint.includes('/updates/check')) {
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
      } as T;
    }

    if (endpoint.includes('/updates/install')) {
      return {
        message: 'Update started',
        version: '1.0.1'
      } as T;
    }

    if (endpoint.includes('/updates/progress')) {
      return {
        available: true,
        downloading: false,
        installing: false,
        completed: false,
        error: '',
        progress: 0
      } as T;
    }

    // Auth endpoints
    if (endpoint.includes('/auth/login-totp')) {
      return {
        token: 'demo-token',
        user: { id: 1, email: 'demo@trackeep.com', name: 'Demo User' }
      } as T;
    }

    // Default empty response
    return {} as T;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async upload<T>(_endpoint: string, formData: FormData): Promise<T> {
    // For demo mode, simulate file upload
    const file = formData.get('file') as File;
    return {
      id: Date.now(),
      original_name: file?.name || 'demo-file',
      file_name: `demo-${Date.now()}`,
      file_size: file?.size || 1024,
      mime_type: file?.type || 'application/octet-stream',
      created_at: new Date().toISOString()
    } as T;
  }
}

// Create demo mode API client
const demoApi = new DemoModeApiClient(import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1');

// Export demo mode API functions that match the regular API
export const demoBookmarksApi = {
  getAll: () => demoApi.get<any[]>('/bookmarks'),
  getById: (id: number) => demoApi.get<any>(`/bookmarks/${id}`),
  create: (bookmark: any) => demoApi.post<any>('/bookmarks', bookmark),
  update: (id: number, bookmark: any) => demoApi.put<any>(`/bookmarks/${id}`, bookmark),
  delete: (id: number) => demoApi.delete<{ message: string }>(`/bookmarks/${id}`),
};

export const demoTasksApi = {
  getAll: () => demoApi.get<any[]>('/tasks'),
  getById: (id: number) => demoApi.get<any>(`/tasks/${id}`),
  create: (task: any) => demoApi.post<any>('/tasks', task),
  update: (id: number, task: any) => demoApi.put<any>(`/tasks/${id}`, task),
  delete: (id: number) => demoApi.delete<{ message: string }>(`/tasks/${id}`),
};

export const demoNotesApi = {
  getAll: (_search?: string, _tag?: string) => demoApi.get<any[]>('/notes'),
  getById: (id: number) => demoApi.get<any>(`/notes/${id}`),
  create: (note: any) => demoApi.post<any>('/notes', note),
  update: (id: number, note: any) => demoApi.put<any>(`/notes/${id}`, note),
  delete: (id: number) => demoApi.delete<{ message: string }>(`/notes/${id}`),
  getStats: () => demoApi.get<any>('/notes/stats'),
};

export const demoFilesApi = {
  getAll: () => demoApi.get<any[]>('/files'),
  getById: (id: number) => demoApi.get<any>(`/files/${id}`),
  upload: (file: Blob, description?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (description) formData.append('description', description);
    return demoApi.upload<any>('/files/upload', formData);
  },
  delete: (id: number) => demoApi.delete<{ message: string }>(`/files/${id}`),
  download: (id: number) => `${demoApi.baseURL}/files/${id}/download`,
};

export const demoTimeEntriesApi = {
  getAll: (_startDate?: string, _endDate?: string, _isRunning?: boolean) => 
    demoApi.get<{ time_entries: any[] }>('/time-entries'),
  getById: (id: number) => demoApi.get<{ time_entry: any }>(`/time-entries/${id}`),
  create: (timeEntry: any) => demoApi.post<{ time_entry: any }>('/time-entries', timeEntry),
  update: (id: number, timeEntry: any) => demoApi.put<{ time_entry: any }>(`/time-entries/${id}`, timeEntry),
  stop: (id: number) => demoApi.post<{ time_entry: any }>(`/time-entries/${id}/stop`),
  delete: (id: number) => demoApi.delete<{ message: string }>(`/time-entries/${id}`),
  getStats: () => demoApi.get<{ stats: any }>('/time-entries/stats'),
};

export default demoApi;
