"""
KODMOD AI - Speech-to-Text Pipeline
====================================

LangGraph entry node. Reads `state["audio_input_path"]` (a private local file
or trusted HTTP URI containing the inbound audio chunk) and returns transcribed text plus a
detected language code.

Backends
--------
* `faster-whisper` - default for self-hosted, low-latency, on-prem deployments.
* `openai-whisper-1` - managed fallback when KODMOD_STT_BACKEND=openai.
* `deepgram` - live streaming transcription for the WebSocket path.

Streaming
---------
For partial transcripts during live voice input, see
`voice/streaming.py::StreamingSTT` which emits incremental results to the
WebSocket independently of the LangGraph turn boundary.
"""

from __future__ import annotations

import asyncio
import logging
import mimetypes
from functools import lru_cache
from pathlib import Path
from typing import Any

from config.settings import settings
from graphs.state import KODMODState
from voice import elevenlabs

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------


@lru_cache(maxsize=1)
def _faster_whisper_model():
    from faster_whisper import WhisperModel

    size = settings.STT_MODEL
    device = settings.STT_DEVICE
    if device == "auto":
        try:
            import torch  # type: ignore

            device = "cuda" if torch.cuda.is_available() else "cpu"
        except ImportError:
            device = "cpu"
    compute = settings.STT_COMPUTE_TYPE
    log.info("Loading faster-whisper %s on %s/%s", size, device, compute)
    return WhisperModel(size, device=device, compute_type=compute)


# ---------------------------------------------------------------------------
# LangGraph node
# ---------------------------------------------------------------------------


async def stt_node(state: KODMODState) -> dict[str, Any]:
    """Transcribe state['audio_input_path'] to state['transcribed_text']."""
    path = state.get("audio_input_path", "")
    if not path:
        # Allow text-only invocation (e.g. teacher dashboard chat)
        text = state.get("user_input", "")
        return {
            "transcribed_text": text,
            "detected_language": state.get("detected_language", "id"),
            "next_action": "route_intent",
            "last_node": "stt",
        }

    text, lang = await _transcribe_path(path, language=state.get("detected_language"))

    log.info("STT: %d chars (lang=%s)", len(text), lang)
    return {
        "transcribed_text": text,
        "detected_language": lang,
        "next_action": "route_intent",
        "last_node": "stt",
    }


# ---------------------------------------------------------------------------
# Backend implementations
# ---------------------------------------------------------------------------


async def _fw_stt(path: str) -> tuple[str, str]:
    model = _faster_whisper_model()

    def _run() -> tuple[str, str]:
        local_path = path
        segments, info = model.transcribe(
            local_path,
            beam_size=5,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 400},
        )
        text = " ".join(s.text.strip() for s in segments).strip()
        return text, info.language

    return await asyncio.get_running_loop().run_in_executor(None, _run)


async def _openai_stt(path: str) -> tuple[str, str]:
    from openai import AsyncOpenAI

    client = AsyncOpenAI()
    local_path = path
    with open(local_path, "rb") as f:
        result = await client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            response_format="verbose_json",
        )
    return result.text, result.language


async def _deepgram_stt(path: str) -> tuple[str, str]:
    """Used mostly via the streaming path, but also exposed here for batch."""
    from deepgram import DeepgramClient, PrerecordedOptions

    dg = DeepgramClient(settings.DEEPGRAM_API_KEY)
    local_path = path
    with open(local_path, "rb") as f:
        payload = {"buffer": f.read()}
    options = PrerecordedOptions(
        model="nova-2",
        language="multi",
        smart_format=True,
        punctuate=True,
    )
    resp = await dg.listen.asyncrest.v("1").transcribe_file(payload, options)
    transcript = resp["results"]["channels"][0]["alternatives"][0]["transcript"]
    detected = resp["results"]["channels"][0]["detected_language"]
    return transcript, detected


async def _elevenlabs_stt(path: str, *, language: str | None = None) -> tuple[str, str]:
    """Transcribe a local audio file through ElevenLabs Scribe."""
    local_path = path
    file_path = Path(local_path)
    result = await elevenlabs.transcribe(
        file_path.read_bytes(),
        filename=file_path.name,
        content_type=mimetypes.guess_type(file_path.name)[0] or "application/octet-stream",
        language=language or settings.STT_LANGUAGE,
    )
    return result["text"], result.get("language_code") or language or settings.STT_LANGUAGE


# ---------------------------------------------------------------------------
# I/O helpers
# ---------------------------------------------------------------------------


async def _transcribe_path(path: str, *, language: str | None = None) -> tuple[str, str]:
    if path.startswith(("http://", "https://")):
        import tempfile

        from voice.streaming import fetch_audio

        data = await fetch_audio(path)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as audio:
            audio.write(data)
            temporary = Path(audio.name)
        try:
            return await _transcribe_path(str(temporary), language=language)
        finally:
            temporary.unlink(missing_ok=True)
    if path.startswith(("s3://", "minio://")):
        raise ValueError("Resolve object storage to a private local file before transcription")
    backend = settings.STT_BACKEND
    if backend == "faster-whisper":
        return await _fw_stt(path)
    if backend in {"openai", "openai-whisper"}:
        return await _openai_stt(path)
    if backend == "deepgram":
        return await _deepgram_stt(path)
    if backend == "elevenlabs":
        return await _elevenlabs_stt(path, language=language)
    raise ValueError(f"Unknown STT_BACKEND: {backend}")


async def transcribe_path(path: str | Path, *, language: str | None = None) -> str:
    """Transcribe local or HTTP audio; remote temporary files never outlive the call."""
    text, _ = await _transcribe_path(str(path), language=language)
    return text


async def transcribe_bytes(audio_bytes: bytes, *, language: str | None = None) -> str:
    """
    Transcribe in-memory audio bytes. Writes to a temp file for backends
    that need a path; for faster-whisper we go straight through the model.
    """
    import tempfile

    suffix = ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
        f.write(audio_bytes)
        tmp_path = f.name
    try:
        return await transcribe_path(tmp_path, language=language)
    finally:
        try:
            Path(tmp_path).unlink(missing_ok=True)
        except OSError:
            pass
