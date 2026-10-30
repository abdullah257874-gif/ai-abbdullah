import type {
  AdminOverviewData,
  ChatMessage,
  Conversation,
  ExplanationLevel,
  HealthStatus,
  ThemeMode,
  UILanguage,
  UserPreferences,
  UserProfile,
  UserSettings,
} from '../types';

const TOKEN_STORAGE_KEY = 'ai_smart_assistant_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(message: string, code = 'API_ERROR', status = 500) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new ApiClientError(
      'You appear to be offline. Please check your internet connection and retry.',
      'NETWORK_OFFLINE',
      0
    );
  }

  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiClientError(
      'Unable to reach the server. Check your connection and try again.',
      'NETWORK_ERROR',
      0
    );
  }

  let json: {
    success?: boolean;
    data?: T;
    error?: { code?: string; message?: string };
  } | null = null;

  try {
    json = await response.json();
  } catch {
    throw new ApiClientError(
      `Unexpected server response (HTTP ${response.status}).`,
      'PARSE_ERROR',
      response.status
    );
  }

  if (!response.ok || !json?.success) {
    throw new ApiClientError(
      json?.error?.message || `Request failed with status ${response.status}.`,
      json?.error?.code || 'REQUEST_FAILED',
      response.status
    );
  }

  return json.data as T;
}

export const api = {
  getHealth: () => request<HealthStatus>('/api/health', { method: 'GET' }),

  register: (payload: { email: string; password: string; displayName: string }) =>
    request<{ user: UserProfile; token: string; settings: UserSettings }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    request<{ user: UserProfile; token: string; settings: UserSettings }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  logout: () => request<{ loggedOut: boolean }>('/api/auth/logout', { method: 'POST' }),

  getMe: () =>
    request<{ user: UserProfile; settings: UserSettings }>('/api/auth/me', { method: 'GET' }),

  updateProfile: (payload: { displayName?: string; preferences?: Partial<UserPreferences> }) =>
    request<{ user: UserProfile }>('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    request<{ passwordChanged: boolean }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  requestPasswordReset: (email: string) =>
    request<{ sent: boolean; verificationCode?: string; notice: string }>(
      '/api/auth/reset-request',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      }
    ),

  confirmPasswordReset: (payload: { email: string; code: string; newPassword: string }) =>
    request<{ passwordUpdated: boolean }>('/api/auth/reset-confirm', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listConversations: () =>
    request<{ conversations: Conversation[] }>('/api/conversations', { method: 'GET' }),

  createConversation: (title: string) =>
    request<{ conversation: Conversation }>('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),

  getConversation: (id: string) =>
    request<{ conversation: Conversation; messages: ChatMessage[] }>(
      `/api/conversations/${encodeURIComponent(id)}`,
      { method: 'GET' }
    ),

  renameConversation: (id: string, title: string) =>
    request<{ conversation: Conversation }>(`/api/conversations/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    }),

  deleteConversation: (id: string) =>
    request<{ deleted: boolean }>(`/api/conversations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  clearConversations: () =>
    request<{ removedCount: number }>('/api/conversations', { method: 'DELETE' }),

  updateSettings: (payload: {
    language?: UILanguage;
    theme?: ThemeMode;
    preferences?: Partial<UserPreferences>;
  }) =>
    request<{ settings: UserSettings }>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  submitFeedback: (payload: { category: string; message: string }) =>
    request<{ feedback: { feedbackId: string } }>('/api/feedback', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  sendChat: (payload: {
    message: string;
    history: { role: 'user' | 'model'; content: string }[];
    conversationId?: string | null;
    regenerate?: boolean;
    uiLanguage?: UILanguage;
  }) =>
    request<{
      reply: string;
      conversation: Conversation | null;
      userMessage: ChatMessage | null;
      modelMessage: ChatMessage | null;
      persisted: boolean;
    }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  generateTool: (payload: {
    tool: string;
    prompt: string;
    language?: string;
    tone?: string;
    level?: ExplanationLevel;
    codeLanguage?: string;
  }) =>
    request<{ output: string; tool: string }>('/api/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  analyzeImage: (payload: {
    mimeType: string;
    imageBase64: string;
    prompt: string;
    mode: 'describe' | 'ocr' | 'objects' | 'custom';
    language?: string;
  }) =>
    request<{ analysis: string }>('/api/analyze-image', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  translate: (payload: { text: string; sourceLanguage: string; targetLanguage: string }) =>
    request<{ translation: string }>('/api/translate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  summarize: (payload: { text: string; level?: ExplanationLevel; language?: string }) =>
    request<{ summary: string }>('/api/summarize', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAdminOverview: () =>
    request<AdminOverviewData>('/api/admin/overview', { method: 'GET' }),
};
