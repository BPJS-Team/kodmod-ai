"""Isolated HTTP checks for open registration and scoped voice access."""
import pytest

pytest_plugins = ["tests.editorial_test"]


@pytest.mark.parametrize("role", ["student", "teacher"])
async def test_registration_without_invitation(editorial_http, role):
    client, _, _, _, _, _ = editorial_http
    payload = dict(username=f"signup-{role}", full_name="Akun pengujian", role=role,
                   password="registration-test-123", preferred_language="en")
    response = await client.post("/auth/register", json=payload)
    assert response.status_code == 201, response.text
    account = response.json()
    assert account["user"]["role"] == role
    assert account["user"]["preferred_language"] == "en"
    assert "password_hash" not in response.text
    assert (await client.post("/auth/register", json=payload)).status_code == 409
    assert (await client.post("/auth/login", json={"username": payload["username"],
                                                 "password": "wrong-password"})).status_code == 401


@pytest.mark.parametrize("changes", [{"role": "admin"}, {"password": "short"},
                                    {"username": "bad name"}])
async def test_registration_keeps_validation(editorial_http, changes):
    client, _, _, _, _, _ = editorial_http
    payload = dict(username="signup-valid", full_name="Test", role="student",
                   password="registration-test-123") | changes
    assert (await client.post("/auth/register", json=payload)).status_code == 422


@pytest.mark.parametrize("actor", ["student", "owner", "admin"])
async def test_active_accounts_can_read_text(editorial_http, monkeypatch, actor):
    from api.routes import voice
    client, _, _, _, _, headers = editorial_http
    requests = []

    async def audio(text, **kwargs):
        requests.append((text, kwargs))
        return b"ID3-test-audio"

    monkeypatch.setattr(voice, "synthesise_bytes", audio)
    response = await client.post("/voice/tts", json={"text": "Test", "language": "en"},
                                 headers=headers(actor))
    assert response.status_code == 200, response.text
    assert response.content == b"ID3-test-audio"
    assert response.headers["cache-control"] == "no-store"
    assert requests[0][1]["language"] == "en"
    assert requests[0][1]["scope"].startswith("user:")
    assert (await client.post("/voice/tts", json={"text": "Test"})).status_code == 401


async def test_public_voice_only_accepts_menu_catalog(editorial_http, monkeypatch):
    from api.routes import voice
    client, _, _, _, _, _ = editorial_http

    async def audio(text, **kwargs):
        assert kwargs["scope"] == "public-menu"
        return b"ID3-preview"

    monkeypatch.setattr(voice, "synthesise_bytes", audio)
    response = await client.get("/voice/menu/welcome?language=id")
    assert response.status_code == 200, response.text
    assert response.content == b"ID3-preview"
    assert (await client.get("/voice/menu/free-text?language=id")).status_code == 404
    assert (await client.get("/voice/menu/welcome?language=xx")).status_code == 422


@pytest.mark.parametrize("language,expected", [
    ("id", "Bahasa telah berubah ke Bahasa Indonesia."),
    ("en", "Language changed to English."),
])
async def test_language_confirmation_is_shared_across_accounts(editorial_http, monkeypatch, language, expected):
    from api.routes import voice
    client, _, _, _, _, headers = editorial_http
    requests = []

    async def audio(text, **kwargs):
        requests.append((text, kwargs))
        return b"ID3-language"

    monkeypatch.setattr(voice, "synthesise_bytes", audio)
    for actor in [None, "student", "owner"]:
        response = await client.get(f"/voice/menu/language-changed?language={language}",
                                    headers=headers(actor) if actor else {})
        assert response.status_code == 200, response.text
        assert "public" in response.headers["cache-control"]
    assert all(text == expected and context["language"] == language
               and context["scope"] == "public-menu" for text, context in requests)
