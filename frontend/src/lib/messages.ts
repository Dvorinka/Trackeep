export type ConversationType = 'global' | 'team' | 'group' | 'dm' | 'self' | 'password_vault';

export interface UserLite {
  id: number;
  username: string;
  full_name?: string;
  avatar_url?: string;
}

export interface Conversation {
  id: number;
  type: ConversationType;
  name: string;
  topic?: string;
  team_id?: number | null;
  created_by: number;
  is_default: boolean;
  is_archived: boolean;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationListItem {
  conversation: Conversation;
  role: string;
  unread_count: number;
  last_message?: Message;
}

export interface ConversationMember {
  id: number;
  conversation_id: number;
  user_id: number;
  role: 'owner' | 'admin' | 'member' | 'viewer' | string;
  joined_at?: string;
  last_read_message_id?: number | null;
  last_read_at?: string | null;
  muted_until?: string | null;
  is_hidden?: boolean;
  user?: UserLite;
}

export interface MessageAttachment {
  id: number;
  message_id: number;
  kind: string;
  file_id?: number | null;
  url?: string;
  title?: string;
  preview_json?: string;
}

export interface MessageReference {
  id: number;
  message_id: number;
  entity_type: string;
  entity_id: number;
  deep_link: string;
}

export interface MessageSuggestion {
  id: number;
  message_id: number;
  type: string;
  payload_json: string;
  status: 'pending' | 'accepted' | 'dismissed';
  created_at: string;
  updated_at: string;
}

export interface MessageReaction {
  id: number;
  message_id: number;
  user_id: number;
  emoji: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender?: UserLite;
  body: string;
  is_sensitive: boolean;
  edited_at?: string | null;
  deleted_at?: string | null;
  metadata_json?: string;
  created_at: string;
  updated_at: string;
  attachments?: MessageAttachment[];
  references?: MessageReference[];
  suggestions?: MessageSuggestion[];
  reactions?: MessageReaction[];
}

export interface VaultItem {
  id: number;
  label: string;
  owner_user_id: number;
  source_message_id?: number | null;
  last_accessed_at?: string | null;
  shared: boolean;
  allow_reveal: boolean;
  expires_at?: string | null;
  target_conversation_id?: number | null;
}

export interface UserFile {
  id: number;
  original_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
  description?: string;
}

export interface WsEvent {
  type: string;
  conversation_id?: number;
  data?: any;
  timestamp?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

function getToken() {
  return localStorage.getItem('trackeep_token') || localStorage.getItem('token') || '';
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/api/v1/messages${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export const messagesApi = {
  listConversations: () => apiRequest<{ conversations: ConversationListItem[] }>('/conversations'),
  createConversation: (payload: any) => apiRequest<{ conversation: Conversation }>('/conversations', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getConversation: (id: number) =>
    apiRequest<{ conversation: Conversation; membership: ConversationMember; members: ConversationMember[] }>(
      `/conversations/${id}`
    ),
  getMessages: (conversationId: number, cursor?: number, limit: number = 50) =>
    apiRequest<{ messages: Message[]; next_cursor?: number }>(
      `/conversations/${conversationId}/messages?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`
    ),
  sendMessage: (conversationId: number, payload: any) => apiRequest<{ message: Message; warning?: string }>(
    `/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  ),
  updateMessage: (id: number, body: string) =>
    apiRequest<{ message: Message }>(`/messages/${id}`, { method: 'PATCH', body: JSON.stringify({ body }) }),
  deleteMessage: (id: number) => apiRequest<{ message: string }>(`/messages/${id}`, { method: 'DELETE' }),
  addReaction: (id: number, emoji: string) =>
    apiRequest<{ reaction: MessageReaction }>(`/messages/${id}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    }),
  removeReaction: (id: number, emoji: string) =>
    apiRequest<{ message: string }>(`/messages/${id}/reactions/${encodeURIComponent(emoji)}`, { method: 'DELETE' }),
  searchMessages: (payload: any) =>
    apiRequest<{ results: Message[]; total: number; limit: number; offset: number }>(
      '/messages/search',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),
  getSuggestions: (messageId: number) => apiRequest<{ suggestions: MessageSuggestion[] }>(`/messages/${messageId}/suggestions`),
  acceptSuggestion: (messageId: number, suggestionId: number, payload: any = {}) =>
    apiRequest<any>(`/messages/${messageId}/suggestions/${suggestionId}/accept`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  dismissSuggestion: (messageId: number, suggestionId: number) =>
    apiRequest<any>(`/messages/${messageId}/suggestions/${suggestionId}/dismiss`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  revealSensitiveMessage: (messageId: number) =>
    apiRequest<{ message_id: number; plaintext: string }>(`/messages/${messageId}/reveal-sensitive`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  listVaultItems: () => apiRequest<{ items: VaultItem[] }>('/password-vault/items'),
  createVaultItem: (payload: any) => apiRequest<any>('/password-vault/items', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  shareVaultItem: (id: number, payload: any) =>
    apiRequest<any>(`/password-vault/items/${id}/share`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  revealVaultItem: (id: number) =>
    apiRequest<{ id: number; label: string; secret: string; notes: string; warning?: string }>(
      `/password-vault/items/${id}/reveal`,
      { method: 'POST', body: JSON.stringify({}) }
    ),
  unshareVaultItem: (id: number, payload: any) =>
    apiRequest<any>(`/password-vault/items/${id}/unshare`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  listUserFiles: async (query: string = '', limit: number = 20): Promise<UserFile[]> => {
    const token = getToken();
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set('q', query.trim());
    }
    if (Number.isFinite(limit) && limit > 0) {
      params.set('limit', String(Math.min(100, Math.floor(limit))));
    }

    const suffix = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/api/v1/files${suffix}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed (${res.status})`);
    }
    return res.json();
  },
};

export async function uploadChatFile(file: File): Promise<{ id: number; original_name: string; mime_type: string }> {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('description', 'Uploaded from chat');

  const res = await fetch(`${API_BASE_URL}/api/v1/files/upload`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Upload failed (${res.status})`);
  }
  return res.json();
}

export class MessagesRealtimeClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private shouldReconnect = true;
  private onEvent: (event: WsEvent) => void;
  private onStatus?: (status: 'connected' | 'disconnected' | 'error') => void;

  constructor(
    onEvent: (event: WsEvent) => void,
    onStatus?: (status: 'connected' | 'disconnected' | 'error') => void
  ) {
    this.onEvent = onEvent;
    this.onStatus = onStatus;
  }

  connect() {
    this.cleanupReconnect();
    const token = getToken();
    if (!token) return;

    const wsBase = API_BASE_URL.replace(/^http/, 'ws');
    this.ws = new WebSocket(`${wsBase}/api/v1/messages/ws?token=${encodeURIComponent(token)}`);

    this.ws.onopen = () => {
      this.onStatus?.('connected');
    };

    this.ws.onmessage = (evt) => {
      try {
        const parsed = JSON.parse(evt.data) as WsEvent;
        this.onEvent(parsed);
      } catch {
        // ignore invalid payloads
      }
    };

    this.ws.onerror = () => {
      this.onStatus?.('error');
    };

    this.ws.onclose = () => {
      this.onStatus?.('disconnected');
      this.ws = null;
      if (this.shouldReconnect) {
        this.reconnectTimer = window.setTimeout(() => this.connect(), 2000);
      }
    };
  }

  send(payload: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(payload));
  }

  disconnect() {
    this.shouldReconnect = false;
    this.cleanupReconnect();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private cleanupReconnect() {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
