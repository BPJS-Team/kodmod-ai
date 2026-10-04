export const MATERIAL_UPLOAD_LIMIT: number;
export type MaterialSection = { title: string; first: number; last: number; kind: "chapter" | "range" };
export function parseMaterialPageRange(first: unknown, last: unknown): { first: number; last: number } | null;
export function materialTutorStatus(material: { published: boolean; rag_status?: string; indexed_version?: number; content_version?: number; n_chunks?: number }): { heading: string; description: string; actionLabel: string | null };
export function validateMaterialFile(file: { name: string; size: number } | null): string | null;
export function chatMessagePayload(incoming: unknown): Record<string, string>;
