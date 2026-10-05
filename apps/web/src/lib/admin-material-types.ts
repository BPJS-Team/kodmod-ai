import type { Material } from "./class-types";
export type AdminMaterial = Material & {
  class_id: string;
  class_name: string;
  subject: string;
  is_archived: boolean;
  teacher_id: string;
  teacher_name: string;
  content?: string;
};
export type AdminMaterialCatalog = { items: AdminMaterial[]; total: number; limit: number; offset: number };
