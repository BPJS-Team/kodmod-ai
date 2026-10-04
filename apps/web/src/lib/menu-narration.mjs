const targets = "[data-voice-menu],a,button,summary,input,select,textarea";
const fieldKeys = { username: "username", password: "password", full_name: "full-name", role: "role" };

export function attachMenuNarration({ document, speech, language, engine, pathname }) {
  let last = null, lastAt = 0;
  const closestMenu = node => node?.closest?.(targets) ?? node?.parentElement?.closest?.(targets);
  const canPlay = () => !document.querySelector(".voice-panel[data-recording=true],dialog[open],.swal2-container");
  function narrate(event, hover = false) {
    if (hover && event.pointerType === "touch") return;
    const element = closestMenu(event.target);
    if (hover && element?.contains(event.relatedTarget)) return;
    if (!element || element.closest("[data-voice-ignore],.swal2-container,[aria-hidden=true]")
      || element.matches(":disabled,[aria-disabled=true]") || !canPlay()) {
      speech.cancelQueuedMenu(); return;
    }
    const current = speech.getState();
    if (current.owner && current.owner !== "menu" && ["loading", "playing", "paused"].includes(current.status)) {
      speech.cancelQueuedMenu(); return;
    }
    const now = Date.now();
    if (last === element && now - lastAt < 800) return;
    const menuKey = element.dataset.voiceMenu ?? fieldKeys[element.getAttribute("name") ?? ""];
    // Only labels are narrated. User-entered values never become speech requests.
    const label = element.getAttribute("aria-label") ?? element.labels?.[0]?.textContent ?? element.textContent;
    const text = label?.trim().slice(0, 300);
    if (!text || (!menuKey && !/^\/(siswa|guru|admin)(\/|$)/.test(pathname))) {
      speech.cancelQueuedMenu(); return;
    }
    last = element; lastAt = now;
    speech.queueMenu({ owner: "menu", text, engine, language, menuKey }, canPlay, hover ? 300 : 150);
  }
  const focus = event => narrate(event);
  const hover = event => narrate(event, true);
  const leave = event => {
    const element = closestMenu(event.target);
    if (!element || element.contains(event.relatedTarget)) return;
    if (last === element) { speech.cancelQueuedMenu(); last = null; }
  };
  document.addEventListener("focusin", focus);
  document.addEventListener("click", focus);
  document.addEventListener("pointerover", hover);
  document.addEventListener("pointerout", leave);
  return () => {
    document.removeEventListener("focusin", focus);
    document.removeEventListener("click", focus);
    document.removeEventListener("pointerover", hover);
    document.removeEventListener("pointerout", leave);
    speech.stop("menu");
  };
}

export function announceLanguageChange(speech, language, { engine, enabled, recording = false }) {
  if (!enabled || recording || !["id", "en"].includes(language)) return Promise.resolve();
  return speech.play({ owner: "language", engine, language, menuKey: "language-changed",
    text: language === "en" ? "Language changed to English." : "Bahasa telah berubah ke Bahasa Indonesia." });
}
