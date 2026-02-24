const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:9090/api/v1';

// Check if we're in demo mode
const isDemoMode = () => {
  return localStorage.getItem('demoMode') === 'true' || 
         document.title.includes('Demo Mode') ||
         window.location.search.includes('demo=true');
};

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

// Generic API client
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // If in demo mode, use mock data
    if (isDemoMode()) {
      return this.getMockResponse(endpoint, options);
    }

    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        ...getAuthHeaders(),
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

  private async getMockResponse<T>(endpoint: string, options: RequestInit): Promise<T> {
    // Import mock data dynamically to avoid circular dependencies
    const { 
      getMockStats, 
      getMockDocuments, 
      getMockBookmarks, 
      getMockTasks, 
      getMockNotes, 
      getMockTimeEntries,
      getMockLearningPaths,
      getMockVideos
    } = await import('./mockData');

    const method = options.method || 'GET';
    
    // Dashboard stats
    if (endpoint.includes('/dashboard/stats')) {
      return getMockStats() as T;
    }

    // Documents/Files
    if (endpoint.includes('/documents') || endpoint.includes('/files')) {
      if (method === 'GET') {
        return getMockDocuments() as T;
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

    // Auth endpoints
    if (endpoint.includes('/auth/login-totp')) {
      return {
        token: 'demo-token',
        user: { id: 1, email: 'demo@trackeep.com', name: 'Demo User' }
      } as T;
    }

    // GitHub repos
    if (endpoint.includes('/github/repos')) {
      return {
        repositories: [
          { id: 1, name: 'trackeep', full_name: 'tdvorak/trackeep', stars: 245, forks: 43, watchers: 65, language: 'Go' },
          { id: 2, name: 'frontend', full_name: 'tdvorak/frontend', stars: 89, forks: 12, watchers: 23, language: 'TypeScript' },
          { id: 3, name: 'mobile-app', full_name: 'tdvorak/mobile-app', stars: 34, forks: 8, watchers: 15, language: 'TypeScript' }
        ],
        totalStars: 368,
        totalForks: 63,
        totalWatchers: 103
      } as T;
    }

    // Learning paths
    if (endpoint.includes('/learning-paths/categories')) {
      return {
        categories: ['Web Development', 'DevOps', 'Programming', 'Design', 'Business', 'Data Science']
      } as T;
    }

    if (endpoint.includes('/learning-paths')) {
      return getMockLearningPaths() as T;
    }

    // Chat sessions
    if (endpoint.includes('/chat/sessions')) {
      return {
        sessions: [
          { id: '1', title: 'Project Planning', created_at: '2024-01-15T10:00:00Z', updated_at: '2024-01-15T11:30:00Z' },
          { id: '2', title: 'Technical Discussion', created_at: '2024-01-14T14:00:00Z', updated_at: '2024-01-14T15:45:00Z' }
        ]
      } as T;
    }

    // AI providers
    if (endpoint.includes('/ai/providers')) {
      return {
        providers: [
          { id: 'longcat', name: 'LongCat AI', enabled: true, models: ['LongCat-Flash-Chat', 'LongCat-Flash-Thinking'] },
          { id: 'mistral', name: 'Mistral AI', enabled: false, models: ['mistral-small-latest', 'mistral-large-latest'] },
          { id: 'openai', name: 'OpenAI', enabled: false, models: ['gpt-4', 'gpt-3.5-turbo'] }
        ]
      } as T;
    }

    // YouTube endpoints
    if (endpoint.includes('/youtube/video-details')) {
      return getMockVideos()[0] as T;
    }

    if (endpoint.includes('/youtube/predefined-channels')) {
      return {
        channels: [
          { id: 'UC8butISFwT-Wy7pm24E6Icg', name: 'NetworkChuck', latestVideos: getMockVideos().slice(0, 2) },
          { id: 'UCWv7vHwRQdGJtU2i9hJ8X7A', name: 'Fireship', latestVideos: getMockVideos().slice(1, 3) },
          { id: 'UCsXVk37bltHxD1rDPgtNG6A', name: 'Beyond Fireship', latestVideos: getMockVideos().slice(0, 1) }
        ]
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

  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': getAuthHeaders().Authorization || '',
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }
}

const api = new ApiClient(API_BASE_URL);

// Types
export interface Bookmark {
  id: number;
  title: string;
  url: string;
  description?: string;
  tags: string[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: number;
  title: string;
  content?: string;
  description?: string;
  tags: string[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface File {
  id: number;
  original_name: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  file_type: 'document' | 'image' | 'video' | 'audio' | 'archive' | 'other';
  description?: string;
  is_public: boolean;
  thumbnail_path?: string;
  preview_path?: string;
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: number;
  user_id: number;
  task_id?: number;
  bookmark_id?: number;
  note_id?: number;
  start_time: string;
  end_time?: string;
  duration?: number;
  description: string;
  tags: string[];
  billable: boolean;
  hourly_rate?: number;
  is_running: boolean;
  source: string;
  created_at: string;
  updated_at: string;
  task?: Task;
  bookmark?: Bookmark;
  note?: Note;
}

export interface TimeStats {
  total_time_seconds: number;
  total_entries: number;
  running_entries: number;
  billable_time_seconds: number;
  total_billable_amount: number;
}

// API Functions
export const bookmarksApi = {
  getAll: () => api.get<Bookmark[]>('/bookmarks'),
  getById: (id: number) => api.get<Bookmark>(`/bookmarks/${id}`),
  create: (bookmark: Omit<Bookmark, 'id' | 'created_at' | 'updated_at'>) => 
    api.post<Bookmark>('/bookmarks', bookmark),
  update: (id: number, bookmark: Partial<Bookmark>) => 
    api.put<Bookmark>(`/bookmarks/${id}`, bookmark),
  delete: (id: number) => api.delete<{ message: string }>(`/bookmarks/${id}`),
};

export const tasksApi = {
  getAll: () => api.get<Task[]>('/tasks'),
  getById: (id: number) => api.get<Task>(`/tasks/${id}`),
  create: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => 
    api.post<Task>('/tasks', task),
  update: (id: number, task: Partial<Task>) => 
    api.put<Task>(`/tasks/${id}`, task),
  delete: (id: number) => api.delete<{ message: string }>(`/tasks/${id}`),
};

export const notesApi = {
  getAll: (search?: string, tag?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (tag) params.append('tag', tag);
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<Note[]>(`/notes${query}`);
  },
  getById: (id: number) => api.get<Note>(`/notes/${id}`),
  create: (note: Omit<Note, 'id' | 'created_at' | 'updated_at'>) => 
    api.post<Note>('/notes', note),
  update: (id: number, note: Partial<Note>) => 
    api.put<Note>(`/notes/${id}`, note),
  delete: (id: number) => api.delete<{ message: string }>(`/notes/${id}`),
  getStats: () => api.get<{
    total_notes: number;
    public_notes: number;
    private_notes: number;
    total_tags: number;
    words_count: number;
  }>('/notes/stats'),
};

export const filesApi = {
  getAll: () => api.get<File[]>('/files'),
  getById: (id: number) => api.get<File>(`/files/${id}`),
  upload: (file: Blob, description?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (description) formData.append('description', description);
    return api.upload<File>('/files/upload', formData);
  },
  delete: (id: number) => api.delete<{ message: string }>(`/files/${id}`),
  download: (id: number) => `${API_BASE_URL}/files/${id}/download`,
};

export const timeEntriesApi = {
  getAll: (startDate?: string, endDate?: string, isRunning?: boolean) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (isRunning !== undefined) params.append('is_running', isRunning.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<{ time_entries: TimeEntry[] }>(`/time-entries${query}`);
  },
  getById: (id: number) => api.get<{ time_entry: TimeEntry }>(`/time-entries/${id}`),
  create: (timeEntry: {
    task_id?: number;
    bookmark_id?: number;
    note_id?: number;
    description: string;
    tags?: string[];
    billable?: boolean;
    hourly_rate?: number;
    source?: string;
  }) => api.post<{ time_entry: TimeEntry }>('/time-entries', timeEntry),
  update: (id: number, timeEntry: {
    description?: string;
    tags?: string[];
    billable?: boolean;
    hourly_rate?: number;
    end_time?: string;
  }) => api.put<{ time_entry: TimeEntry }>(`/time-entries/${id}`, timeEntry),
  stop: (id: number) => api.post<{ time_entry: TimeEntry }>(`/time-entries/${id}/stop`),
  delete: (id: number) => api.delete<{ message: string }>(`/time-entries/${id}`),
  getStats: () => api.get<{ stats: TimeStats }>('/time-entries/stats'),
};

import { 
  demoBookmarksApi, 
  demoTasksApi, 
  demoNotesApi, 
  demoFilesApi, 
  demoTimeEntriesApi 
} from './demo-api';

export default api;
export { demoBookmarksApi, demoTasksApi, demoNotesApi, demoFilesApi, demoTimeEntriesApi };
