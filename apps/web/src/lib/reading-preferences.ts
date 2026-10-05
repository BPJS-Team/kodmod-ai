export type ReadingPreferences = {
  size: string;
  contrast: boolean;
  spacing: string;
};
export const readingDefaults: ReadingPreferences = {
  size: "20",
  contrast: false,
  spacing: "1.95",
};
export function parseReadingPreferences(raw?: string): ReadingPreferences {
  try {
    const value = JSON.parse(raw || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value))
      return { ...readingDefaults };
    return {
      size: ["18", "20", "24", "28"].includes(value.size) ? value.size : "20",
      contrast: value.contrast === true,
      spacing: ["1.65", "1.95", "2.3"].includes(value.spacing)
        ? value.spacing
        : "1.95",
    };
  } catch {
    return { ...readingDefaults };
  }
}
