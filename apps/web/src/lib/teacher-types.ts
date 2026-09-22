import type { AnalyticsWindow, StudentAnalytics } from "@/lib/analytics-types";

export type CohortWeakConcept = {
  concept_name: string;
  avg_mastery: number;
  n_students: number;
};

export type TeacherStudentRow = {
  student_id: string;
  student_name: string;
  overall_mastery: number;
  quiz_accuracy: number;
  engagement_index: number;
  n_sessions: number;
  open_misconceptions: number;
};

export type TeacherCohort = {
  window: AnalyticsWindow;
  n_students: number;
  avg_mastery: number;
  avg_quiz_accuracy: number;
  avg_engagement_index: number;
  cohort_weak_concepts: CohortWeakConcept[];
  students: TeacherStudentRow[];
  generated_at: string;
};

export type TeacherAccount = {
  id: string;
  username: string;
  full_name: string;
  role: "student";
  is_active: boolean;
};

export type TeacherStudentDetail = {
  account: TeacherAccount;
  analytics: StudentAnalytics;
  teacher_summary: string;
};

export type TeacherSession = {
  id: string;
  title: string;
  subject_name: string | null;
  mode: string;
  started_at: string | null;
  ended_at: string | null;
};

export type TeacherTranscript = {
  id: string;
  student_id: string;
  title: string;
  started_at: string | null;
  turns: Array<{
    role: string;
    text: string;
    intent?: string | null;
    timestamp?: string | null;
  }>;
};
