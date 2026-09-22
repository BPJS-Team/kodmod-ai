"""Stage 0 - Static: configuration has exactly one entry point.

`config/settings.py` is documented as the only place that reads the
environment. That claim was false for a long time: `tools/llm_client.py`,
`rag/embeddings.py`, `voice/*` and others read a parallel `KODMOD_*` env
surface with *different defaults*, so setting a value in `.env` quietly did
nothing. This test makes the claim enforceable rather than aspirational.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

pytestmark = pytest.mark.static

ROOT = Path(__file__).resolve().parents[2]

# Packages that make up the application itself.
APP_PACKAGES = (
    "agents",
    "accessibility",
    "analytics",
    "api",
    "database",
    "graphs",
    "memory",
    "models",
    "prompts",
    "rag",
    "tools",
)

# config/ owns the environment. scripts/ legitimately pins env *before*
# settings is imported (scripts/_testenv.py), which is the whole point of it.
ALLOWED = {
    Path("config/settings.py"),
}

_ENV_READ = re.compile(r"os\.(getenv|environ)\b")


def _iter_app_files():
    for package in APP_PACKAGES:
        yield from sorted((ROOT / package).rglob("*.py"))


def test_km_static_no_stray_env_reads() -> None:
    offenders: list[str] = []
    for path in _iter_app_files():
        rel = path.relative_to(ROOT)
        if rel in ALLOWED or "__pycache__" in rel.parts:
            continue
        for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if _ENV_READ.search(line):
                offenders.append(f"{rel}:{lineno}: {line.strip()}")
    assert not offenders, (
        "these modules read the environment directly instead of importing "
        "`settings`, which is how config silently stops working:\n  " + "\n  ".join(offenders)
    )


def test_km_static_settings_has_active_voice_provider_knobs() -> None:
    """Voice providers are configured centrally and are backed by adapters."""
    source = (ROOT / "config" / "settings.py").read_text(encoding="utf-8")
    for active in (
        "STT_BACKEND",
        "TTS_BACKEND",
        "DEEPGRAM_API_KEY",
        "ELEVENLABS_API_KEY",
        "ELEVENLABS_TTS_MODEL",
        "ELEVENLABS_STT_MODEL",
    ):
        assert active in source, f"{active} must be declared in the settings entry point"
    for removed in ("OLLAMA_BASE_URL", "VLLM_BASE_URL"):
        assert removed not in source, f"{removed} is still declared but unusable"
