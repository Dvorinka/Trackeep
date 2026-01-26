import { createQuery, useQueryClient, createMutation } from '@tanstack/solid-query';
import { getAuthHeaders } from './auth';

// API base URL
const API_BASE_URL = 'http://localhost:8080/api/v1';

// Retry configuration
const DEFAULT_RETRY_CONFIG = {
  retry: 3,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  networkMode: 'online' as const,
};

// Generic API client with retry logic
const apiClient = {
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API Error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  },

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }
    
    return response.json();
  },

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }
    
    return response.json();
  },

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }
    
    return response.json();
  },
};

// Types
export interface Bookmark {
  id: number;
  user_id: number;
  title: string;
  url: string;
  description?: string;
  is_read: boolean;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  tags: string[];
}

export interface Task {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  progress: number;
  created_at: string;
  updated_at: string;
  tags: string[];
}

export interface Note {
  id: number;
  user_id: number;
  title: string;
  content: string;
  content_type: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  tags: string[];
}

export interface FileItem {
  id: number;
  user_id: number;
  filename: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  file_path: string;
  created_at: string;
  updated_at: string;
}

// Bookmarks API
export const bookmarksApi = {
  useGetAll: () => createQuery(() => ({
    queryKey: ['bookmarks'],
    queryFn: () => apiClient.get<Bookmark[]>('/bookmarks'),
    ...DEFAULT_RETRY_CONFIG,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })),

  useGetById: (id: number) => createQuery(() => ({
    queryKey: ['bookmarks', id],
    queryFn: () => apiClient.get<Bookmark>(`/bookmarks/${id}`),
    ...DEFAULT_RETRY_CONFIG,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })),

  useCreate: () => {
    const queryClient = useQueryClient();
    return createMutation(() => ({
      mutationFn: (data: Omit<Bookmark, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => 
        apiClient.post<Bookmark>('/bookmarks', data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
      },
      onError: (error) => {
        console.error('Failed to create bookmark:', error);
      },
    }));
  },

  useUpdate: () => {
    const queryClient = useQueryClient();
    return createMutation(() => ({
      mutationFn: ({ id, data }: { id: number; data: Partial<Bookmark> }) => 
        apiClient.put<Bookmark>(`/bookmarks/${id}`, data),
      onSuccess: (_, { id }) => {
        queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
        queryClient.invalidateQueries({ queryKey: ['bookmarks', id] });
      },
      onError: (error) => {
        console.error('Failed to update bookmark:', error);
      },
    }));
  },

  useDelete: () => {
    const queryClient = useQueryClient();
    return createMutation(() => ({
      mutationFn: (id: number) => apiClient.delete(`/bookmarks/${id}`),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
      },
      onError: (error) => {
        console.error('Failed to delete bookmark:', error);
      },
    }));
  },
};

// Tasks API
export const tasksApi = {
  useGetAll: () => createQuery(() => ({
    queryKey: ['tasks'],
    queryFn: () => apiClient.get<Task[]>('/tasks'),
    ...DEFAULT_RETRY_CONFIG,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })),

  useGetById: (id: number) => createQuery(() => ({
    queryKey: ['tasks', id],
    queryFn: () => apiClient.get<Task>(`/tasks/${id}`),
    ...DEFAULT_RETRY_CONFIG,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })),

  useCreate: () => {
    const queryClient = useQueryClient();
    return createMutation(() => ({
      mutationFn: (data: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => 
        apiClient.post<Task>('/tasks', data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      },
      onError: (error) => {
        console.error('Failed to create task:', error);
      },
    }));
  },

  useUpdate: () => {
    const queryClient = useQueryClient();
    return createMutation(() => ({
      mutationFn: ({ id, data }: { id: number; data: Partial<Task> }) => 
        apiClient.put<Task>(`/tasks/${id}`, data),
      onSuccess: (_, { id }) => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['tasks', id] });
      },
      onError: (error) => {
        console.error('Failed to update task:', error);
      },
    }));
  },

  useDelete: () => {
    const queryClient = useQueryClient();
    return createMutation(() => ({
      mutationFn: (id: number) => apiClient.delete(`/tasks/${id}`),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      },
      onError: (error) => {
        console.error('Failed to delete task:', error);
      },
    }));
  },
};

// Notes API
export const notesApi = {
  useGetAll: (search?: string, tag?: string) => createQuery(() => ({
    queryKey: ['notes', search, tag],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (tag) params.append('tag', tag);
      const queryString = params.toString();
      return apiClient.get<Note[]>(`/notes${queryString ? `?${queryString}` : ''}`);
    },
    ...DEFAULT_RETRY_CONFIG,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })),

  useGetById: (id: number) => createQuery(() => ({
    queryKey: ['notes', id],
    queryFn: () => apiClient.get<Note>(`/notes/${id}`),
    ...DEFAULT_RETRY_CONFIG,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })),

  useCreate: () => {
    const queryClient = useQueryClient();
    return createMutation(() => ({
      mutationFn: (data: Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => 
        apiClient.post<Note>('/notes', data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['notes'] });
      },
      onError: (error) => {
        console.error('Failed to create note:', error);
      },
    }));
  },

  useUpdate: () => {
    const queryClient = useQueryClient();
    return createMutation(() => ({
      mutationFn: ({ id, data }: { id: number; data: Partial<Note> }) => 
        apiClient.put<Note>(`/notes/${id}`, data),
      onSuccess: (_, { id }) => {
        queryClient.invalidateQueries({ queryKey: ['notes'] });
        queryClient.invalidateQueries({ queryKey: ['notes', id] });
      },
      onError: (error) => {
        console.error('Failed to update note:', error);
      },
    }));
  },

  useDelete: () => {
    const queryClient = useQueryClient();
    return createMutation(() => ({
      mutationFn: (id: number) => apiClient.delete(`/notes/${id}`),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['notes'] });
      },
      onError: (error) => {
        console.error('Failed to delete note:', error);
      },
    }));
  },
};

// Files API
export const filesApi = {
  useGetAll: () => createQuery(() => ({
    queryKey: ['files'],
    queryFn: () => apiClient.get<FileItem[]>('/files'),
    ...DEFAULT_RETRY_CONFIG,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })),

  useGetById: (id: number) => createQuery(() => ({
    queryKey: ['files', id],
    queryFn: () => apiClient.get<FileItem>(`/files/${id}`),
    ...DEFAULT_RETRY_CONFIG,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })),

  useUpload: () => {
    const queryClient = useQueryClient();
    return createMutation(() => ({
      mutationFn: async (file: globalThis.File) => {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${API_BASE_URL}/files/upload`, {
          method: 'POST',
          headers: {
            'Authorization': getAuthHeaders().Authorization || '',
          },
          body: formData,
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Upload failed');
        }
        
        return response.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['files'] });
      },
      onError: (error) => {
        console.error('Failed to upload file:', error);
      },
    }));
  },

  useDelete: () => {
    const queryClient = useQueryClient();
    return createMutation(() => ({
      mutationFn: (id: number) => apiClient.delete(`/files/${id}`),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['files'] });
      },
      onError: (error) => {
        console.error('Failed to delete file:', error);
      },
    }));
  },
};
