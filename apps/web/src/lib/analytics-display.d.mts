import type { Language } from "./i18n.mjs";
import type { AnalyticsWindow } from "./analytics-types";
export function studyTimeLabel(value: number, language?: Language): string;
export function masteryLabel(value: number, language?: Language): string;
export function analyticsWindowLabel(window: AnalyticsWindow, language?: Language): string;
