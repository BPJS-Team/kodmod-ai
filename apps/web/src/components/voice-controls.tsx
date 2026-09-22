"use client";

import { useEffect, useRef, useState } from "react";
import { Headphones, Mic, Pause, Play, Settings2, Square, Volume2 } from "lucide-react";
import { getSpeechAudio } from "@/lib/speech-audio-cache";
import { useVoicePreferences } from "@/components/voice-preferences-provider";

type VoiceStatus =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "recording"
  | "transcribing"
  | "error";

function errorMessage(response: Response, fallback: string) {
  return response
    .json()
    .then((body) => (typeof body?.message === "string" ? body.message : fallback))
    .catch(() => fallback);
}

function withTextFallback(message: string) {
  return `${message} Kamu tetap bisa menggunakan jalur teks.`;
}

export function VoiceControls({
  text,
  onTranscript,
}: {
  text: string;
  onTranscript?: (transcript: string) => void;
}) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [message, setMessage] = useState("Siap membantu membacakan atau menuliskan jawabanmu.");
  const [transcript, setTranscript] = useState("");
  const { engine, openVoicePreferences } = useVoicePreferences();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const releaseAudio = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const stopDeviceSpeech = () => {
    if (!utteranceRef.current) return;
    utteranceRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  useEffect(() => {
    return () => {
      releaseAudio();
      stopDeviceSpeech();
      stopRecording();
    };
  }, []);

  async function listen() {
    if (!text.trim()) return;
    if (status === "playing" && engine === "device" && utteranceRef.current) {
      window.speechSynthesis.pause();
      setStatus("paused");
      setMessage("Pembacaan dijeda. Tekan Putar lagi untuk melanjutkan.");
      return;
    }
    if (status === "paused" && engine === "device" && utteranceRef.current) {
      window.speechSynthesis.resume();
      setStatus("playing");
      setMessage("Sedang membacakan materi dari perangkat.");
      return;
    }
    if (status === "playing" && audioRef.current) {
      audioRef.current.pause();
      setStatus("paused");
      setMessage("Pembacaan dijeda. Tekan Putar lagi untuk melanjutkan.");
      return;
    }
    if (status === "paused" && audioRef.current) {
      await audioRef.current.play();
      setStatus("playing");
      setMessage("Sedang membacakan materi.");
      return;
    }

    stopDeviceSpeech();
    stopRecording();
    releaseAudio();
    setStatus("loading");
    setMessage(engine === "device" ? "Memulai suara perangkat…" : "Menyiapkan audio…");

    if (engine === "device") {
      const supportsDeviceSpeech =
        "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
      if (supportsDeviceSpeech) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text.trim());
          utterance.lang = "id-ID";
          utterance.onstart = () => {
            if (utteranceRef.current !== utterance) return;
            setStatus("playing");
            setMessage("Sedang membacakan materi dengan suara perangkat.");
          };
          utterance.onend = () => {
            if (utteranceRef.current !== utterance) return;
            utteranceRef.current = null;
            setStatus("idle");
            setMessage("Pembacaan selesai.");
          };
          utterance.onerror = (event) => {
            if (utteranceRef.current !== utterance) return;
            utteranceRef.current = null;
            if (event.error === "canceled" || event.error === "interrupted") return;
            setMessage("Suara perangkat tidak tersedia. Menyiapkan suara KODMOD.");
            void playAppSpeech();
          };
          utteranceRef.current = utterance;
          window.speechSynthesis.speak(utterance);
          return;
        } catch {
          setMessage("Suara perangkat tidak tersedia. Menyiapkan suara KODMOD.");
        }
      } else {
        setMessage("Peramban ini tidak menyediakan suara perangkat. Menyiapkan suara KODMOD.");
      }
    }

    await playAppSpeech();
  }

  async function playAppSpeech() {
    try {
      const result = await getSpeechAudio(text);
      const url = URL.createObjectURL(result.blob);
      const audio = new Audio(url);
      objectUrlRef.current = url;
      audioRef.current = audio;
      audio.onended = () => {
        setStatus("idle");
        setMessage("Pembacaan selesai.");
      };
      audio.onpause = () => {
        if (!audio.ended) setStatus("paused");
      };
      await audio.play();
      setStatus("playing");
      setMessage(
        result.cached
          ? "Memutar audio tersimpan di perangkat ini."
          : "Sedang membacakan materi.",
      );
    } catch (error) {
      releaseAudio();
      setStatus("error");
      setMessage(
        withTextFallback(error instanceof Error ? error.message : "Audio belum dapat dibuat. Coba lagi."),
      );
    }
  }

  async function record() {
    if (status === "recording") {
      stopRecording();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatus("error");
      setMessage("Peramban ini belum mendukung rekaman suara. Gunakan kolom jawaban teks.");
      return;
    }

    releaseAudio();
    setTranscript("");
    setMessage("Izinkan mikrofon jika ingin menjawab dengan suara.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((value) =>
        MediaRecorder.isTypeSupported(value),
      );
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (!blob.size) {
          setStatus("error");
          setMessage("Rekaman kosong. Coba tekan rekam lalu bicara lebih dekat ke mikrofon.");
          return;
        }
        setStatus("transcribing");
        setMessage("Membaca jawabanmu…");
        const form = new FormData();
        form.append("audio", blob, "jawaban.webm");
        try {
          const response = await fetch("/api/voice/stt", { method: "POST", body: form });
          if (!response.ok) {
            throw new Error(await errorMessage(response, "Suara belum dapat dibaca."));
          }
          const body = (await response.json()) as { text?: string };
          const nextTranscript = body.text?.trim() ?? "";
          setTranscript(nextTranscript);
          onTranscript?.(nextTranscript);
          setStatus("idle");
          setMessage(
            nextTranscript
              ? "Tinjau teks jawabanmu sebelum mengirimkannya."
              : "Belum ada kata yang terbaca. Coba rekam ulang.",
          );
        } catch (error) {
          setStatus("error");
          setMessage(
            withTextFallback(error instanceof Error ? error.message : "Suara belum dapat dibaca."),
          );
        }
      };
      recorder.start();
      setStatus("recording");
      setMessage("Sedang merekam. Tekan Berhenti setelah selesai berbicara.");
    } catch {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStatus("error");
      setMessage("Mikrofon tidak dapat digunakan. Kamu tetap bisa menjawab lewat teks.");
    }
  }

  const listening = status === "loading" || status === "playing" || status === "paused";
  const recording = status === "recording" || status === "transcribing";

  return (
    <section className="voice-panel" aria-label="Bantuan suara">
      <div className="voice-panel-heading">
        <div>
          <span className="voice-kicker">
            <Volume2 size={15} aria-hidden="true" />
            Akses suara
          </span>
          <h2>Dengarkan atau jawab dengan suara</h2>
          <p>Kontrol tetap manual. Tidak ada audio yang diputar atau dikirim tanpa tindakanmu.</p>
          <span className="voice-engine-indicator">
            {engine === "app" ? "Suara KODMOD" : "Suara bawaan perangkat"}
          </span>
        </div>
        <Headphones className="voice-panel-icon" size={30} aria-hidden="true" />
      </div>
      <div className="voice-actions">
        <button
          type="button"
          className="button primary"
          onClick={listen}
          disabled={recording || status === "loading"}
          aria-pressed={status === "playing"}
        >
          {status === "playing" ? <Pause size={18} aria-hidden="true" /> : status === "paused" ? <Play size={18} aria-hidden="true" /> : <Headphones size={18} aria-hidden="true" />}
          {status === "loading" ? "Menyiapkan…" : status === "playing" ? "Jeda" : status === "paused" ? "Putar lagi" : "Dengarkan"}
        </button>
        {onTranscript && (
          <button
            type="button"
            className={`button ${status === "recording" ? "danger" : "secondary"}`}
            onClick={record}
            disabled={listening || recording}
            aria-pressed={status === "recording"}
          >
            {status === "recording" ? <Square size={18} aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />}
            {status === "recording" ? "Berhenti" : status === "transcribing" ? "Membaca…" : "Jawab dengan suara"}
          </button>
        )}
        <button
          type="button"
          className="button secondary voice-settings-action"
          onClick={openVoicePreferences}
        >
          <Settings2 size={18} aria-hidden="true" />
          Pengaturan suara
        </button>
      </div>
      <p className={`voice-status ${status === "error" ? "voice-status-error" : ""}`} role="status" aria-live="polite">
        {message}
      </p>
      {transcript && (
        <div className="voice-transcript">
          <strong>Hasil rekaman</strong>
          <p>{transcript}</p>
          <small>Periksa kembali hasil ini sebelum digunakan sebagai jawaban.</small>
        </div>
      )}
    </section>
  );
}
