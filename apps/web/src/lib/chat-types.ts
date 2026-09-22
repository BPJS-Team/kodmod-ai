export type ChatSessionSummary = {
  id: string;
  title: string;
  subject_id: string | null;
  subject_name: string | null;
  started_at: string | null;
};

export type ChatTurn = {
  role: "student" | "assistant" | "tutor" | "system";
  text: string;
  intent?: string | null;
  timestamp?: string | null;
};

export type ChatSessionDetail = ChatSessionSummary & {
  turns: ChatTurn[];
};

export type ChatMessageResponse = {
  session_id: string;
  text: string;
  intent: string;
  next_action: string;
  sources: Array<{
    source?: string;
    section_title?: string | null;
    score?: number;
  }>;
  latency_ms: number;
  quiz_progress: { index: number; total: number } | null;
};
