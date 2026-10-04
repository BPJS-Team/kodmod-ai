"""Persistent, bounded speech files. OS locks work across workers and releases on crash."""
from __future__ import annotations

import asyncio
import hashlib
import json
import os
import time
from collections.abc import Awaitable, Callable
from pathlib import Path
from uuid import uuid4

from filelock import FileLock, Timeout

from config.settings import settings

PROFILE_VERSION = "bian-v2-2026-10"


class SpeechBudgetExceededError(RuntimeError):
    pass


def speech_profile(voice: str | None = None) -> dict:
    return {
        "version": PROFILE_VERSION,
        "provider": settings.TTS_BACKEND,
        "voice": voice or settings.ELEVENLABS_TTS_VOICE_ID,
        "model": settings.ELEVENLABS_TTS_MODEL,
        "format": settings.ELEVENLABS_TTS_OUTPUT_FORMAT,
        "stability": settings.ELEVENLABS_TTS_STABILITY,
        "similarity": settings.ELEVENLABS_TTS_SIMILARITY_BOOST,
        "style": settings.ELEVENLABS_TTS_STYLE,
        "speed": settings.ELEVENLABS_TTS_SPEED,
        "speaker_boost": settings.ELEVENLABS_TTS_SPEAKER_BOOST,
    }


def digest(value: dict) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()


def profile_id() -> str:
    return digest(speech_profile())[:24]


async def acquire(lock: FileLock) -> None:
    deadline = time.monotonic() + settings.ELEVENLABS_TIMEOUT_SECONDS + 15
    while True:
        try:
            # A nonblocking acquire avoids an abandoned executor thread taking
            # a lock after the request was cancelled.
            lock.acquire(timeout=0)
            return
        except Timeout:
            if time.monotonic() >= deadline:
                raise TimeoutError("Speech is still being prepared. Try again.") from None
            await asyncio.sleep(0.05)


def read_fresh(path: Path) -> bytes | None:
    try:
        if time.time() - path.stat().st_mtime >= settings.SPEECH_CACHE_TTL_DAYS * 86400:
            return None
        content = path.read_bytes()
        return content or None
    except FileNotFoundError:
        return None


def atomic_write(path: Path, content: bytes) -> None:
    temporary = path.with_name(f".{path.name}.{uuid4().hex}.tmp")
    try:
        with temporary.open("xb") as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


async def reserve_budget(root: Path, scope: str, characters: int) -> None:
    """Count cache misses only. Public callers share a fixed daily cost ceiling."""
    name = hashlib.sha256(scope.encode()).hexdigest()
    path = root / f"budget-{name}.json"
    lock = FileLock(str(root / f"budget-lock-{name[:2]}.lock"), thread_local=False)
    await acquire(lock)
    try:
        day = int(time.time() // 86400)
        try:
            budget = json.loads(path.read_text())
        except (FileNotFoundError, ValueError):
            budget = {}
        spent = budget.get("characters", 0) if budget.get("day") == day else 0
        cap = (settings.PUBLIC_SPEECH_DAILY_CHARACTERS if scope == "public-menu"
               else settings.PRIVATE_SPEECH_DAILY_CHARACTERS)
        if spent + characters > cap:
            raise SpeechBudgetExceededError("Daily speech limit reached. Use device speech or try later.")
        atomic_write(path, json.dumps({"day": day, "characters": spent + characters}).encode())
    finally:
        lock.release()


def prune(root: Path) -> None:
    """Delete expired/oldest completed audio; never remove an actively locked entry."""
    lock = FileLock(str(root / "cleanup.lock"), thread_local=False)
    try:
        lock.acquire(timeout=0)
    except Timeout:
        return
    try:
        files = []
        for path in root.glob("*.mp3"):
            try:
                info = path.stat()
                files.append((info.st_mtime, info.st_size, path))
            except FileNotFoundError:
                continue
        total = sum(size for _, size, _ in files)
        limit = settings.SPEECH_CACHE_MAX_MB * 1024 * 1024
        cutoff = time.time() - settings.SPEECH_CACHE_TTL_DAYS * 86400
        for modified, size, path in sorted(files):
            if modified > cutoff and total <= limit:
                continue
            entry = FileLock(str(root / f"entry-{path.stem[:2]}.lock"), thread_local=False)
            try:
                entry.acquire(timeout=0)
            except Timeout:
                continue
            try:
                path.unlink(missing_ok=True)
                total -= size
            except OSError:
                continue
            finally:
                entry.release()
        # Budget metadata is bounded by recent active accounts, not requests.
        for path in root.glob("budget-*.json"):
            try:
                if path.stat().st_mtime < cutoff:
                    entry = FileLock(str(root / f"budget-lock-{path.stem[7:9]}.lock"), thread_local=False)
                    with entry.acquire(timeout=0):
                        path.unlink(missing_ok=True)
            except (OSError, Timeout):
                continue
    finally:
        lock.release()


async def cached_audio(
    root: Path, text: str, *, language: str, scope: str, voice: str,
    generate: Callable[[], Awaitable[bytes]],
) -> tuple[bytes, Path]:
    started = time.monotonic()
    root.mkdir(parents=True, exist_ok=True)
    key = digest({"text": text, "language": language, "scope": scope,
                  "profile": speech_profile(voice)})
    path = root / f"{key}.mp3"
    lock = FileLock(str(root / f"entry-{key[:2]}.lock"), thread_local=False)
    await acquire(lock)
    try:
        audio = await asyncio.to_thread(read_fresh, path)
        if audio is None:
            await reserve_budget(root, scope, len(text))
            audio = await generate()
            if not audio:
                raise ValueError("Speech service returned empty audio.")
            if len(audio) > min(settings.SPEECH_CACHE_MAX_MB * 1024 * 1024, 16 * 1024 * 1024):
                raise ValueError("Speech audio exceeds storage limit.")
            await asyncio.to_thread(atomic_write, path, audio)
        else:
            from tools.provider_usage import record_usage
            await record_usage(provider="elevenlabs", service="tts", model=settings.ELEVENLABS_TTS_MODEL,
                status="cache_hit", latency_ms=(time.monotonic() - started) * 1000, characters=len(text), audio_bytes=len(audio))
        await asyncio.to_thread(prune, root)
        return audio, path
    finally:
        lock.release()
