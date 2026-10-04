"""Guided lesson row locks and migration proof in disposable test schemas."""

import asyncio
import os
import uuid
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, func, inspect, select, text

from api import learning_service
from database.models import LearningActionReceipt, LearningSession
from tests.unit.test_guided_learning import action_body, open_lesson
from tests.unit.test_guided_learning import learning_http as learning_http

pytestmark = pytest.mark.skipif(
    os.getenv("KODMOD_GUIDED_POSTGRES") != "1", reason="Dedicated PostgreSQL test DB required"
)


def test_guided_migration_upgrade_downgrade_preserves_existing_lessons():
    url = "postgresql+psycopg://kodmod:kodmod@127.0.0.1:5434/kodmod_test"
    schema = "guided_migration_" + uuid.uuid4().hex
    engine = create_engine(url)
    try:
        with engine.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        with engine.begin() as connection:
            connection.execute(text(f'SET LOCAL search_path TO "{schema}", public'))
            config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
            config.attributes["connection"] = connection
            command.upgrade(config, "0006_editorial_quizzes")
            assert "guided_state" not in {c["name"] for c in inspect(connection).get_columns("learning_sessions", schema=schema)}
            command.upgrade(config, "0007_guided_learning")
            assert "guided_state" in {c["name"] for c in inspect(connection).get_columns("learning_sessions", schema=schema)}
            assert "learning_action_receipts" in inspect(connection).get_table_names(schema=schema)
            command.downgrade(config, "0006_editorial_quizzes")
            assert "learning_action_receipts" not in inspect(connection).get_table_names(schema=schema)
            command.upgrade(config, "0007_guided_learning")
            assert connection.scalar(text(f'SELECT version_num FROM "{schema}".alembic_version')) == "0007_guided_learning"
            command.upgrade(config, "head")
            assert "audit_events" in inspect(connection).get_table_names(schema=schema)
            assert connection.scalar(text(f'SELECT version_num FROM "{schema}".alembic_version')) == "0008_audit_events"
    finally:
        with engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))
        engine.dispose()


async def overlapping_teaching(monkeypatch, first, second):
    entered, release = asyncio.Event(), asyncio.Event()
    original, calls = learning_service.teach, 0

    async def held(*args, **kwargs):
        nonlocal calls
        calls += 1
        if calls == 1:
            entered.set()
            await asyncio.wait_for(release.wait(), 10)
        return await original(*args, **kwargs)

    monkeypatch.setattr(learning_service, "teach", held)
    one = asyncio.create_task(first())
    await asyncio.wait_for(entered.wait(), 10)
    two = asyncio.create_task(second())
    try:
        await asyncio.sleep(0.12)
        assert not two.done(), "Second operation must wait for the canonical PostgreSQL row"
    finally:
        release.set()
    return await asyncio.gather(one, two)


async def test_concurrent_start_teaches_once_and_returns_same_session(learning_http, monkeypatch):
    client, factory, _, material, _, _ = learning_http

    async def start():
        return await open_lesson(client, material)

    one, two = await overlapping_teaching(monkeypatch, start, start)
    assert one == two
    async with factory() as session:
        assert await session.scalar(select(func.count()).select_from(LearningSession)) == 1


@pytest.mark.parametrize("same_request", [True, False])
async def test_concurrent_continue_advances_one_unit(learning_http, monkeypatch, same_request):
    client, factory, _, material, _, _ = learning_http
    state = await open_lesson(client, material)
    path = f"/learning/sessions/{state['session_id']}/actions"
    body = action_body(state, "continue")

    async def first():
        return await client.post(path, json=body)

    async def second():
        payload = body if same_request else {**body, "request_id": str(uuid.uuid4())}
        return await client.post(path, json=payload)

    one, two = await overlapping_teaching(monkeypatch, first, second)
    assert one.status_code == 200 and two.status_code == (200 if same_request else 409)
    if same_request:
        assert one.json() == two.json()
    async with factory() as session:
        lesson = await session.get(LearningSession, uuid.UUID(state["session_id"]))
        assert lesson.guided_state["unit_index"] == lesson.guided_state["revision"] == 1
        assert await session.scalar(select(func.count()).select_from(LearningActionReceipt)) == 1
