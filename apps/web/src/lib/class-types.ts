export type LearningRole = "teacher" | "student";
export type Classroom = {
  id: string;
  name: string;
  subject: string;
  description: string;
  is_archived: boolean;
  teacher_name: string;
  member_count: number;
  material_count: number;
  created_at: string;
};
export type Material = {
  id: string;
  title: string;
  published: boolean;
  created_at: string;
  content?: string;
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
