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
