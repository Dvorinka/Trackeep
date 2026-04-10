export interface Tag {
  id: number;
  name: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role?: string;
  theme?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Bookmark {
  id: number;
  user_id: number;
  title: string;
  url: string;
  description?: string;
  favicon?: string;
  screenshot?: string;
  is_read?: boolean;
  is_favorite?: boolean;
  content?: string;
  author?: string;
  published_at?: string | null;
  tags?: Array<Tag | string>;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  progress?: number;
  due_date?: string | null;
  completed_at?: string | null;
  tags?: Array<Tag | string>;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: number;
  user_id: number;
  title: string;
  content?: string;
  description?: string;
  is_public: boolean;
  is_pinned?: boolean;
  content_type?: string;
  tags?: Array<Tag | string>;
  created_at: string;
  updated_at: string;
}

export type FileType = 'document' | 'image' | 'video' | 'audio' | 'archive' | 'other';

export interface FileItem {
  id: number;
  user_id: number;
  original_name: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  file_type: FileType;
  description?: string;
  is_public: boolean;
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
  end_time?: string | null;
  duration?: number | null;
  description: string;
  billable: boolean;
  hourly_rate?: number | null;
  is_running: boolean;
  source: string;
  tags?: Array<Tag | string>;
  created_at: string;
  updated_at: string;
}

export interface TimeStats {
  total_time_seconds: number;
  total_entries: number;
  running_entries: number;
  billable_time_seconds: number;
  total_billable_amount: number;
}

export interface VersionInfo {
  version?: string;
  app_version?: string;
  [key: string]: unknown;
}

export interface UpdateCheckInfo {
  update_available?: boolean;
  current_version?: string;
  latest_version?: string;
  message?: string;
  [key: string]: unknown;
}
