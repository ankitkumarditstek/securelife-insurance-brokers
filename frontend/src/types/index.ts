/**
 * Common domain and API types
 */

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: string;
}

export interface HealthStatus {
  status: string;
  app_name: string;
  environment: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  status: 'sent' | 'pending' | 'error';
  metadata?: Record<string, unknown>;
}

export interface UIAction {
  type: string; // e.g. "show_upload", "prompt_consent"
  leadId?: string;
  payload?: Record<string, unknown>;
}

export interface CreateSessionApiResponse {
  session_token: string;
  conversation_id: string;
  lead_id: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
    metadata?: Record<string, unknown>;
  }>;
}

export interface SendMessageApiResponse {
  message: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
    metadata?: Record<string, unknown>;
  };
  captured: Record<string, unknown>;
  conversation_status: string;
  lead_status: string;
  ui_actions: Array<{
    type: string;
    lead_id?: string;
    payload?: Record<string, unknown>;
  }>;
}

export interface ResumeSessionApiResponse {
  session_token: string;
  conversation_id: string;
  lead_id: string;
  conversation_status: string;
  lead_status: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
    metadata?: Record<string, unknown>;
  }>;
  captured_slots: Record<string, unknown>;
  ui_actions: Array<{
    type: string;
    lead_id?: string;
    payload?: Record<string, unknown>;
  }>;
}
