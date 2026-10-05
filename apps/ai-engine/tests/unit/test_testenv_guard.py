"""Test launchers must refuse application database names before seeding."""

import pytest

from scripts._testenv import TEST_ENV, apply_test_env

pytestmark = pytest.mark.unit


def test_test_defaults_are_separate_from_main_database():
    assert TEST_ENV["DB_PORT"] == "5434"
    assert TEST_ENV["DB_NAME"].startswith("kodmod_test")
    assert TEST_ENV["ELEVENLABS_API_KEY"] == ""


def test_test_launcher_refuses_application_database(monkeypatch):
    monkeypatch.setenv("DB_NAME", "kodmod")
    with pytest.raises(RuntimeError, match="refusing application data"):
        apply_test_env()
