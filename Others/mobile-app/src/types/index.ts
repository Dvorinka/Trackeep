export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  githubUsername?: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  syncEnabled: boolean;
  language: string;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  description?: string;
  tags: string[];
  isFavorite: boolean;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
  content?: string;
  thumbnail?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  estimatedTime?: number;
  actualTime?: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  parentId?: string;
  children?: Note[];
}

export interface TimeEntry {
  id: string;
  taskId?: string;
  bookmarkId?: string;
  noteId?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  description: string;
  tags: string[];
  billable: boolean;
  hourlyRate?: number;
  createdAt: Date;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  type: 'task' | 'meeting' | 'deadline' | 'reminder' | 'habit';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  location?: string;
  attendees?: string[];
  recurring?: RecurrenceRule;
  source: 'trackeep' | 'google' | 'outlook' | 'manual';
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: Date;
  daysOfWeek?: number[];
}

export interface SearchFilters {
  query: string;
  contentType: 'all' | 'bookmarks' | 'tasks' | 'notes' | 'files';
  tags: string[];
  dateRange: { start: Date; end: Date };
  author: string;
  language: string;
  fileTypes: string[];
  isFavorite: boolean;
  isRead: boolean;
  searchMode: 'fulltext' | 'semantic' | 'hybrid';
  threshold: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SearchFilters;
  alert: boolean;
  lastRun?: Date;
  runCount: number;
  isPublic: boolean;
  description?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface NavigationState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user?: User;
}

export interface OfflineState {
  isOnline: boolean;
  syncInProgress: boolean;
  pendingChanges: number;
  lastSyncTime?: Date;
}
