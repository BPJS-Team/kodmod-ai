export type CurriculumSubject = { id: string; name: string; description?: string | null };
export type CurriculumConcept = { id: string; name: string; subject_id: string; description?: string | null };
export type MaterialMapping = {
  material_id: string;
  subject_id: string | null;
  content_version: number;
  mapping_version: number;
  concepts: {
    id: string; name: string; primary: boolean; approved_by: string | null; approved_at: string;
  }[];
};
