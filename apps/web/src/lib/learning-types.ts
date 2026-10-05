import type { QuizRecoveryResponse } from "./quiz-types";

export type LearningSession = {
  session_id: string;
  revision: number;
  phase: "learning" | "quiz" | "completed";
  class_id: string;
  material_id: string;
  material_title: string;
  subject: string;
  source_filename: string | null;
  language: "id" | "en";
  unit_index: number;
  total_units: number;
  unit_title: string | null;
  unit_titles: (string | null)[];
  text: string;
  available_actions: string[];
  quiz: QuizRecoveryResponse | null;
};
