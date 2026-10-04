import {
  createSpeechAudioLoader,
  invalidateSpeechAudioCache,
  SPEECH_AUDIO_CACHE_TTL_MS,
    type CachedSpeechAudio,
    type SpeechContext,
} from "./speech-preferences.mjs";

const DATABASE_NAME = "kodmod-speech-audio-v1";
const DATABASE_VERSION = 1;
const STORE_NAME = "audio";
const MAX_CACHE_ENTRIES = 50;
const MAX_CACHE_BYTES = 64 * 1024 * 1024;

type SpeechAudioRecord = CachedSpeechAudio & {
  key: string;
  createdAt: number;
  size: number;
};

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Penyimpanan audio tidak tersedia di peramban ini."));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () => reject(request.error ?? new Error("Cache audio gagal dibuka."));
    request.onblocked = () => reject(new Error("Cache audio sedang dipakai tab lain."));
  }).catch((error) => {
    databasePromise = null;
    throw error;
  });
  return databasePromise;
}

async function readSpeechAudio(key: string): Promise<CachedSpeechAudio | null> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readonly");
  const request = transaction.objectStore(STORE_NAME).get(key);
  const record = await new Promise<SpeechAudioRecord | undefined>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as SpeechAudioRecord | undefined);
    request.onerror = () => reject(request.error ?? new Error("Cache audio gagal dibaca."));
  });

  if (!record) return null;
  if (record.expiresAt <= Date.now()) {
    await deleteSpeechAudio(key);
    return null;
  }
  return { blob: record.blob, expiresAt: record.expiresAt };
}

async function writeSpeechAudio(
  key: string,
  entry: CachedSpeechAudio,
): Promise<void> {
  if (!entry.blob.size || entry.blob.size > MAX_CACHE_BYTES) return;
  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const now = Date.now();
    store.put({
      key,
      blob: entry.blob,
      createdAt: now,
      expiresAt: now + SPEECH_AUDIO_CACHE_TTL_MS,
      size: entry.blob.size,
    } satisfies SpeechAudioRecord);

    const allRequest = store.getAll();
    allRequest.onsuccess = () => {
      const records = (allRequest.result as SpeechAudioRecord[])
        .sort((left, right) => left.createdAt - right.createdAt);
      let totalBytes = 0;
      const unexpired = records.filter((record) => record.expiresAt > now);
      for (const record of records) {
        if (record.expiresAt <= now) store.delete(record.key);
        else totalBytes += record.size;
      }
      let remaining = unexpired.length;
      for (const record of unexpired) {
        if (remaining <= MAX_CACHE_ENTRIES && totalBytes <= MAX_CACHE_BYTES) break;
        store.delete(record.key);
        remaining -= 1;
        totalBytes -= record.size;
      }
    };
    allRequest.onerror = () => transaction.abort();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Cache audio gagal disimpan."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Cache audio gagal disimpan."));
  });
}

async function deleteSpeechAudio(key: string) {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).delete(key);
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Cache audio gagal diperbarui."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Cache audio gagal diperbarui."));
  });
}

async function requestAudio(text: string, context: SpeechContext = {}) {
  const endpoint = context.menuKey
    ? `/api/voice/menu/${encodeURIComponent(context.menuKey)}?language=${context.language ?? "id"}`
    : "/api/voice/tts";
  const response = await fetch(endpoint, {
    method: context.menuKey ? "GET" : "POST",
    headers: { "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: context.menuKey ? undefined : JSON.stringify({ text, language: context.language }),
    signal: context.signal,
  });
  if (!response.ok) {
    const message = await response
      .json()
      .then((body) => (typeof body?.message === "string" ? body.message : "Audio belum dapat dibuat."))
      .catch(() => "Audio belum dapat dibuat.");
    throw new Error(message);
  }
  const blob = await response.blob();
  if (!blob.size) throw new Error("Audio yang diterima kosong. Coba lagi.");
  return blob;
}

const loadSpeechAudio = createSpeechAudioLoader({
  read: readSpeechAudio,
  write: writeSpeechAudio,
  fetchAudio: requestAudio,
});

export async function getSpeechAudio(text: string, context: SpeechContext = {}) {
  // Always resolve scope before a private local cache lookup. A shared browser
  // must never replay another account's cached answer after login/logout.
  const response = await fetch("/api/voice/profile", { cache: "no-store", signal: context.signal });
  if (!response.ok) throw new Error("Audio belum dapat dibuat. Coba lagi.");
  const profile = await response.json() as { profile: string; scope: string };
  if (!context.menuKey && profile.scope === "guest") throw new Error("Sesi berakhir. Silakan masuk kembali.");
  return loadSpeechAudio(text, { ...context, profile: profile.profile,
    scope: context.menuKey ? "public-menu" : profile.scope });
}

export async function pruneExpiredSpeechAudioCache() {
  const database = await openDatabase();
  return new Promise<number>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    const now = Date.now();
    let removed = 0;
    request.onsuccess = () => {
      for (const record of request.result as SpeechAudioRecord[]) {
        if (record.expiresAt <= now) {
          store.delete(record.key);
          removed += 1;
        }
      }
    };
    request.onerror = () => transaction.abort();
    transaction.oncomplete = () => resolve(removed);
    transaction.onerror = () => reject(transaction.error ?? new Error("Cache audio gagal diperbarui."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Cache audio gagal diperbarui."));
  });
}

export async function clearSpeechAudioCache() {
  invalidateSpeechAudioCache();
  const database = await openDatabase();
  return new Promise<number>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const countRequest = store.count();
    let removed = 0;
    countRequest.onsuccess = () => {
      removed = countRequest.result;
      store.clear();
    };
    countRequest.onerror = () => transaction.abort();
    transaction.oncomplete = () => resolve(removed);
    transaction.onerror = () => reject(transaction.error ?? new Error("Cache audio gagal dihapus."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Cache audio gagal dihapus."));
  });
}
