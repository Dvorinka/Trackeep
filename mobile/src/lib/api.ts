import { DocumentPickerAsset } from 'expo-document-picker';

import {
  AuthResponse,
  Bookmark,
  FileItem,
  Note,
  Task,
  TimeEntry,
  UpdateCheckInfo,
  User,
  VersionInfo,
} from '../types';
import { getApiBaseUrl, normalizeInstanceUrl } from './url';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  token?: string | null;
  body?: unknown;
  headers?: Record<string, string>;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

async function parseError(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const data = (await response.json().catch(() => null)) as
      | { error?: string; message?: string }
      | null;

    if (data?.error) {
      return data.error;
    }
    if (data?.message) {
      return data.message;
    }
  }

  const text = await response.text().catch(() => '');
  return text || `Request failed with status ${response.status}`;
}

async function request<T>(instanceUrl: string, endpoint: string, options: RequestOptions = {}): Promise<T> {
  const apiBaseUrl = getApiBaseUrl(instanceUrl);
  const { method = 'GET', token, body, headers = {} } = options;

  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (!isFormData && body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${apiBaseUrl}${endpoint}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : isFormData ? (body as BodyInit) : JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return parseResponse<T>(response);
}

async function requestPublic<T>(absoluteUrl: string, init?: RequestInit): Promise<T> {
  const response = await fetch(absoluteUrl, init);

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return parseResponse<T>(response);
}

export const trackeepApi = {
  async probeInstance(inputUrl: string): Promise<{ normalizedUrl: string; version?: string }> {
    const normalizedUrl = normalizeInstanceUrl(inputUrl);

    await requestPublic<string>(`${normalizedUrl}/health`);

    let version: string | undefined;
    try {
      const versionInfo = await requestPublic<VersionInfo>(`${normalizedUrl}/api/version`);
      const candidate = versionInfo.version || versionInfo.app_version;
      if (typeof candidate === 'string') {
        version = candidate;
      }
    } catch {
      // Version endpoint is optional for initial connection setup.
    }

    return { normalizedUrl, version };
  },

  async checkForUpdates(instanceUrl: string): Promise<UpdateCheckInfo> {
    const normalizedUrl = normalizeInstanceUrl(instanceUrl);
    return requestPublic<UpdateCheckInfo>(`${normalizedUrl}/api/updates/check`);
  },

  auth: {
    login(instanceUrl: string, email: string, password: string) {
      return request<AuthResponse>(instanceUrl, '/auth/login', {
        method: 'POST',
        body: { email, password },
      });
    },

    register(instanceUrl: string, payload: { email: string; username: string; fullName: string; password: string }) {
      return request<AuthResponse>(instanceUrl, '/auth/register', {
        method: 'POST',
        body: payload,
      });
    },

    me(instanceUrl: string, token: string) {
      return request<User>(instanceUrl, '/auth/me', {
        method: 'GET',
        token,
      });
    },

    async logout(instanceUrl: string, token: string): Promise<void> {
      await request(instanceUrl, '/auth/logout', {
        method: 'POST',
        token,
      });
    },
  },

  tasks: {
    list(instanceUrl: string, token: string) {
      return request<Task[]>(instanceUrl, '/tasks', { token });
    },

    create(
      instanceUrl: string,
      token: string,
      payload: { title: string; description?: string; status?: string; priority?: string },
    ) {
      return request<Task>(instanceUrl, '/tasks', {
        method: 'POST',
        token,
        body: payload,
      });
    },

    update(instanceUrl: string, token: string, id: number, payload: Partial<Task>) {
      return request<Task>(instanceUrl, `/tasks/${id}`, {
        method: 'PUT',
        token,
        body: payload,
      });
    },

    async remove(instanceUrl: string, token: string, id: number): Promise<void> {
      await request(instanceUrl, `/tasks/${id}`, {
        method: 'DELETE',
        token,
      });
    },
  },

  notes: {
    list(instanceUrl: string, token: string) {
      return request<Note[]>(instanceUrl, '/notes', { token });
    },

    create(
      instanceUrl: string,
      token: string,
      payload: { title: string; content?: string; description?: string; is_public?: boolean },
    ) {
      return request<Note>(instanceUrl, '/notes', {
        method: 'POST',
        token,
        body: payload,
      });
    },

    update(instanceUrl: string, token: string, id: number, payload: Partial<Note>) {
      return request<Note>(instanceUrl, `/notes/${id}`, {
        method: 'PUT',
        token,
        body: payload,
      });
    },

    async remove(instanceUrl: string, token: string, id: number): Promise<void> {
      await request(instanceUrl, `/notes/${id}`, {
        method: 'DELETE',
        token,
      });
    },
  },

  files: {
    list(instanceUrl: string, token: string) {
      return request<FileItem[]>(instanceUrl, '/files', { token });
    },

    async upload(
      instanceUrl: string,
      token: string,
      file: DocumentPickerAsset,
      description?: string,
    ): Promise<FileItem> {
      const formData = new FormData();
      formData.append(
        'file',
        {
          uri: file.uri,
          name: file.name || `upload-${Date.now()}`,
          type: file.mimeType || 'application/octet-stream',
        } as unknown as Blob,
      );

      if (description?.trim()) {
        formData.append('description', description.trim());
      }

      return request<FileItem>(instanceUrl, '/files/upload', {
        method: 'POST',
        token,
        body: formData,
      });
    },

    async uploadFromUri(
      instanceUrl: string,
      token: string,
      payload: { uri: string; name: string; mimeType?: string; description?: string },
    ): Promise<FileItem> {
      const formData = new FormData();
      formData.append(
        'file',
        {
          uri: payload.uri,
          name: payload.name || `shared-${Date.now()}`,
          type: payload.mimeType || 'application/octet-stream',
        } as unknown as Blob,
      );

      if (payload.description?.trim()) {
        formData.append('description', payload.description.trim());
      }

      return request<FileItem>(instanceUrl, '/files/upload', {
        method: 'POST',
        token,
        body: formData,
      });
    },

    async remove(instanceUrl: string, token: string, id: number): Promise<void> {
      await request(instanceUrl, `/files/${id}`, {
        method: 'DELETE',
        token,
      });
    },

    getDownloadUrl(instanceUrl: string, token: string, id: number): string {
      const apiBaseUrl = getApiBaseUrl(instanceUrl);
      return `${apiBaseUrl}/files/${id}/download?token=${encodeURIComponent(token)}`;
    },
  },

  bookmarks: {
    list(instanceUrl: string, token: string) {
      return request<Bookmark[]>(instanceUrl, '/bookmarks', { token });
    },

    metadata(instanceUrl: string, token: string, url: string) {
      return request<{ title?: string; description?: string; image?: string; favicon?: string }>(
        instanceUrl,
        '/bookmarks/metadata',
        {
          method: 'POST',
          token,
          body: { url },
        },
      );
    },

    create(
      instanceUrl: string,
      token: string,
      payload: {
        title: string;
        url: string;
        description?: string;
        is_read?: boolean;
        is_favorite?: boolean;
      },
    ) {
      return request<Bookmark>(instanceUrl, '/bookmarks', {
        method: 'POST',
        token,
        body: payload,
      });
    },
  },

  timeEntries: {
    list(instanceUrl: string, token: string) {
      return request<{ time_entries: TimeEntry[] }>(instanceUrl, '/time-entries', { token });
    },

    create(
      instanceUrl: string,
      token: string,
      payload: { description: string; billable?: boolean; source?: string; tags?: string[] },
    ) {
      return request<{ time_entry: TimeEntry }>(instanceUrl, '/time-entries', {
        method: 'POST',
        token,
        body: payload,
      });
    },

    stop(instanceUrl: string, token: string, id: number) {
      return request<{ time_entry: TimeEntry }>(instanceUrl, `/time-entries/${id}/stop`, {
        method: 'POST',
        token,
      });
    },

    async remove(instanceUrl: string, token: string, id: number): Promise<void> {
      await request(instanceUrl, `/time-entries/${id}`, {
        method: 'DELETE',
        token,
      });
    },
  },
};
