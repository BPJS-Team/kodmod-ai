from __future__ import annotations

import asyncio
from types import SimpleNamespace
from typing import ClassVar
from unittest.mock import patch

import pytest

from voice import elevenlabs


class _Response:
    def __init__(self, status_code: int = 200, *, content: bytes = b"audio", json_data=None):
        self.status_code = status_code
        self.content = content
        self._json_data = json_data or {}
        self.headers = {"request-id": "req-test"}

    def json(self):
        return self._json_data


class _Client:
    response: ClassVar[_Response] = _Response(content=b"mp3-bytes")
    calls: ClassVar[list[dict]] = []

    def __init__(self, *args, **kwargs):
        self.calls = self.__class__.calls

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return None

    async def post(self, url, **kwargs):
        self.calls.append({"url": url, **kwargs})
        return self.response


class _StreamResponse(_Response):
    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return None

    async def aiter_bytes(self, *, chunk_size):
        del chunk_size
        yield b"chunk-one"
        yield b"chunk-two"


class _StreamingClient(_Client):
    response: ClassVar[_StreamResponse] = _StreamResponse()

    def stream(self, method, url, **kwargs):
        self.calls.append({"method": method, "url": url, **kwargs})
        return self.response


@pytest.fixture
def configured_settings(monkeypatch):
    monkeypatch.setattr(
        elevenlabs,
        "settings",
        SimpleNamespace(
            ELEVENLABS_API_KEY="test-eleven-key",
            ELEVENLABS_TTS_MODEL="eleven_multilingual_v2",
            ELEVENLABS_TTS_OUTPUT_FORMAT="mp3_44100_128",
            ELEVENLABS_TTS_VOICE_ID="voice-id",
            ELEVENLABS_TTS_STABILITY=0.5,
            ELEVENLABS_TTS_SIMILARITY_BOOST=0.75,
            ELEVENLABS_TTS_STYLE=0.0,
            ELEVENLABS_TTS_SPEAKER_BOOST=True,
            ELEVENLABS_STT_MODEL="scribe_v2",
            ELEVENLABS_STT_NO_VERBATIM=True,
            ELEVENLABS_TIMEOUT_SECONDS=30.0,
        ),
    )


def test_synthesise_uses_official_stream_request(configured_settings):
    _Client.calls.clear()
    with patch.object(elevenlabs.httpx, "AsyncClient", _Client):
        audio = asyncio.run(elevenlabs.synthesise("Halo <break time=\"1s\"/> dunia"))

    assert audio == b"mp3-bytes"
    call = _Client.calls[-1]
    assert call["url"].endswith("/v1/text-to-speech/voice-id/stream")
    assert call["headers"]["xi-api-key"] == "test-eleven-key"
    assert call["params"] == {"output_format": "mp3_44100_128"}
    assert call["json"]["text"] == "Halo <break time=\"1s\"/> dunia"
    assert call["json"]["model_id"] == "eleven_multilingual_v2"


def test_transcribe_sends_scribe_multipart(configured_settings):
    _Client.response = _Response(json_data={"text": "jawaban siswa", "language_code": "id"})
    _Client.calls.clear()
    with patch.object(elevenlabs.httpx, "AsyncClient", _Client):
        result = asyncio.run(
            elevenlabs.transcribe(
                b"webm-audio", filename="answer.webm", content_type="audio/webm", language="id"
            )
        )

    assert result == {"text": "jawaban siswa", "language_code": "id"}
    call = _Client.calls[-1]
    assert call["url"].endswith("/v1/speech-to-text")
    assert call["data"] == {
        "model_id": "scribe_v2",
        "language_code": "id",
        "no_verbatim": "true",
    }
    assert call["files"]["file"][:2] == ("answer.webm", b"webm-audio")


def test_stream_speech_yields_provider_chunks(configured_settings):
    _StreamingClient.calls.clear()
    with patch.object(elevenlabs.httpx, "AsyncClient", _StreamingClient):
        chunks = asyncio.run(_collect(elevenlabs.stream_speech("halo")))

    assert chunks == [b"chunk-one", b"chunk-two"]
    assert _StreamingClient.calls[-1]["method"] == "POST"


async def _collect(iterator):
    return [chunk async for chunk in iterator]


def test_missing_key_fails_before_network(monkeypatch):
    monkeypatch.setattr(elevenlabs, "settings", SimpleNamespace(ELEVENLABS_API_KEY=None))
    with pytest.raises(elevenlabs.ElevenLabsConfigurationError, match="not configured"):
        asyncio.run(elevenlabs.synthesise("hello"))


def test_provider_error_does_not_expose_response_body(configured_settings):
    _Client.response = _Response(status_code=401, content=b"secret provider details")
    _Client.calls.clear()
    with patch.object(elevenlabs.httpx, "AsyncClient", _Client):
        with pytest.raises(elevenlabs.ElevenLabsError) as caught:
            asyncio.run(elevenlabs.synthesise("hello"))

    assert caught.value.status_code == 401
    assert "secret provider details" not in str(caught.value)
    assert caught.value.request_id == "req-test"
