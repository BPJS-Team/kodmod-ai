"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  Headphones,
  Smartphone,
  Volume2,
  X,
} from "lucide-react";
import {
  readSpeechEnginePreference,
  writeSpeechEnginePreference,
  type SpeechEngine,
} from "@/lib/speech-preferences.mjs";
import {
  clearSpeechAudioCache,
  pruneExpiredSpeechAudioCache,
} from "@/lib/speech-audio-cache";

type VoicePreferences = {
  engine: SpeechEngine;
  openVoicePreferences: () => void;
};

const VoicePreferencesContext = createContext<VoicePreferences | null>(null);

function subscribeClientReady() {
  return () => {};
}

const getClientReady = () => true;
const getServerClientReady = () => false;

function subscribeToSpeechPreference(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onChange);
  window.addEventListener("kodmod:speech-engine-change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("kodmod:speech-engine-change", onChange);
  };
}

const getServerSpeechPreference = () => null;

export function useVoicePreferences() {
  const context = useContext(VoicePreferencesContext);
  if (!context) throw new Error("VoicePreferencesProvider harus berada di root aplikasi.");
  return context;
}

export function VoicePreferencesProvider({ children }: { children: ReactNode }) {
  const clientReady = useSyncExternalStore(
    subscribeClientReady,
    getClientReady,
    getServerClientReady,
  );
  const storedEngine = useSyncExternalStore(
    subscribeToSpeechPreference,
    readSpeechEnginePreference,
    getServerSpeechPreference,
  );
  const engine: SpeechEngine = storedEngine ?? "app";
  const hasSavedPreference = storedEngine !== null;
  const [selectedEngine, setSelectedEngine] = useState<SpeechEngine>("app");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [storageWarning, setStorageWarning] = useState("");
  const [confirmClearAudio, setConfirmClearAudio] = useState(false);
  const [cacheMessage, setCacheMessage] = useState("");
  const [cacheMessageIsError, setCacheMessageIsError] = useState(false);
  const dialogOpen = (clientReady && !hasSavedPreference) || settingsOpen;
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const pruneExpired = () => {
      void pruneExpiredSpeechAudioCache().catch(() => {});
    };
    pruneExpired();
    const interval = window.setInterval(pruneExpired, 6 * 60 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (dialogOpen && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLInputElement>("input:checked")?.focus();
      wasOpenRef.current = true;
      return;
    }

    if (!dialogOpen && dialog.open) dialog.close();
    if (!dialogOpen && wasOpenRef.current) {
      wasOpenRef.current = false;
      requestAnimationFrame(() => returnFocusRef.current?.focus());
    }
  }, [dialogOpen]);

  const openVoicePreferences = useCallback(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setSelectedEngine(engine);
    setStorageWarning("");
    setConfirmClearAudio(false);
    setCacheMessage("");
    setSettingsOpen(true);
  }, [engine]);

  const savePreference = useCallback(() => {
    const stored = writeSpeechEnginePreference(undefined, selectedEngine);
    setSettingsOpen(false);
    setStorageWarning(
      stored
        ? ""
        : "Pilihan berlaku selama halaman ini terbuka, tetapi peramban tidak mengizinkan penyimpanan untuk kunjungan berikutnya.",
    );
  }, [selectedEngine]);

  async function removeSavedAudio() {
    setConfirmClearAudio(false);
    try {
      const removed = await clearSpeechAudioCache();
      setCacheMessage(
        removed
          ? `${removed} audio tersimpan berhasil dihapus dari perangkat ini.`
          : "Belum ada audio tersimpan untuk dihapus.",
      );
      setCacheMessageIsError(false);
    } catch {
      setCacheMessage("Cache audio belum dapat dihapus. Coba lagi dari peramban ini.");
      setCacheMessageIsError(true);
    }
  }

  const context = useMemo(
    () => ({ engine, openVoicePreferences }),
    [engine, openVoicePreferences],
  );

  return (
    <VoicePreferencesContext.Provider value={context}>
      {children}
      <dialog
        ref={dialogRef}
        className="voice-preferences-dialog"
        aria-labelledby="voice-preferences-title"
        aria-describedby="voice-preferences-description"
        onCancel={(event) => {
          if (!hasSavedPreference) {
            event.preventDefault();
            return;
          }
          setSelectedEngine(engine);
          setSettingsOpen(false);
        }}
      >
        <div className="voice-preferences-content">
          <div className="voice-preferences-heading">
            <div className="voice-preferences-mark" aria-hidden="true">
              <Volume2 size={23} />
            </div>
            {hasSavedPreference && (
              <button
                type="button"
                className="voice-preferences-close"
                aria-label="Tutup pengaturan suara"
                onClick={() => {
                  setSelectedEngine(engine);
                  setSettingsOpen(false);
                }}
              >
                <X size={19} aria-hidden="true" />
              </button>
            )}
          </div>

          <h2 id="voice-preferences-title">Pilih suara untuk belajar</h2>
          <p id="voice-preferences-description" className="voice-preferences-intro">
            Pilihan ini berlaku di semua halaman. Kamu bisa menggantinya kapan saja dari panel suara.
          </p>

          <fieldset className="voice-preferences-options">
            <legend className="sr-only">Pilih layanan pembaca</legend>
            <label className={`voice-preference-option ${selectedEngine === "app" ? "is-selected" : ""}`}>
              <input
                type="radio"
                name="speech-engine"
                value="app"
                checked={selectedEngine === "app"}
                onChange={() => setSelectedEngine("app")}
              />
              <span className="voice-preference-icon" aria-hidden="true">
                <Headphones size={21} />
              </span>
              <span className="voice-preference-copy">
                <strong>Suara KODMOD</strong>
                <small>Default memakai ElevenLabs melalui server KODMOD; admin perlu mengisi API key dan voice ID.</small>
              </span>
              <span className="voice-preference-choice" aria-hidden="true" />
            </label>

            <label className={`voice-preference-option ${selectedEngine === "device" ? "is-selected" : ""}`}>
              <input
                type="radio"
                name="speech-engine"
                value="device"
                checked={selectedEngine === "device"}
                onChange={() => setSelectedEngine("device")}
              />
              <span className="voice-preference-icon device" aria-hidden="true">
                <Smartphone size={21} />
              </span>
              <span className="voice-preference-copy">
                <strong>Suara bawaan perangkat</strong>
                <small>Memakai pembaca suara dari HP atau peramban, jika tersedia.</small>
              </span>
              <span className="voice-preference-choice" aria-hidden="true" />
            </label>
          </fieldset>

          <div className="voice-preferences-note">
            <strong>Audio KODMOD tersimpan sementara di perangkat</strong>
            <p>
              Maksimal 50 audio atau 64 MB selama 30 hari. Cache menyimpan audio dan kunci hash,
              bukan teks; kamu dapat menghapusnya kapan saja.
            </p>
          </div>

          {confirmClearAudio && (
            <div className="voice-cache-confirm" role="group" aria-label="Konfirmasi hapus cache audio">
              <p>Audio yang tersimpan di perangkat ini akan dihapus. Audio dapat dibuat kembali saat dibutuhkan.</p>
              <div>
                <button type="button" className="button secondary" onClick={() => setConfirmClearAudio(false)}>
                  Batal
                </button>
                <button type="button" className="button danger" onClick={() => void removeSavedAudio()}>
                  Ya, hapus audio
                </button>
              </div>
            </div>
          )}
          {cacheMessage && (
            <p className={`voice-cache-message ${cacheMessageIsError ? "is-error" : ""}`} role="status">
              {cacheMessage}
            </p>
          )}
          {storageWarning && <p className="voice-preferences-warning" role="status">{storageWarning}</p>}

          <div className="voice-preferences-actions">
            {hasSavedPreference && (
              <button type="button" className="button secondary" onClick={() => setConfirmClearAudio(true)}>
                Hapus audio tersimpan
              </button>
            )}
            <button type="button" className="button primary" onClick={savePreference}>
              Gunakan pilihan ini
            </button>
          </div>
        </div>
      </dialog>
    </VoicePreferencesContext.Provider>
  );
}
