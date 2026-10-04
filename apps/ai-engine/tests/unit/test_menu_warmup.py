import pytest

from scripts import warm_menu_audio

pytestmark = pytest.mark.unit


async def test_warmup_uses_only_shared_catalog_and_deduplicates_keys(monkeypatch):
    requests = []

    async def audio(text, **kwargs):
        requests.append((text, kwargs))
        return b"ID3-audio"

    monkeypatch.setattr(warm_menu_audio, "synthesise_bytes", audio)
    result = await warm_menu_audio.warm(["id", "en", "en"], ["home", "language-changed", "home"])
    assert result["prepared"] == 4 and result["failed"] == []
    assert all(kwargs["scope"] == "public-menu" for _, kwargs in requests)
    assert requests[-1][0] == "Language changed to English."
    with pytest.raises(ValueError):
        await warm_menu_audio.warm(["en"], ["arbitrary-user-text"])
    assert len(requests) == 4


async def test_warmup_keeps_successful_items_and_reports_failures_without_provider_details(monkeypatch):
    async def audio(text, **kwargs):
        if text == "Home":
            raise RuntimeError("sensitive-provider-detail")
        return b"ID3-audio"

    monkeypatch.setattr(warm_menu_audio, "synthesise_bytes", audio)
    result = await warm_menu_audio.warm(["en"], ["home", "login"])
    assert result["prepared"] == 1
    assert result["failed"] == [{"key": "home", "language": "en"}]
    assert "sensitive" not in str(result)
