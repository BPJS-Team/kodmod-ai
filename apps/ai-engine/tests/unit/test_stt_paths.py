"""Downloaded audio is awaited and its private temporary file is always removed."""

from pathlib import Path

import pytest

from voice import streaming, stt

pytestmark = pytest.mark.unit


@pytest.mark.parametrize("fail", [False, True])
async def test_remote_transcription_removes_the_download_even_when_provider_fails(
    monkeypatch, fail
):
    files = []

    async def download(uri):
        assert uri == "https://fixture.invalid/clip.wav"
        return b"fixture-audio"

    async def recognize(path, *, language=None):
        audio = Path(path)
        files.append(audio)
        assert audio.read_bytes() == b"fixture-audio" and language == "en"
        if fail:
            raise RuntimeError("provider unavailable")
        return "Answer", "en"

    monkeypatch.setattr(streaming, "fetch_audio", download)
    monkeypatch.setattr(stt.settings, "STT_BACKEND", "elevenlabs")
    monkeypatch.setattr(stt, "_elevenlabs_stt", recognize)
    if fail:
        with pytest.raises(RuntimeError, match="provider unavailable"):
            await stt.transcribe_path("https://fixture.invalid/clip.wav", language="en")
    else:
        assert (
            await stt.transcribe_path("https://fixture.invalid/clip.wav", language="en") == "Answer"
        )
    assert len(files) == 1 and not files[0].exists()
