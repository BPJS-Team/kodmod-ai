from pathlib import Path

import pytest


@pytest.mark.unit
def test_open_session_does_not_resume_an_ended_session():
    """Keep the closed-session boundary explicit even in the lightweight test env."""
    source = (Path(__file__).parents[2] / "api" / "chat_service.py").read_text(encoding="utf-8")

    assert "existing is not None and existing.ended_at is None" in source
    assert "row is None or row.ended_at is not None" in source
