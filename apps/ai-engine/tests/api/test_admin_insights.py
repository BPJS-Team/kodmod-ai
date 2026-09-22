from __future__ import annotations

import pytest

pytestmark = pytest.mark.api


async def test_admin_can_read_overview_and_provider_status(client, admin_factory, auth_headers):
    _admin, token = await admin_factory()
    response = await client.get("/admin/insights/overview", headers=auth_headers(token))

    assert response.status_code == 200
    body = response.json()
    assert "users" in body
    assert isinstance(body["providers"]["elevenlabs"]["configured"], bool)
    assert "ELEVENLABS_API_KEY" not in response.text


async def test_admin_activity_rejects_unbounded_limit(client, admin_factory, auth_headers):
    _admin, token = await admin_factory()
    response = await client.get("/admin/activity?limit=101", headers=auth_headers(token))

    assert response.status_code == 422


async def test_student_cannot_read_admin_insights(client, student_factory, auth_headers):
    _student, token = await student_factory()
    response = await client.get("/admin/insights/overview", headers=auth_headers(token))

    assert response.status_code == 403
