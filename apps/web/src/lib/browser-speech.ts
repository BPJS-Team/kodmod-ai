"use client";
import { createSpeechCoordinator, type SpeechRequest } from "./speech-output.mjs";
import { getSpeechAudio } from "./speech-audio-cache";

export const speechOutput = createSpeechCoordinator({
  loadAudio: async (request, signal) => (await getSpeechAudio(request.text, {
    language: request.language, menuKey: request.menuKey, signal,
  })).blob,
  makeAudio(blob, ended, failed) {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = ended;
    audio.onerror = () => failed(new Error("Audio playback failed."));
    return {
      play: () => audio.play(), pause: () => audio.pause(), resume: () => audio.play(),
      stop: () => { audio.onended = null; audio.onerror = null; audio.pause(); }, dispose: () => URL.revokeObjectURL(url),
    };
  },
  speakDevice(request: SpeechRequest, ended, failed) {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined")
      throw new Error("Device speech is unavailable.");
    const synthesis = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(request.text);
    utterance.lang = request.language === "en" ? "en-US" : "id-ID";
    const voices = synthesis.getVoices();
    utterance.voice = voices.find(voice => voice.lang.toLowerCase().startsWith(request.language)) ?? null;
    let rejectStart: ((error: Error) => void) | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const clear = () => { if (timer) clearTimeout(timer); timer = null; };
    return {
      play: () => new Promise<void>((resolve, reject) => {
        rejectStart = reject;
        utterance.onstart = () => { clear(); rejectStart = null; resolve(); };
        utterance.onend = () => { clear(); resolve(); ended(); };
        utterance.onerror = event => { clear(); const error = Object.assign(new Error(event.error),
          { name: event.error === "not-allowed" ? "NotAllowedError" : "SpeechError" });
          reject(error); failed(error); };
        timer = setTimeout(() => { synthesis.cancel(); reject(new Error("Device speech did not start.")); }, 8000);
        synthesis.cancel();
        synthesis.speak(utterance);
      }),
      pause: () => synthesis.pause(), resume: () => synthesis.resume(),
      stop: () => { clear(); utterance.onend = null; utterance.onerror = null;
        rejectStart?.(new DOMException("Cancelled", "AbortError")); synthesis.cancel(); },
      dispose: clear,
    };
  },
});
