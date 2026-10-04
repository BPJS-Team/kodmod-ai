"""Mock only the paid provider; exercise actual files and concurrent callers."""
import asyncio
import sys

from config.settings import settings
from voice import tts


async def test_repeated_and_concurrent_speech_reuses_persistent_audio(tmp_path, monkeypatch):
    monkeypatch.setattr(tts, "OUTPUT_DIR", tmp_path)
    monkeypatch.setattr(settings, "TTS_BACKEND", "elevenlabs")
    calls = []

    async def provider(text, **kwargs):
        calls.append(text)
        await asyncio.sleep(0.03)
        return b"ID3-audio"

    monkeypatch.setattr(tts.elevenlabs, "synthesise", provider)
    audio = await asyncio.gather(*(tts.synthesise_bytes("Halo dunia.") for _ in range(5)))
    assert audio == [b"ID3-audio"] * 5
    assert await tts.synthesise_bytes("Halo dunia.") == b"ID3-audio"
    assert len(calls) == 1
    assert list(tmp_path.rglob("*.mp3"))


async def test_cache_separates_language_profile_and_private_scope(tmp_path, monkeypatch):
    monkeypatch.setattr(tts, "OUTPUT_DIR", tmp_path)
    monkeypatch.setattr(settings, "TTS_BACKEND", "elevenlabs")
    calls = []

    async def provider(text, **kwargs):
        calls.append(text)
        return f"audio-{len(calls)}".encode()

    monkeypatch.setattr(tts.elevenlabs, "synthesise", provider)
    one = await tts.synthesise_bytes("Test", language="id", scope="student-a")
    assert await tts.synthesise_bytes("Test", language="id", scope="student-a") == one
    assert await tts.synthesise_bytes("Test", language="en", scope="student-a") != one
    assert await tts.synthesise_bytes("Test", language="id", scope="student-b") != one
    monkeypatch.setattr(settings, "ELEVENLABS_TTS_SPEED", 0.9)
    assert await tts.synthesise_bytes("Test", language="id", scope="student-a") != one
    assert len(calls) == 4


async def test_workers_share_cache_and_restart_reuses_it(tmp_path):
    # Each child has its own event loop and module state. Only files are shared.
    script = '''
import asyncio, sys
from pathlib import Path
from config.settings import settings
from voice import tts
tts.OUTPUT_DIR = Path(sys.argv[1])
settings.TTS_BACKEND = "elevenlabs"
async def fake(text, **kwargs):
    with (tts.OUTPUT_DIR / "provider-count").open("a") as output:
        output.write("call\\n")
    await asyncio.sleep(0.1)
    return b"ID3-worker-audio"
tts.elevenlabs.synthesise = fake
print(asyncio.run(tts.synthesise_bytes("Worker test" )).decode())
'''

    async def worker():
        process = await asyncio.create_subprocess_exec(sys.executable, "-c", script, str(tmp_path),
                                                      stdout=asyncio.subprocess.PIPE,
                                                      stderr=asyncio.subprocess.PIPE)
        out, err = await process.communicate()
        assert process.returncode == 0, err.decode()
        assert out.strip() == b"ID3-worker-audio"

    await asyncio.gather(*(worker() for _ in range(4)))
    await worker()
    assert (tmp_path / "provider-count").read_text().splitlines() == ["call"]
