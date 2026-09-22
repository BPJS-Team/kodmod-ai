export type SpeechEngine = "app" | "device";

export type CachedSpeechAudio = {
  blob: Blob;
  expiresAt: number;
};

export const SPEECH_ENGINE_PREFERENCE_KEY: string;
export const SPEECH_AUDIO_CACHE_TTL_MS: number;

export function readSpeechEnginePreference(
  storage?: Pick<Storage, "getItem">,
): SpeechEngine | null;

export function writeSpeechEnginePreference(
  storage: Pick<Storage, "setItem"> | undefined,
  engine: SpeechEngine,
): boolean;

export function speechAudioCacheKey(text: string): Promise<string>;
export function invalidateSpeechAudioCache(): void;

export function createSpeechAudioLoader(options: {
  read: (key: string) => Promise<CachedSpeechAudio | null>;
  write: (key: string, entry: CachedSpeechAudio) => Promise<void>;
  fetchAudio: (text: string) => Promise<Blob>;
  now?: () => number;
  cacheTtlMs?: number;
}): (text: string) => Promise<{ blob: Blob; cached: boolean }>;
