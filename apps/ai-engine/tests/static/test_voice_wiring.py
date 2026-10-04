"""Stage 0 checks for the authenticated ElevenLabs voice surface."""

from __future__ import annotations

import ast
from pathlib import Path

import pytest

pytestmark = pytest.mark.static
ROOT = Path(__file__).resolve().parents[2]


def _source(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_voice_router_exposes_authenticated_batch_endpoints() -> None:
    tree = ast.parse(_source("api/routes/voice.py"))
    paths = {
        decorator.args[0].value
        for node in ast.walk(tree)
        if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef)
        for decorator in node.decorator_list
        if isinstance(decorator, ast.Call)
        and isinstance(decorator.func, ast.Attribute)
        and decorator.func.attr == "post"
        and decorator.args
        and isinstance(decorator.args[0], ast.Constant)
    }
    assert {"/tts", "/stt", "/chat", "/text"} <= paths
    source = _source("api/routes/voice.py")
    assert "Depends(require_student)" in source
    assert "ELEVENLABS_API_KEY" not in source


def test_voice_routers_are_mounted_for_rest_and_websocket() -> None:
    source = _source("api/main.py")
    assert 'app.include_router(voice.router, prefix="/voice"' in source
    assert 'app.include_router(voice_stream.router, prefix="/ws"' in source


def test_voice_provider_errors_are_safe_and_text_fallback_is_documented() -> None:
    source = _source("api/routes/voice.py")
    assert "ElevenLabsConfigurationError" in source
    assert "status.HTTP_503_SERVICE_UNAVAILABLE" in source
    provider_helper = source.split("def _provider_error", 1)[1].split("@router", 1)[0]
    assert "str(exc)" not in provider_helper
    assert "response.text" not in provider_helper

    controls = (
        Path(__file__).resolve().parents[4]
        / "apps"
        / "web"
        / "src"
        / "components"
        / "voice-controls.tsx"
    ).read_text(encoding="utf-8")
    assert "Gunakan kolom jawaban teks." in controls
