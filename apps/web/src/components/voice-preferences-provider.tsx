"use client";
import { NativeSelect } from "@/components/ui/native-select";


import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Headphones, Smartphone, Volume2, X, Play, Square, ChevronDown } from "lucide-react";
import { DEFAULT_VOICE_SETTINGS, parseVoiceSettings, readVoiceSettingsSnapshot, writeVoiceSettings,
  parseDisplaySettings, type DisplaySettings, type VoiceSettings, type SpeechEngine } from "@/lib/speech-preferences.mjs";
import { clearSpeechAudioCache, pruneExpiredSpeechAudioCache } from "@/lib/speech-audio-cache";
import { speechOutput } from "@/lib/browser-speech";
import { attachMenuNarration, announceLanguageChange } from "@/lib/menu-narration.mjs";
import type { Language } from "@/lib/i18n.mjs";
import { useI18n } from "./language-provider";
import { Switch } from "./ui/switch";
import { Dialog } from "./ui/dialog";

type Preferences = VoiceSettings & { openVoicePreferences: () => void; toggleMenu: () => void };
const VoicePreferencesContext = createContext<Preferences | null>(null);
const getServerSnapshot = () => null;
const subscribe = (listener: () => void) => {
  window.addEventListener("storage", listener);
  window.addEventListener("kodmod:speech-engine-change", listener);
  return () => { window.removeEventListener("storage", listener);
    window.removeEventListener("kodmod:speech-engine-change", listener); };
};
const clientReady = () => true;
const serverReady = () => false;
const readiness = () => () => {};
const guide = {
  id: "Selamat datang di KODMOD. Pilih suara KODMOD atau suara perangkat. Tekan contoh suara untuk mendengarkan. Pembaca menu dapat dimatikan. Suara Tutor tetap aktif saat belajar.",
  en: "Welcome to KODMOD. Choose the KODMOD voice or your device voice. Press preview to listen. You can turn menu reading off. Your Tutor still speaks while you learn.",
};
const sample = {
  id: "Halo, ini suara KODMOD. Saya akan menemanimu belajar, satu langkah demi satu langkah.",
  en: "Hello, this is the KODMOD voice. I will help you learn, one step at a time.",
};

export function useVoicePreferences() {
  const value = useContext(VoicePreferencesContext);
  if (!value) throw new Error("VoicePreferencesProvider is required.");
  return value;
}

export function VoicePreferencesProvider({ children, initialDisplay = parseDisplaySettings() }: { children: ReactNode; initialDisplay?: DisplaySettings }) {
  const { language, t, changeLanguage } = useI18n();
  const pathname = usePathname();
  const ready = useSyncExternalStore(readiness, clientReady, serverReady);
  const snapshot = useSyncExternalStore(subscribe, readVoiceSettingsSnapshot, getServerSnapshot);
  const saved = useMemo(() => parseVoiceSettings(snapshot), [snapshot]);
  const preferences = useMemo(() => saved ?? { ...DEFAULT_VOICE_SETTINGS, ...initialDisplay }, [saved, initialDisplay]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState<VoiceSettings>({ ...DEFAULT_VOICE_SETTINGS, ...initialDisplay });
  const [warning, setWarning] = useState("");
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [languagePending, setLanguagePending] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  const initialGuidePlayed = useRef(false);
  const pendingLanguage = useRef<Language | null>(null);
  const opened = ready && (!saved || settingsOpen);
  const output = useSyncExternalStore(speechOutput.subscribe, speechOutput.getState, speechOutput.getState);
  const previewActive = output.owner === "voice-setup";

  const openVoicePreferences = useCallback(() => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDraft(preferences); setWarning(""); setConfirmClear(false); setSettingsOpen(true);
  }, [preferences]);
  const toggleMenu = useCallback(() => {
    const value = { ...preferences, menuEnabled: !preferences.menuEnabled };
    if (!value.menuEnabled) speechOutput.stop("menu");
    if (!writeVoiceSettings(value)) setWarning("Pengaturan belum tersimpan di perangkat. Pilihan tetap berlaku selama halaman ini terbuka.");
  }, [preferences]);
  const value = useMemo(() => ({ ...preferences, openVoicePreferences, toggleMenu }),
    [preferences, openVoicePreferences, toggleMenu]);

  const preview = useCallback((engine: SpeechEngine, welcome = false) => {
    return speechOutput.play({ owner: "voice-setup", text: welcome ? guide[language] : sample[language],
      engine, language, menuKey: welcome ? "welcome" : "preview" });
  }, [language]);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (opened && !element.open) {
      if (!returnFocus.current) returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      element.showModal(); wasOpen.current = true;
      element.querySelector<HTMLButtonElement>("[data-guide-button]")?.focus();
      if (!saved && !initialGuidePlayed.current) {
        initialGuidePlayed.current = true;
        void preview("app", true);
      }
    } else if (!opened && element.open) {
      element.close(); speechOutput.stop("voice-setup");
      if (wasOpen.current) returnFocus.current?.focus();
      returnFocus.current = null; wasOpen.current = false;
    }
  }, [opened, saved, preview]);

  useEffect(() => {
    void pruneExpiredSpeechAudioCache().catch(() => {});
    const interval = setInterval(() => void pruneExpiredSpeechAudioCache().catch(() => {}), 6 * 3600000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const display = opened ? draft : preferences;
    const root = document.documentElement;
    root.dataset.lowVision = String(display.lowVision);
    root.dataset.textSize = display.fontScale;
    root.dataset.highContrast = String(display.highContrast);
    root.dataset.spacious = String(display.spacious);
    root.dataset.reducedMotion = String(display.reducedMotion);
  }, [opened, draft, preferences]);
  useEffect(() => () => speechOutput.stop(), [pathname, language]);

  useEffect(() => {
    const changed = (event: Event) => {
      const next = (event as CustomEvent<{ language: Language }>).detail?.language;
      if (next === "id" || next === "en") pendingLanguage.current = next;
    };
    window.addEventListener("kodmod:language-change", changed);
    return () => window.removeEventListener("kodmod:language-change", changed);
  }, []);

  useEffect(() => {
    if (pendingLanguage.current !== language) return;
    pendingLanguage.current = null;
    // Runs after the previous language's audio cleanup, so the confirmation survives.
    void announceLanguageChange(speechOutput, language, { engine: opened ? draft.engine : preferences.engine,
      enabled: opened ? draft.menuEnabled : preferences.menuEnabled,
      recording: Boolean(document.querySelector(".voice-panel[data-recording=true]")) });
  }, [language, opened, draft.engine, draft.menuEnabled, preferences.engine, preferences.menuEnabled]);

  useEffect(() => {
    if (!ready || opened || !saved || !preferences.menuEnabled) return;
    return attachMenuNarration({ document, speech: speechOutput, language, engine: preferences.engine, pathname });
  }, [ready, opened, saved, preferences.menuEnabled, preferences.engine, pathname, language]);

  useEffect(() => {
    if (!preferences.guidedNavigation) return;
    let start: { x: number; y: number } | null = null;
    const begin = (event: TouchEvent) => { start = event.touches.length === 1
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null; };
    const finish = (event: TouchEvent) => {
      if (!start || event.changedTouches.length !== 1) return;
      const dx = event.changedTouches[0].clientX - start.x;
      const dy = event.changedTouches[0].clientY - start.y; start = null;
      if (Math.abs(dx) < 70 || Math.abs(dy) > 40) return;
      if ((event.target as HTMLElement).closest("input,textarea,select,[role=slider]")) return;
      const scope = dialog.current?.open ? dialog.current : document;
      const targets = [...scope.querySelectorAll<HTMLElement>("a,button,input,select,textarea,summary,[tabindex='0']")]
        .filter(element => !element.hasAttribute("disabled") && element.getClientRects().length > 0 && element.tabIndex >= 0);
      if (!targets.length) return;
      const index = targets.indexOf(document.activeElement as HTMLElement);
      targets[Math.max(0, Math.min(targets.length - 1, index + (dx < 0 ? 1 : -1)))]?.focus();
    };
    document.addEventListener("touchstart", begin, { passive: true });
    document.addEventListener("touchend", finish, { passive: true });
    return () => { document.removeEventListener("touchstart", begin); document.removeEventListener("touchend", finish); };
  }, [preferences.guidedNavigation]);

  function save() {
    speechOutput.stop("voice-setup");
    setWarning(writeVoiceSettings(draft) ? "" : "Pengaturan belum tersimpan di perangkat. Pilihan tetap berlaku selama halaman ini terbuka.");
    setSettingsOpen(false);
  }

  function closeSettings() {
    speechOutput.stop("voice-setup");
    setSettingsOpen(false);
  }

  async function clearAudio() {
    setClearing(true); speechOutput.stop();
    try { await clearSpeechAudioCache(); setWarning("Suara tersimpan sudah dihapus."); }
    catch { setWarning("Audio belum dapat dibuat. Coba lagi."); }
    finally { setClearing(false); setConfirmClear(false); }
  }

  return <VoicePreferencesContext.Provider value={value}>
    {children}
    {warning && !opened && <div className="global-voice-notice" role="status">{t(warning)}</div>}
    <Dialog ref={dialog} className="voice-preferences-dialog" aria-labelledby="voice-preferences-title"
      aria-describedby="voice-preferences-description" data-voice-ignore="true"
      onCancel={event => { event.preventDefault(); if (!saved) save(); else closeSettings(); }}>
      <div className="voice-preferences-content">
        <div className="voice-preferences-heading">
          <span className="voice-preferences-mark" aria-hidden="true"><Volume2 size={23} /></span>
          {saved && <button className="voice-preferences-close" aria-label={t("Tutup")} onClick={closeSettings}><X size={21} /></button>}
        </div>
        <h2 id="voice-preferences-title">{t(saved ? "Pengaturan suara" : "Pilih suara untuk belajar")}</h2>
        <p id="voice-preferences-description" className="voice-preferences-intro">{t("Dengarkan contoh, lalu pilih suara yang nyaman untukmu.")}</p>
        <button type="button" className="voice-guide-button" data-guide-button onClick={() => void preview(draft.engine, true)}>
          <Play size={17} aria-hidden="true" />{t("Dengarkan panduan")}
        </button>
        <fieldset className="voice-preferences-options">
          <legend className="sr-only">{t("Pilih suara untuk belajar")}</legend>
          {(["app", "device"] as SpeechEngine[]).map(engine => <div key={engine} className={`voice-choice-row ${draft.engine === engine ? "is-selected" : ""}`}>
            <label className="voice-preference-option">
              <input type="radio" name="speech-engine" value={engine} checked={draft.engine === engine}
                onChange={() => { setDraft({ ...draft, engine }); void preview(engine); }} />
              <span className="voice-preference-icon" aria-hidden="true">{engine === "app" ? <Headphones size={21} /> : <Smartphone size={21} />}</span>
              <span className="voice-preference-copy"><strong>{t(engine === "app" ? "Suara KODMOD" : "Suara perangkat")}</strong>
                <small>{t(engine === "app" ? "Suara yang jernih untuk menemani belajar." : "Gunakan suara yang tersedia di HP atau komputermu.")}</small></span>
              <span className="voice-preference-choice" aria-hidden="true" />
            </label>
            <button type="button" className="voice-preview-button" aria-label={`${t("Dengarkan contoh suara")} ${t(engine === "app" ? "Suara KODMOD" : "Suara perangkat")}`}
              onClick={() => void preview(engine)}><Play size={16} aria-hidden="true" />{t("Dengarkan")}</button>
          </div>)}
        </fieldset>
        <div className="voice-options-settings">
          <div className="voice-setting-row"><label htmlFor="menu-reader"><strong>{t("Pembaca menu")}</strong>
            <small>{t("Bacakan menu saat dipilih atau mendapat fokus.")}</small></label>
            <Switch id="menu-reader" checked={draft.menuEnabled} onCheckedChange={menuEnabled => setDraft({ ...draft, menuEnabled })} /></div>
          <div className="voice-setting-row"><label htmlFor="tutor-reader"><strong>{t("Suara Tutor")}</strong>
            <small>{t("Bacakan jawaban baru saat belajar.")}</small></label>
            <Switch id="tutor-reader" checked={draft.tutorEnabled} onCheckedChange={tutorEnabled => setDraft({ ...draft, tutorEnabled })} /></div>
          <div className="voice-setting-row"><label htmlFor="voice-language"><strong>{t("Bahasa")}</strong></label>
            <NativeSelect id="voice-language" value={language} disabled={languagePending} onChange={async event => {
              setLanguagePending(true); speechOutput.stop();
              try { await changeLanguage(event.target.value as "id" | "en"); setWarning(""); }
              catch { setWarning("Bahasa belum dapat disimpan. Coba lagi."); } finally { setLanguagePending(false); }
            }}><option value="id">Bahasa Indonesia</option><option value="en">English</option></NativeSelect></div>
        </div>
        <details className="voice-extra-settings"><summary>{t("Tampilan dan navigasi")}<ChevronDown size={17} aria-hidden="true" /></summary>
          <div className="voice-setting-row"><label htmlFor="voice-text-size"><strong>{t("Ukuran teks")}</strong></label>
            <NativeSelect id="voice-text-size" value={draft.fontScale} onChange={event => setDraft({ ...draft, fontScale: event.target.value as VoiceSettings["fontScale"], lowVision: event.target.value !== "default" })}>
              <option value="default">{t("Standar")}</option><option value="large">{t("Besar")}</option><option value="extra-large">{t("Sangat besar")}</option></NativeSelect></div>
          <div className="voice-setting-row"><label htmlFor="voice-contrast"><strong>{t("Kontras tinggi")}</strong></label><Switch id="voice-contrast" checked={draft.highContrast} onCheckedChange={highContrast => setDraft({ ...draft, highContrast })} /></div>
          <div className="voice-setting-row"><label htmlFor="voice-spacing"><strong>{t("Jarak bacaan lebih lega")}</strong></label><Switch id="voice-spacing" checked={draft.spacious} onCheckedChange={spacious => setDraft({ ...draft, spacious })} /></div>
          <div className="voice-setting-row"><label htmlFor="voice-motion"><strong>{t("Kurangi animasi")}</strong></label><Switch id="voice-motion" checked={draft.reducedMotion} onCheckedChange={reducedMotion => setDraft({ ...draft, reducedMotion })} /></div>
          <div className="voice-setting-row"><label htmlFor="voice-guided"><strong>{t("Geser untuk berpindah menu")}</strong>
            <small>{t("Geser kiri atau kanan untuk memindahkan fokus.")}</small></label>
            <Switch id="voice-guided" checked={draft.guidedNavigation} onCheckedChange={guidedNavigation => setDraft({ ...draft, guidedNavigation })} /></div>
        </details>
        {(previewActive && output.status !== "idle") && <div className="voice-preview-status" role="status">
          <span>{t(output.message || (output.status === "loading" ? "Menyiapkan…" : output.status === "playing" ? "Sedang membacakan." : "Pembacaan dijeda."))}</span>
          <button type="button" className="icon-button" aria-label={t("Hentikan suara")} onClick={() => speechOutput.stop("voice-setup")}><Square size={15} aria-hidden="true" /></button>
        </div>}
        {saved && <div className="voice-cache-actions">
          {!confirmClear ? <button type="button" className="text-link" onClick={() => setConfirmClear(true)}>{t("Hapus suara tersimpan")}</button>
            : <div className="voice-cache-confirm"><p>{t("Hapus suara tersimpan?")}</p><p>{t("Audio akan tersedia kembali saat kamu mendengarkan.")}</p>
              <button type="button" className="button secondary" onClick={() => setConfirmClear(false)}>{t("Batal")}</button>
              <button type="button" className="button danger" disabled={clearing} onClick={() => void clearAudio()}>{t("Ya, hapus")}</button></div>}
        </div>}
        {warning && <p className="voice-preferences-warning" role="status">{t(warning)}</p>}
      </div>
      <div className="voice-preferences-actions"><button type="button" className="button primary" onClick={save} disabled={languagePending}>{t(saved ? "Simpan pengaturan" : "Gunakan pilihan ini")}</button></div>
    </Dialog>
  </VoicePreferencesContext.Provider>;
}
