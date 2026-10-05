export type AdminOverview = {
  generated_at: string;
  users: {
    total: number;
    active: number;
    students: number;
    teachers: number;
    admins: number;
  };
  learning: {
    classrooms: number;
    sessions: number;
    open_sessions: number;
    quiz_sessions: number;
  };
  invitations: { active: number };
  providers: {
    elevenlabs: {
      enabled: boolean;
      configured: boolean;
      tts_backend: string;
      stt_backend: string;
    };
  };
};

export type AdminActivityItem = {
  id: string;
  type: "class_activity" | "learning_session" | "quiz_session" | "audit_event";
  category?: string | null;
  action: string;
  actor_name: string;
  actor_role: string | null;
  target_name: string;
  details?: Record<string, unknown> | null;
  occurred_at: string | null;
};

export type AdminActivity = {
  items: AdminActivityItem[];
  limit: number;
  category?: string | null;
  generated_at: string;
};

export type AdminAiRequestLog = {
  id: string;
  timestamp: string | null;
  provider: "OpenAI" | "ElevenLabs";
  service: string;
  model: string;
  actor_name: string;
  target: string;
  status: "success" | "cache_hit" | "cancelled" | "error";
  latency_ms: number;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  characters: number | null;
  audio_bytes: number | null;
  audio_seconds: number | null;
  estimated_cost_usd: number | null;
  error_code: string | null;
  request_id: string;
};

export type AdminAiUsage = {
  generated_at: string;
  elevenlabs: {
    enabled: boolean;
    configured: boolean;
    available: boolean;
    tier: string | null;
    character_count: number | null;
    character_limit: number | null;
    next_reset_unix?: number | null;
    tts_model: string;
    tts_voice_id: string;
    stt_backend: string;
  };
  openai: {
    configured: boolean;
    usage_available: boolean;
    total_tokens: number | null;
    prompt_tokens: number | null;
    completion_tokens: number | null;
    models: {
      tutor: string;
      router: string;
      quiz: string;
      embedding: string;
    };
  };
  recent_requests: AdminAiRequestLog[];
  period_days?: number;
  summary?: { requests: number; provider_calls: number; successes: number; errors: number; cache_hits: number;
    average_latency_ms: number | null; estimated_cost_usd: number | null; known_cost_subtotal_usd: number | null; unpriced_requests: number };
  pagination?: { page: number; limit: number; total: number; has_next: boolean };
};
