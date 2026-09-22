export const SPEECH_ENGINE_PREFERENCE_KEY = "kodmod.speech-engine.v1";
export const SPEECH_AUDIO_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const AUDIO_CACHE_VERSION = "kodmod-elevenlabs-v2";
const inFlightAudio = new Map();
let inMemoryPreference = null;
let cacheGeneration = 0;

function announcePreferenceChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("kodmod:speech-engine-change"));
  }
}

export function readSpeechEnginePreference(storage) {
  try {
    const destination = storage ?? globalThis.localStorage;
    const value = destination?.getItem(SPEECH_ENGINE_PREFERENCE_KEY);
    if (value === "app" || value === "device") return value;
  } catch {
    return inMemoryPreference;
  }
  return inMemoryPreference;
}

export function writeSpeechEnginePreference(storage, engine) {
  if (engine !== "app" && engine !== "device") return false;
  try {
    const destination = storage ?? globalThis.localStorage;
    if (!destination) throw new Error("Penyimpanan peramban tidak tersedia.");
    destination.setItem(SPEECH_ENGINE_PREFERENCE_KEY, engine);
    inMemoryPreference = engine;
    announcePreferenceChange();
    return true;
  } catch {
    inMemoryPreference = engine;
    announcePreferenceChange();
    return false;
  }
}

function fallbackDigest(value) {
  let left = 0x811c9dc5;
  let right = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    left = Math.imul(left ^ code, 0x01000193);
    right = Math.imul(right ^ code, 0x85ebca6b);
  }
  return `${(left >>> 0).toString(16)}${(right >>> 0).toString(16)}-${value.length}`;
}

async function digestSpeechText(value) {
  try {
    if (globalThis.crypto?.subtle && typeof TextEncoder !== "undefined") {
      const bytes = new TextEncoder().encode(value);
      const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    }
  } catch {
    // Older or restricted browsers still get a stable local cache key.
  }
  return fallbackDigest(value);
}

export async function speechAudioCacheKey(text) {
  const normalized = String(text ?? "").trim();
  const digest = await digestSpeechText(normalized);
  return `${AUDIO_CACHE_VERSION}:${digest}`;
}

export function invalidateSpeechAudioCache() {
  cacheGeneration += 1;
  inFlightAudio.clear();
}

export function createSpeechAudioLoader({
  read,
  write,
  fetchAudio,
  now = Date.now,
  cacheTtlMs = SPEECH_AUDIO_CACHE_TTL_MS,
}) {
  return async function loadSpeechAudio(text) {
    const normalized = String(text ?? "").trim();
    if (!normalized) throw new Error("Teks untuk dibacakan masih kosong.");

    const key = await speechAudioCacheKey(normalized);
    let cached = null;
    try {
      cached = await read(key);
    } catch {
      // Cache failures must not prevent a new TTS request.
    }
    if (cached?.blob && cached.expiresAt > now()) {
      return { blob: cached.blob, cached: true };
    }

    const pending = inFlightAudio.get(key);
    if (pending) {
      const blob = await pending;
      return { blob, cached: false };
    }

    const generation = cacheGeneration;
    const request = (async () => {
      const blob = await fetchAudio(normalized);
      if (generation === cacheGeneration) {
        try {
          await write(key, { blob, expiresAt: now() + cacheTtlMs });
        } catch {
          // Keep playback available when IndexedDB is full or unavailable.
        }
      }
      return blob;
    })();
    inFlightAudio.set(key, request);
    try {
      return { blob: await request, cached: false };
    } finally {
      if (inFlightAudio.get(key) === request) inFlightAudio.delete(key);
    }
  };
}
