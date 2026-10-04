"""Authenticated voice REST routes.

The browser talks to these endpoints through the Next.js server proxy. The
ElevenLabs key is read only by the API and audio is returned as bytes, so it
never enters a client bundle or a JSON response.
"""

from __future__ import annotations

import logging
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from api.chat_service import (
    log_turn,
    prepare_chat_turn,
    reply_text,
    resolve_chat_context,
    sources,
    update_session_mode,
)
from api.dependencies import current_user, db_session, require_student
from config.settings import settings
from database.models import User
from voice import elevenlabs
from voice.audio_cache import SpeechBudgetExceededError, profile_id
from voice.menu_catalog import MENU_AUDIO
from voice.streaming import save_upload
from voice.stt import transcribe_path
from voice.tts import synthesise_bytes

log = logging.getLogger(__name__)
router = APIRouter(tags=["voice"])


class VoiceTTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5_000)
    language: Literal["id", "en"] | None = None


class VoiceSTTResponse(BaseModel):
    text: str
    language_code: str


def _provider_error(exc: Exception, *, operation: str) -> HTTPException:
    if isinstance(exc, elevenlabs.ElevenLabsConfigurationError):
        return HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            f"{operation} suara belum dikonfigurasi.",
        )
    if isinstance(exc, elevenlabs.ElevenLabsError):
        log.warning(
            "ElevenLabs %s failed (status=%s, request_id=%s)",
            operation,
            exc.status_code,
            exc.request_id,
        )
        return HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            f"Layanan {operation} suara sedang bermasalah. Coba lagi.",
        )
    return HTTPException(
        status.HTTP_502_BAD_GATEWAY,
        f"Gagal memproses {operation} suara. Coba lagi.",
    )


@router.get("/profile")
async def voice_profile() -> dict:
    return {"profile": profile_id()}


@router.get("/menu/{key}", summary="Read a fixed, public application menu")
async def menu_speech(key: str, language: Literal["id", "en"] = "id") -> Response:
    if key not in MENU_AUDIO:
        raise HTTPException(404, "Menu audio not found.")
    try:
        audio = await synthesise_bytes(MENU_AUDIO[key][language == "en"],
                                       language=language, scope="public-menu")
    except SpeechBudgetExceededError as exc:
        raise HTTPException(429, "Suara sedang penuh. Gunakan suara perangkat atau coba nanti.") from exc
    except Exception as exc:
        raise _provider_error(exc, operation="sintesis") from exc
    return Response(audio, media_type="audio/mpeg",
                    headers={"Cache-Control": "public, max-age=86400",
                             "X-Speech-Profile": profile_id()})


@router.post("/tts", summary="Synthesize text for an active signed-in account")
async def text_to_speech(
    body: VoiceTTSRequest,
    user: User = Depends(current_user),
) -> Response:
    """Return audio bytes for an explicit, user-triggered listen action."""
    try:
        audio = await synthesise_bytes(body.text, language=body.language or user.preferred_language,
                                       scope="user:" + str(user.id))
    except SpeechBudgetExceededError as exc:
        raise HTTPException(429, "Batas suara hari ini tercapai. Gunakan suara perangkat.") from exc
    except (elevenlabs.ElevenLabsConfigurationError, elevenlabs.ElevenLabsError) as exc:
        raise _provider_error(exc, operation="sintesis") from exc
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    except Exception as exc:  # pragma: no cover - backend-specific SDK errors
        log.exception("TTS failed")
        raise _provider_error(exc, operation="sintesis") from exc

    media_type = "audio/mpeg" if settings.TTS_BACKEND == "elevenlabs" else "audio/wav"
    return Response(
        content=audio,
        media_type=media_type,
        headers={"Cache-Control": "no-store", "X-Voice-Backend": settings.TTS_BACKEND},
    )


@router.post("/stt", response_model=VoiceSTTResponse, summary="Transcribe a student audio answer")
async def speech_to_text(
    audio: UploadFile = File(...),
    student: User = Depends(require_student),
) -> VoiceSTTResponse:
    """Transcribe one bounded upload; callers still review text before submit."""
    if not audio.content_type or not audio.content_type.startswith("audio/"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File audio diperlukan.")

    content = await audio.read(settings.MAX_UPLOAD_BYTES + 1)
    if len(content) > settings.MAX_UPLOAD_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "File audio terlalu besar.")
    if not content:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File audio kosong.")

    try:
        if settings.STT_BACKEND == "elevenlabs":
            result = await elevenlabs.transcribe(
                content,
                filename=audio.filename or "answer.webm",
                content_type=audio.content_type,
                language=student.preferred_language,
            )
        else:
            suffix = Path(audio.filename or "answer.wav").suffix or ".wav"
            with NamedTemporaryFile(suffix=suffix, delete=True) as temp:
                temp.write(content)
                temp.flush()
                text = await transcribe_path(temp.name, language=student.preferred_language)
            result = {"text": text, "language_code": settings.STT_LANGUAGE}
    except (elevenlabs.ElevenLabsConfigurationError, elevenlabs.ElevenLabsError) as exc:
        raise _provider_error(exc, operation="transkripsi") from exc
    except Exception as exc:  # pragma: no cover - backend-specific SDK errors
        log.exception("STT failed")
        raise _provider_error(exc, operation="transkripsi") from exc

    return VoiceSTTResponse(
        text=str(result.get("text") or ""),
        language_code=str(result.get("language_code") or settings.STT_LANGUAGE),
    )


@router.post("/chat", summary="Single-turn voice chat")
async def voice_chat(
    request: Request,
    audio: UploadFile = File(...),
    session_id: UUID | None = Form(None),
    class_id: UUID | None = Form(None),
    material_id: UUID | None = Form(None),
    student: User = Depends(require_student),
    session: AsyncSession = Depends(db_session),
):
    """Transcribe, run one graph turn, and return text for an accessible client.

    Audio playback is intentionally a separate ``/tts`` request. This keeps
    the response small and lets the UI provide pause/stop controls without
    embedding a filesystem path in a JSON response.
    """
    if not audio.content_type or not audio.content_type.startswith("audio/"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File audio diperlukan.")

    # Check scope before paying for transcription; prepare_chat_turn rechecks
    # it immediately before graph execution as well.
    await resolve_chat_context(
        session,
        student=student,
        session_id=session_id,
        class_id=class_id,
        material_id=material_id,
    )
    audio_path = await save_upload(audio)
    try:
        transcript = await transcribe_path(audio_path, language=student.preferred_language)
        sid, state, context = await prepare_chat_turn(
            session,
            student=student,
            text=transcript,
            session_id=session_id,
            class_id=class_id,
            material_id=material_id,
        )
        state["transcribed_text"] = transcript
        graph = request.app.state.graph
        final_state = await graph.ainvoke(state, config={"configurable": {"thread_id": str(sid)}})
    except (elevenlabs.ElevenLabsConfigurationError, elevenlabs.ElevenLabsError) as exc:
        raise _provider_error(exc, operation="voice chat") from exc
    finally:
        Path(audio_path).unlink(missing_ok=True)

    answer = reply_text(final_state)
    await log_turn(sid, role="student", text=transcript, intent=final_state.get("intent"))
    await log_turn(
        sid,
        role="assistant",
        text=answer,
        intent=final_state.get("intent"),
        source_refs=sources(final_state),
    )
    await update_session_mode(sid, final_state.get("intent"))
    log.info(
        "Voice chat turn complete (session=%s, last_node=%s)", sid, final_state.get("last_node")
    )
    return {
        "session_id": sid,
        "transcript": transcript,
        "intent": final_state.get("intent"),
        "response_text": answer,
        "audio_available": bool(final_state.get("audio_response_path")),
        "next_action": final_state.get("next_action"),
        "context": context,
        "sources": sources(final_state),
    }


@router.post("/text", summary="Text-in / text-out fallback for voice clients")
async def voice_text(
    request: Request,
    text: str = Form(..., min_length=1, max_length=5_000),
    session_id: UUID | None = Form(None),
    class_id: UUID | None = Form(None),
    material_id: UUID | None = Form(None),
    student: User = Depends(require_student),
    session: AsyncSession = Depends(db_session),
):
    sid, state, context = await prepare_chat_turn(
        session,
        student=student,
        text=text,
        session_id=session_id,
        class_id=class_id,
        material_id=material_id,
    )
    state["transcribed_text"] = text
    graph = request.app.state.graph
    final_state = await graph.ainvoke(state, config={"configurable": {"thread_id": str(sid)}})
    answer = reply_text(final_state)
    await log_turn(sid, role="student", text=text, intent=final_state.get("intent"))
    await log_turn(
        sid,
        role="assistant",
        text=answer,
        intent=final_state.get("intent"),
        source_refs=sources(final_state),
    )
    await update_session_mode(sid, final_state.get("intent"))
    return {
        "session_id": sid,
        "response_text": answer,
        "audio_available": bool(final_state.get("audio_response_path")),
        "context": context,
        "sources": sources(final_state),
    }
