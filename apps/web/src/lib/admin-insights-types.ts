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
  type: "class_activity" | "learning_session" | "quiz_session";
  action: string;
  actor_name: string;
  actor_role: string | null;
  target_name: string;
  occurred_at: string | null;
};

export type AdminActivity = {
  items: AdminActivityItem[];
  limit: number;
  generated_at: string;
};
