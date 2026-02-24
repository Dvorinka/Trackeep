import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ApiResponse, User, Bookmark, Task, Note, TimeEntry, CalendarEvent, SearchFilters, SavedSearch } from '../types';
import { getStoredAuthData } from '../utils/storage';

let API_BASE_URL = __DEV__ 
  ? 'http://localhost:8080/api' 
  : 'https://trackeep.app/api';

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  updateBaseURL(newBaseURL: string) {
    API_BASE_URL = newBaseURL;
    this.client.defaults.baseURL = newBaseURL;
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      async (config) => {
        const authData = await getStoredAuthData();
        if (authData && authData.token) {
          config.headers.Authorization = `Bearer ${authData.token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await this.handleUnauthorized();
        }
        return Promise.reject(error);
      }
    );
  }

  private async handleUnauthorized() {
    try {
      const { clearAuthData } = await import('../utils/storage');
      await clearAuthData();
    } catch (error) {
      console.error('Error handling unauthorized:', error);
    }
  }

  public async request<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.request(config);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Unknown error',
      };
    }
  }
}

const apiClient = new APIClient();

export const updateAPIBaseURL = (newBaseURL: string) => {
  apiClient.updateBaseURL(newBaseURL);
};

export const authAPI = {
  login: async (email: string, password: string): Promise<ApiResponse<{ token: string; user: User }>> => {
    return apiClient.request({
      method: 'POST',
      url: '/auth/login',
      data: { email, password },
    });
  },

  loginWithGitHub: async (): Promise<ApiResponse<{ token: string; user: User }>> => {
    return apiClient.request({
      method: 'POST',
      url: '/auth/github',
    });
  },

  getCurrentUser: async (token: string): Promise<ApiResponse<User>> => {
    return apiClient.request({
      method: 'GET',
      url: '/auth/me',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  updateUser: async (userId: string, updates: Partial<User>): Promise<ApiResponse<User>> => {
    return apiClient.request({
      method: 'PUT',
      url: `/users/${userId}`,
      data: updates,
    });
  },
};

export const bookmarksAPI = {
  getBookmarks: async (filters?: Partial<SearchFilters>): Promise<ApiResponse<Bookmark[]>> => {
    return apiClient.request({
      method: 'GET',
      url: '/bookmarks',
      params: filters,
    });
  },

  createBookmark: async (bookmark: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Bookmark>> => {
    return apiClient.request({
      method: 'POST',
      url: '/bookmarks',
      data: bookmark,
    });
  },

  updateBookmark: async (id: string, updates: Partial<Bookmark>): Promise<ApiResponse<Bookmark>> => {
    return apiClient.request({
      method: 'PUT',
      url: `/bookmarks/${id}`,
      data: updates,
    });
  },

  deleteBookmark: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.request({
      method: 'DELETE',
      url: `/bookmarks/${id}`,
    });
  },
};

export const tasksAPI = {
  getTasks: async (filters?: Partial<SearchFilters>): Promise<ApiResponse<Task[]>> => {
    return apiClient.request({
      method: 'GET',
      url: '/tasks',
      params: filters,
    });
  },

  createTask: async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Task>> => {
    return apiClient.request({
      method: 'POST',
      url: '/tasks',
      data: task,
    });
  },

  updateTask: async (id: string, updates: Partial<Task>): Promise<ApiResponse<Task>> => {
    return apiClient.request({
      method: 'PUT',
      url: `/tasks/${id}`,
      data: updates,
    });
  },

  deleteTask: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.request({
      method: 'DELETE',
      url: `/tasks/${id}`,
    });
  },
};

export const notesAPI = {
  getNotes: async (filters?: Partial<SearchFilters>): Promise<ApiResponse<Note[]>> => {
    return apiClient.request({
      method: 'GET',
      url: '/notes',
      params: filters,
    });
  },

  createNote: async (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Note>> => {
    return apiClient.request({
      method: 'POST',
      url: '/notes',
      data: note,
    });
  },

  updateNote: async (id: string, updates: Partial<Note>): Promise<ApiResponse<Note>> => {
    return apiClient.request({
      method: 'PUT',
      url: `/notes/${id}`,
      data: updates,
    });
  },

  deleteNote: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.request({
      method: 'DELETE',
      url: `/notes/${id}`,
    });
  },
};

export const timeEntriesAPI = {
  getTimeEntries: async (filters?: any): Promise<ApiResponse<TimeEntry[]>> => {
    return apiClient.request({
      method: 'GET',
      url: '/time-entries',
      params: filters,
    });
  },

  createTimeEntry: async (entry: Omit<TimeEntry, 'id' | 'createdAt'>): Promise<ApiResponse<TimeEntry>> => {
    return apiClient.request({
      method: 'POST',
      url: '/time-entries',
      data: entry,
    });
  },

  updateTimeEntry: async (id: string, updates: Partial<TimeEntry>): Promise<ApiResponse<TimeEntry>> => {
    return apiClient.request({
      method: 'PUT',
      url: `/time-entries/${id}`,
      data: updates,
    });
  },

  deleteTimeEntry: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.request({
      method: 'DELETE',
      url: `/time-entries/${id}`,
    });
  },
};

export const searchAPI = {
  search: async (filters: SearchFilters): Promise<ApiResponse<any>> => {
    return apiClient.request({
      method: 'POST',
      url: '/search',
      data: filters,
    });
  },

  getSavedSearches: async (): Promise<ApiResponse<SavedSearch[]>> => {
    return apiClient.request({
      method: 'GET',
      url: '/search/saved',
    });
  },

  createSavedSearch: async (search: Omit<SavedSearch, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<SavedSearch>> => {
    return apiClient.request({
      method: 'POST',
      url: '/search/saved',
      data: search,
    });
  },

  updateSavedSearch: async (id: string, updates: Partial<SavedSearch>): Promise<ApiResponse<SavedSearch>> => {
    return apiClient.request({
      method: 'PUT',
      url: `/search/saved/${id}`,
      data: updates,
    });
  },

  deleteSavedSearch: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.request({
      method: 'DELETE',
      url: `/search/saved/${id}`,
    });
  },
};

export const calendarAPI = {
  getEvents: async (filters?: any): Promise<ApiResponse<CalendarEvent[]>> => {
    return apiClient.request({
      method: 'GET',
      url: '/calendar/events',
      params: filters,
    });
  },

  createEvent: async (event: Omit<CalendarEvent, 'id'>): Promise<ApiResponse<CalendarEvent>> => {
    return apiClient.request({
      method: 'POST',
      url: '/calendar/events',
      data: event,
    });
  },

  updateEvent: async (id: string, updates: Partial<CalendarEvent>): Promise<ApiResponse<CalendarEvent>> => {
    return apiClient.request({
      method: 'PUT',
      url: `/calendar/events/${id}`,
      data: updates,
    });
  },

  deleteEvent: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.request({
      method: 'DELETE',
      url: `/calendar/events/${id}`,
    });
  },
};
