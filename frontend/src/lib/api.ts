const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

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
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
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

export default api;
