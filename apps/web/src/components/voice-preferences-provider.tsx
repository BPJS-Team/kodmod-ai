"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Headphones, Smartphone, Volume2, X, Play, Square, ChevronDown } from "lucide-react";
import { DEFAULT_VOICE_SETTINGS, parseVoiceSettings, readVoiceSettingsSnapshot, writeVoiceSettings,
  type VoiceSettings, type SpeechEngine } from "@/lib/speech-preferences.mjs";
import { clearSpeechAudioCache, pruneExpiredSpeechAudioCache } from "@/lib/speech-audio-cache";
import { speechOutput } from "@/lib/browser-speech";
import { useI18n } from "./language-provider";
import { Switch } from "./ui/switch";

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

export function VoicePreferencesProvider({ children }: { children: ReactNode }) {
  const { language, t, changeLanguage } = useI18n();
  const pathname = usePathname();
  const ready = useSyncExternalStore(readiness, clientReady, serverReady);
  const snapshot = useSyncExternalStore(subscribe, readVoiceSettingsSnapshot, getServerSnapshot);
  const saved = useMemo(() => parseVoiceSettings(snapshot), [snapshot]);
  const preferences = saved ?? DEFAULT_VOICE_SETTINGS;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState<VoiceSettings>(DEFAULT_VOICE_SETTINGS);
  const [warning, setWarning] = useState("");
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [languagePending, setLanguagePending] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  const initialGuidePlayed = useRef(false);
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
    document.documentElement.dataset.lowVision = String(preferences.lowVision);
  }, [preferences.lowVision]);
  useEffect(() => () => speechOutput.stop(), [pathname, language]);

  useEffect(() => {
    if (!ready || opened || !saved || !preferences.menuEnabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let last: Element | null = null, lastAt = 0;
    const narration = (event: Event) => {
      const element = (event.target as HTMLElement)?.closest<HTMLElement>(
        "[data-voice-menu],a,button,summary,input,select,textarea");
      if (!element || element.closest("[data-voice-ignore],.swal2-container") || element.hasAttribute("disabled")) return;
      if (document.querySelector(".voice-panel[data-recording=true]")) return;
      const current = speechOutput.getState();
      if (current.owner && current.owner !== "menu" && ["loading", "playing"].includes(current.status)) return;
      const now = Date.now();
      if (last === element && now - lastAt < 800) return;
      last = element; lastAt = now;
      const fieldKey: Record<string, string> = { username: "username", password: "password", full_name: "full-name", role: "role" };
      const menuKey = element.dataset.voiceMenu ?? fieldKey[element.getAttribute("name") ?? ""];
      const label = element.getAttribute("aria-label")
        ?? (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement
          ? element.labels?.[0]?.textContent : element.textContent);
      const text = label?.trim().slice(0, 300);
      if (!text || (!menuKey && !/^\/(siswa|guru|admin)(\/|$)/.test(pathname))) return;
      clearTimeout(timer);
      timer = setTimeout(() => { void speechOutput.play({ owner: "menu", text,
        engine: preferences.engine, language, menuKey }); }, 150);
    };
    document.addEventListener("focusin", narration);
    document.addEventListener("click", narration);
    return () => { clearTimeout(timer); document.removeEventListener("focusin", narration);
      document.removeEventListener("click", narration); speechOutput.stop("menu"); };
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

  async function clearAudio() {
    setClearing(true); speechOutput.stop();
    try { await clearSpeechAudioCache(); setWarning("Suara tersimpan sudah dihapus."); }
    catch { setWarning("Audio belum dapat dibuat. Coba lagi."); }
    finally { setClearing(false); setConfirmClear(false); }
  }

  return <VoicePreferencesContext.Provider value={value}>
    {children}
    {warning && !opened && <div className="global-voice-notice" role="status">{t(warning)}</div>}
    <dialog ref={dialog} className="voice-preferences-dialog" aria-labelledby="voice-preferences-title"
      aria-describedby="voice-preferences-description" data-voice-ignore="true"
      onCancel={event => { if (!saved) { event.preventDefault(); save(); } else setSettingsOpen(false); }}>
      <div className="voice-preferences-content">
        <div className="voice-preferences-heading">
          <span className="voice-preferences-mark" aria-hidden="true"><Volume2 size={23} /></span>
          {saved && <button className="voice-preferences-close" aria-label={t("Tutup")} onClick={() => setSettingsOpen(false)}><X size={21} /></button>}
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
            <select id="voice-language" value={language} disabled={languagePending} onChange={async event => {
              setLanguagePending(true); speechOutput.stop();
              try { await changeLanguage(event.target.value as "id" | "en"); setWarning(""); }
              catch { setWarning("Bahasa belum dapat disimpan. Coba lagi."); } finally { setLanguagePending(false); }
            }}><option value="id">Bahasa Indonesia</option><option value="en">English</option></select></div>
        </div>
        <details className="voice-extra-settings"><summary>{language === "en" ? "Display and navigation" : "Tampilan dan navigasi"}<ChevronDown size={17} aria-hidden="true" /></summary>
          <div className="voice-setting-row"><label htmlFor="voice-low-vision"><strong>{language === "en" ? "Larger, clearer text" : "Teks lebih besar dan jelas"}</strong></label>
            <Switch id="voice-low-vision" checked={draft.lowVision} onCheckedChange={lowVision => setDraft({ ...draft, lowVision })} /></div>
          <div className="voice-setting-row"><label htmlFor="voice-guided"><strong>{language === "en" ? "Swipe between controls" : "Geser untuk berpindah menu"}</strong>
            <small>{language === "en" ? "Swipe left or right to move focus." : "Geser kiri atau kanan untuk memindahkan fokus."}</small></label>
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
        <div className="voice-preferences-actions"><button type="button" className="button primary" onClick={save} disabled={languagePending}>{t(saved ? "Simpan pengaturan" : "Gunakan pilihan ini")}</button></div>
      </div>
    </dialog>
  </VoicePreferencesContext.Provider>;
}
