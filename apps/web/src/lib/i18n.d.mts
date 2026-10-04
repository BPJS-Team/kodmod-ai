export type Language = "id" | "en";
export const LANGUAGE_COOKIE: string;
export const languages: Language[];
export const english: Record<string, string>;
export function validLanguage(value: unknown): value is Language;
export function localeFor(language: Language): "id-ID" | "en-US";
export function translate(text: string, language?: Language): string;
