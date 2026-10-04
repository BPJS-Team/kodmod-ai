export type LearningRole = "teacher" | "student";
export type Classroom = {
  id: string;
  name: string;
  subject: string;
  subject_id?: string | null;
  description: string;
  is_archived: boolean;
  teacher_name: string;
  member_count: number;
  material_count: number;
  created_at: string;
};
export type Material = {
  progress?: ReadingProgress;
  id: string;
  title: string;
  published: boolean;
  created_at: string;
  content?: string;
  source_filename?: string | null;
  rag_status?: "pending" | "processing" | "ready" | "failed";
  rag_error?: string | null;
  n_chunks?: number;
  content_version?: number;
  indexed_version?: number;
  mapping_version?: number;
  indexed_mapping_version?: number;
};
export type ReadingProgress = {
  completed: boolean;
  bookmarked: boolean;
  completed_at: string | null;
};
export type StudentMaterial = Material & {
  class_id: string;
  class_name: string;
  subject: string;
  progress: ReadingProgress;
};
export type ClassDetail = Classroom & {
  materials: Material[];
  members: {
    id: string;
    full_name: string;
    username: string;
    is_active: boolean;
  }[];
};

export type TeacherMaterial = Material & {
  class_id: string;
  class_name: string;
  subject: string;
  is_archived: boolean;
};
